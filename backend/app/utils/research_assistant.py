"""
Research Assistant Utility
Uses sentence-transformers to create embeddings for paper abstracts
and retrieves the most relevant context for AI chat responses.
"""
from typing import List, Optional
import numpy as np

# Lazy-load the model to avoid slow startup
_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"[ResearchAssistant] Warning: Could not load embedding model: {e}")
            _model = None
    return _model


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_norm = np.linalg.norm(a)
    b_norm = np.linalg.norm(b)
    if a_norm == 0 or b_norm == 0:
        return 0.0
    return float(np.dot(a, b) / (a_norm * b_norm))


def get_relevant_papers(query: str, papers: list, top_k: int = 5) -> list:
    """
    Return the top_k most relevant papers based on embedding similarity to query.
    Falls back to returning all papers if the model is unavailable.
    """
    if not papers:
        return []

    model = _get_model()
    if model is None:
        return papers[:top_k]

    query_embedding = model.encode(query, convert_to_numpy=True)

    scored = []
    for paper in papers:
        text = f"{paper.title}. {paper.abstract or ''}"
        paper_embedding = model.encode(text[:512], convert_to_numpy=True)
        score = cosine_similarity(query_embedding, paper_embedding)
        scored.append((score, paper))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:top_k]]


def build_system_prompt(relevant_papers: list) -> str:
    """Build a system prompt containing the relevant paper context."""
    if not relevant_papers:
        return (
            "You are ResearchHub AI, an expert research assistant. "
            "The current workspace has no imported papers yet. "
            "Help the user understand research topics based on your general knowledge. "
            "Be concise, accurate, and scholarly."
        )

    papers_context = []
    for i, paper in enumerate(relevant_papers, 1):
        authors = paper.authors or "Unknown authors"
        year = f"({paper.year})" if paper.year else ""
        abstract = paper.abstract or "No abstract available."
        papers_context.append(
            f"[Paper {i}] \"{paper.title}\" by {authors} {year}\n"
            f"Abstract: {abstract[:600]}"
        )

    context_str = "\n\n".join(papers_context)

    return f"""You are ResearchHub AI, an expert AI research assistant with deep knowledge of academic literature.
You have access to the following research papers from the user's workspace:

{context_str}

Instructions:
- Answer questions based primarily on the provided papers.
- When referencing a paper, mention its title and authors naturally.
- Synthesize information across multiple papers when relevant.
- Be concise, accurate, and scholarly in tone.
- If the question is outside the scope of the provided papers, use your general knowledge but mention it.
- Format your responses with clear structure when listing multiple points."""
