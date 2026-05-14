from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload
from app.services.chat_turn import run_chat_turn
from app.services.prescription_upload_service import save_and_process_upload

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    title: str | None = Field(default=None, max_length=512)


class CreateSessionResponse(BaseModel):
    id: str
    title: str | None
    created_at: datetime


class SessionListItem(BaseModel):
    id: str
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageItem(BaseModel):
    id: str
    role: str
    content: str
    sources: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionChatRequest(BaseModel):
    content: str = Field(min_length=1, max_length=32000)
    language: str | None = None
    upload_ids: list[str] | None = None


class SessionUploadItem(BaseModel):
    id: str
    session_id: str
    original_filename: str
    mime_type: str
    parse: dict
    verify: dict | None = None
    created_at: datetime


class SourceItem(BaseModel):
    rank: int
    source: str
    source_type: str | None = None
    snippet: str


class SessionChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    retrieval_query: str
    user_message_id: str
    assistant_message_id: str


@router.post("/", response_model=CreateSessionResponse)
def create_session(body: CreateSessionRequest, db: Session = Depends(get_db)):
    s = ChatSession(title=body.title)
    db.add(s)
    db.commit()
    db.refresh(s)
    return CreateSessionResponse(id=str(s.id), title=s.title, created_at=s.created_at)


@router.get("/", response_model=list[SessionListItem])
def list_sessions(db: Session = Depends(get_db), limit: int = 50):
    stmt = (
        select(ChatSession)
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
        .limit(min(limit, 100))
    )
    rows = db.scalars(stmt).all()
    return [
        SessionListItem(
            id=str(r.id),
            title=r.title,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/{session_id}/messages", response_model=list[MessageItem])
def get_messages(session_id: uuid.UUID, db: Session = Depends(get_db)):
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    rows = db.scalars(stmt).all()
    if not rows:
        exists = db.get(ChatSession, session_id)
        if exists is None:
            raise HTTPException(status_code=404, detail="Session not found")
    return [
        MessageItem(
            id=str(m.id),
            role=m.role,
            content=m.content,
            sources=m.sources_json,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.post("/{session_id}/chat/", response_model=SessionChatResponse)
def session_chat(
    session_id: uuid.UUID,
    body: SessionChatRequest,
    db: Session = Depends(get_db),
):
    try:
        out = run_chat_turn(db, session_id, body.content, body.language)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return SessionChatResponse(
        answer=out["answer"],
        sources=[SourceItem(**s) for s in out["sources"]],
        retrieval_query=out["retrieval_query"],
        user_message_id=out["user_message_id"],
        assistant_message_id=out["assistant_message_id"],
    )
