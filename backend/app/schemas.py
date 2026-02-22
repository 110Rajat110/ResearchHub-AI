from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Workspace ────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class WorkspaceOut(BaseModel):
    id: int
    name: str
    description: str
    created_at: datetime
    owner_id: int
    paper_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Paper ───────────────────────────────────────────────────────────────────

class PaperImport(BaseModel):
    workspace_id: int
    title: str
    authors: str
    abstract: str
    year: Optional[int] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = "openalex"
    external_id: Optional[str] = None


class PaperOut(BaseModel):
    id: int
    title: str
    authors: str
    abstract: str
    year: Optional[int]
    doi: Optional[str]
    url: Optional[str]
    source: str
    imported_at: datetime
    workspace_id: int

    class Config:
        from_attributes = True


# ─── Search Results (not DB) ─────────────────────────────────────────────────

class SearchResult(BaseModel):
    title: str
    authors: str
    abstract: str
    year: Optional[int]
    doi: Optional[str]
    url: Optional[str]
    source: str
    external_id: Optional[str]


# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    workspace_id: int
    message: str
    conversation_id: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    conversation_id: int

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    workspace_id: int
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str
