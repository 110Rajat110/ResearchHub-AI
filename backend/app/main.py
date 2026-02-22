from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from .database import engine
from . import models
from .routers import auth_router, workspace_router, paper_router, chat_router

# Create all database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchHub AI",
    description="Intelligent Research Paper Management and Analysis System powered by Groq Llama 3.3 70B",
    version="1.0.0",
    contact={
        "name": "ResearchHub AI Team",
    }
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(workspace_router.router)
app.include_router(paper_router.router)
app.include_router(chat_router.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "app": "ResearchHub AI",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
