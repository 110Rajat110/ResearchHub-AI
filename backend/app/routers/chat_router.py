from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import os

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user
from ..utils.research_assistant import get_relevant_papers, build_system_prompt

router = APIRouter(prefix="/chat", tags=["Chat"])


def get_groq_client():
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        return Groq(api_key=api_key)
    except ImportError:
        raise HTTPException(status_code=500, detail="Groq library not installed")


@router.post("/", response_model=schemas.ChatResponse)
def chat(
    req: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate workspace ownership
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == req.workspace_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Get or create conversation
    if req.conversation_id:
        conversation = db.query(models.Conversation).filter(
            models.Conversation.id == req.conversation_id,
            models.Conversation.workspace_id == req.workspace_id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation with title from first message
        title = req.message[:60] + "..." if len(req.message) > 60 else req.message
        conversation = models.Conversation(
            title=title,
            workspace_id=req.workspace_id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Get all papers in workspace for RAG context
    papers = db.query(models.Paper).filter(
        models.Paper.workspace_id == req.workspace_id
    ).all()

    # Find the most relevant papers using embeddings
    relevant_papers = get_relevant_papers(req.message, papers, top_k=5)

    # Hybrid Retrieval (Visual/ColPali)
    from ..utils.visual_retriever import get_visual_query_embedding, compute_visual_similarity
    import json
    
    visual_context = []
    visual_query_emb = get_visual_query_embedding(req.message)
    if visual_query_emb:
        # Get all visual pages for relevant papers
        relevant_paper_ids = [p.id for p in relevant_papers]
        if relevant_paper_ids:
            visual_pages = db.query(models.PaperVisualIndex).filter(
                models.PaperVisualIndex.paper_id.in_(relevant_paper_ids)
            ).all()
            
            scored_pages = []
            for page in visual_pages:
                try:
                    page_emb = json.loads(page.embedding)
                    score = compute_visual_similarity(visual_query_emb, page_emb)
                    scored_pages.append((score, page))
                except Exception:
                    pass
                    
            # Top 3 visual pages
            scored_pages.sort(key=lambda x: x[0], reverse=True)
            top_visual_pages = [p for _, p in scored_pages[:3]]
            
            for vp in top_visual_pages:
                paper_title = next((p.title for p in relevant_papers if p.id == vp.paper_id), "Unknown Paper")
                visual_context.append(f"Source: {paper_title}\nPage: {vp.page_number}\n[Visual content match for this page]")

    # Build system prompt with context
    system_prompt = build_system_prompt(relevant_papers)
    
    if visual_context:
        system_prompt += "\n\nVISUAL/PAGE EVIDENCE:\n"
        system_prompt += "\n\n".join(visual_context)
        system_prompt += "\n\n(Note: The visual evidence indicates which pages contain figures/tables/text relevant to the query. Acknowledge these pages if they seem highly relevant to answering the user.)"

    # Build conversation history (last 10 messages)
    history = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id
    ).order_by(models.Message.created_at).limit(10).all()

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    # Save user message
    user_msg = models.Message(
        role="user",
        content=req.message,
        conversation_id=conversation.id
    )
    db.add(user_msg)
    db.commit()

    # Call Groq
    llm_model = os.getenv("LLM_MODEL", "llama-3.1-70b-versatile")
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=llm_model,
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content
        reply = reply.replace("*", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI inference failed: {str(e)}")

    # Save assistant message
    assistant_msg = models.Message(
        role="assistant",
        content=reply,
        conversation_id=conversation.id
    )
    db.add(assistant_msg)
    db.commit()

    return schemas.ChatResponse(
        conversation_id=conversation.id,
        reply=reply
    )


@router.get("/history/{workspace_id}", response_model=List[schemas.ConversationOut])
def get_conversation_history(
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

    conversations = db.query(models.Conversation).filter(
        models.Conversation.workspace_id == workspace_id
    ).order_by(models.Conversation.created_at.desc()).all()

    result = []
    for conv in conversations:
        messages = [
            schemas.MessageOut(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                conversation_id=m.conversation_id
            ) for m in conv.messages
        ]
        result.append(schemas.ConversationOut(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            workspace_id=conv.workspace_id,
            messages=messages
        ))
    return result


@router.delete("/conversation/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    conv = db.query(models.Conversation).join(models.Workspace).filter(
        models.Conversation.id == conversation_id,
        models.Workspace.owner_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
