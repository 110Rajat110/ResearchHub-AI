from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx
import json

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(prefix="/papers", tags=["Papers"])

OPENALEX_BASE = "https://api.openalex.org/works"


async def search_openalex(query: str, per_page: int = 15) -> List[schemas.SearchResult]:
    """Search OpenAlex (free, no API key required)."""
    params = {
        "search": query,
        "per-page": per_page,
        "select": "id,title,authorships,abstract_inverted_index,publication_year,doi,primary_location",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(OPENALEX_BASE, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAlex search failed: {str(e)}")

    results = []
    for work in data.get("results", []):
        # Reconstruct abstract from inverted index
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
        url = ""
        primary = work.get("primary_location") or {}
        url = (primary.get("landing_page_url") or doi or "")

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
