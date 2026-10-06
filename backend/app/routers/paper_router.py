from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(prefix="/papers", tags=["Papers"])

OPENALEX_BASE = "https://api.openalex.org/works"


SEMANTIC_SCHOLAR_BASE = "https://api.semanticscholar.org/graph/v1/paper/search"


async def search_semantic_scholar(query: str, per_page: int = 15) -> List[schemas.SearchResult]:
    """Fallback search using Semantic Scholar API (free, no key required)."""
    params = {
        "query": query,
        "limit": per_page,
        "fields": "title,authors,abstract,year,externalIds,openAccessPdf,url",
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(SEMANTIC_SCHOLAR_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for work in data.get("data", []):
        authors = [a.get("name", "") for a in (work.get("authors") or [])[:5]]
        doi = (work.get("externalIds") or {}).get("DOI", "")
        pdf_info = work.get("openAccessPdf") or {}
        url = pdf_info.get("url") or work.get("url") or (f"https://doi.org/{doi}" if doi else "")
        paper_id = work.get("paperId", "")
        results.append(schemas.SearchResult(
            title=work.get("title") or "Untitled",
            authors=", ".join(authors),
            abstract=(work.get("abstract") or "No abstract available.")[:1000],
            year=work.get("year"),
            doi=doi,
            url=url,
            source="semantic_scholar",
            external_id=f"SS:{paper_id}",
        ))
    return results


async def search_openalex(query: str, per_page: int = 15) -> List[schemas.SearchResult]:
    """Search OpenAlex with retries, falling back to Semantic Scholar on 429."""
    import asyncio
    params = {
        "search": query,
        "per-page": per_page,
        "select": "id,title,authorships,abstract_inverted_index,publication_year,doi,primary_location",
        "mailto": "researchhub.app.render@gmail.com",
    }
    headers = {"User-Agent": "ResearchHub/1.0 (mailto:researchhub.app.render@gmail.com)"}

    last_error = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                resp = await client.get(OPENALEX_BASE, params=params)
                if resp.status_code == 429:
                    wait = 2 ** attempt
                    await asyncio.sleep(wait)
                    last_error = "429 Too Many Requests"
                    continue
                resp.raise_for_status()
                data = resp.json()

            results = []
            for work in data.get("results", []):
                abstract = ""
                inv_idx = work.get("abstract_inverted_index") or {}
                if inv_idx:
                    word_positions = [(pos, word) for word, positions in inv_idx.items() for pos in positions]
                    word_positions.sort()
                    abstract = " ".join(w for _, w in word_positions)

                authors = []
                for auth in (work.get("authorships") or [])[:5]:
                    name = (auth.get("author") or {}).get("display_name", "")
                    if name:
                        authors.append(name)

                doi = work.get("doi") or ""
                primary = work.get("primary_location") or {}
                url = primary.get("landing_page_url") or doi or ""

                results.append(schemas.SearchResult(
                    title=work.get("title") or "Untitled",
                    authors=", ".join(authors),
                    abstract=abstract[:1000] if abstract else "No abstract available.",
                    year=work.get("publication_year"),
                    doi=doi,
                    url=url,
                    source="openalex",
                    external_id=work.get("id", "").replace("https://openalex.org/", ""),
                ))
            return results
        except Exception as e:
            last_error = str(e)
            await asyncio.sleep(2 ** attempt)

    # All OpenAlex attempts failed — fall back to Semantic Scholar
    print(f"[Search] OpenAlex failed after 3 attempts ({last_error}), falling back to Semantic Scholar")
    try:
        return await search_semantic_scholar(query, per_page)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"All search providers failed. Last error: {str(e)}")


@router.get("/search", response_model=List[schemas.SearchResult])
async def search_papers(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(15, ge=1, le=50),
    current_user: models.User = Depends(get_current_user)
):
    return await search_openalex(q, per_page=limit)



@router.post("/import", response_model=schemas.PaperOut, status_code=201)
def import_paper(
    paper_data: schemas.PaperImport,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify workspace ownership
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == paper_data.workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Prevent duplicate imports
    existing = db.query(models.Paper).filter(
        models.Paper.workspace_id == paper_data.workspace_id,
        models.Paper.external_id == paper_data.external_id,
    ).first()
    if existing and paper_data.external_id:
        raise HTTPException(status_code=409, detail="Paper already in workspace")

    paper = models.Paper(
        title=paper_data.title,
        authors=paper_data.authors,
        abstract=paper_data.abstract,
        year=paper_data.year,
        doi=paper_data.doi,
        url=paper_data.url,
        source=paper_data.source or "openalex",
        external_id=paper_data.external_id,
        workspace_id=paper_data.workspace_id,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    
    # Try to process PDF in the background
    background_tasks.add_task(process_paper_pdf_background, paper.id, paper.url)
    
    return paper


@router.get("/workspace/{workspace_id}", response_model=List[schemas.PaperOut])
def list_workspace_papers(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace.papers


@router.delete("/{paper_id}", status_code=204)
def delete_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    paper = db.query(models.Paper).join(models.Workspace).filter(
        models.Paper.id == paper_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    db.delete(paper)
    db.commit()


from ..database import SessionLocal

from ..utils.visual_retriever import process_pdf_pages, get_visual_embeddings

def process_paper_pdf_background(paper_id: int, pdf_url: str):
    if not pdf_url:
        return
    try:
        # Download the PDF
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(pdf_url, follow_redirects=True)
            # Verify it is actually a PDF by headers or at least check status code
            if resp.status_code != 200:
                return
            
            contents = resp.content
        
        # Process PDF and get visual representations
        images = process_pdf_pages(contents)
        if not images:
            return

        embeddings = get_visual_embeddings(images)
        if not embeddings:
            return

        # Save to DB
        db = SessionLocal()
        try:
            # Remove existing visual index for this paper if any
            db.query(models.PaperVisualIndex).filter(models.PaperVisualIndex.paper_id == paper_id).delete()

            for idx, emb in enumerate(embeddings):
                visual_index = models.PaperVisualIndex(
                    paper_id=paper_id,
                    page_number=idx + 1,
                    embedding=json.dumps(emb)
                )
                db.add(visual_index)
            db.commit()
        finally:
            db.close()
            
    except Exception as e:
        print(f"Background PDF processing failed for paper {paper_id}: {e}")
