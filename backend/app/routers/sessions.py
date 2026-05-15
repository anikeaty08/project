from __future__ import annotations

import uuid
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import chroma_store
from app.config import settings
from app.db.session import get_db
from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload
from app.services.auth import AuthUser, require_clerk_user, verify_session_user
from app.services.chat_repository import ChatRepository
from app.services.chat_turn import run_chat_turn
from app.services.prescription_upload_service import save_upload_queued
from app.services.upload_jobs import upload_job_runner
from app.services.upload_storage import upload_file_url

router = APIRouter(prefix="/sessions", tags=["sessions"])
chat_repo = ChatRepository()


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
    status: str = "completed"
    processing_error: str | None = None
    trace_id: str | None = None
    url: str
    parse: dict
    verify: dict | None = None
    created_at: datetime


class SourceItem(BaseModel):
    rank: int
    source: str
    source_type: str | None = None
    snippet: str


class AgentStepItem(BaseModel):
    key: str
    label: str
    status: str = "completed"


class SessionChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    retrieval_query: str
    user_message_id: str
    assistant_message_id: str
    session_title: str | None = None
    trace_id: str | None = None
    steps: list[AgentStepItem] = []
    user_message: MessageItem | None = None
    assistant_message: MessageItem | None = None


@router.post("/", response_model=CreateSessionResponse)
def create_session(
    body: CreateSessionRequest,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    title = (body.title or "").strip() or "New chat"
    s = ChatSession(title=title, clerk_user_id=auth_user.clerk_user_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return CreateSessionResponse(
        id=str(s.id),
        title=s.title,
        created_at=s.created_at,
    )


@router.get("/", response_model=list[SessionListItem])
def list_sessions(
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    stmt = (
        select(ChatSession)
        .where(ChatSession.clerk_user_id == auth_user.clerk_user_id)
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


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: uuid.UUID,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_user(sess, auth_user)
    db.delete(sess)
    db.commit()
    chroma_store.delete_by_session(str(session_id))
    upload_root = (settings.upload_dir / str(session_id)).resolve()
    base = settings.upload_dir.resolve()
    try:
        upload_root.relative_to(base)
    except ValueError:
        return None
    if upload_root.exists():
        shutil.rmtree(upload_root, ignore_errors=True)
    return None


@router.get("/{session_id}/messages", response_model=list[MessageItem])
def get_messages(
    session_id: uuid.UUID,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_user(sess, auth_user)
    rows = chat_repo.load_owned_messages(db, session_id, auth_user.clerk_user_id)
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


@router.post("/{session_id}/uploads", response_model=list[SessionUploadItem])
def session_upload_files(
    session_id: uuid.UUID,
    files: list[UploadFile] = File(..., description="Prescription images or PDFs"),
    context: str = Form(default=""),
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_user(sess, auth_user)
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    results: list[SessionUploadItem] = []
    for f in files:
        raw = f.file.read()
        if not raw:
            raise HTTPException(status_code=400, detail=f"Empty file: {f.filename}")
        try:
            row = save_upload_queued(
                db,
                session_id,
                f.filename or "upload.bin",
                f.content_type or "application/octet-stream",
                raw,
            )
            upload_job_runner.enqueue(row.id, context)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=str(e)) from e
        results.append(
            SessionUploadItem(
                id=str(row.id),
                session_id=str(row.session_id),
                original_filename=row.original_filename,
                mime_type=row.mime_type,
                status=row.status,
                processing_error=row.processing_error,
                trace_id=row.trace_id,
                url=upload_file_url(row),
                parse=row.parse_result_json or {},
                verify=row.verify_result_json,
                created_at=row.created_at,
            )
        )
    return results


@router.get("/{session_id}/uploads", response_model=list[SessionUploadItem])
def list_uploads(
    session_id: uuid.UUID,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_user(sess, auth_user)
    rows = db.scalars(
        select(SessionUpload)
        .where(SessionUpload.session_id == session_id)
        .order_by(SessionUpload.created_at.asc())
    ).all()
    return [
        SessionUploadItem(
            id=str(row.id),
            session_id=str(row.session_id),
            original_filename=row.original_filename,
            mime_type=row.mime_type,
            status=row.status,
            processing_error=row.processing_error,
            trace_id=row.trace_id,
            url=upload_file_url(row),
            parse=row.parse_result_json or {},
            verify=row.verify_result_json,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/{session_id}/uploads/{upload_id}/file")
def get_upload_file(
    session_id: uuid.UUID,
    upload_id: uuid.UUID,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    verify_session_user(sess, auth_user)
    row = db.get(SessionUpload, upload_id)
    if row is None or row.session_id != session_id:
        raise HTTPException(status_code=404, detail="Upload not found")
    path = Path(row.storage_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Upload file missing")
    return FileResponse(
        path,
        media_type=row.mime_type,
        filename=row.original_filename,
    )


@router.post("/{session_id}/chat/", response_model=SessionChatResponse)
def session_chat(
    session_id: uuid.UUID,
    body: SessionChatRequest,
    auth_user: AuthUser = Depends(require_clerk_user),
    db: Session = Depends(get_db),
):
    upload_uuid_list: list[uuid.UUID] | None = None
    if body.upload_ids:
        upload_uuid_list = []
        for s in body.upload_ids:
            try:
                upload_uuid_list.append(uuid.UUID(str(s)))
            except ValueError as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid upload_id: {s}"
                ) from e
    try:
        out = run_chat_turn(
            db,
            session_id,
            body.content,
            body.language,
            upload_ids=upload_uuid_list,
            auth_user=auth_user,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return SessionChatResponse(
        answer=out["answer"],
        sources=[SourceItem(**s) for s in out["sources"]],
        retrieval_query=out["retrieval_query"],
        user_message_id=out["user_message_id"],
        assistant_message_id=out["assistant_message_id"],
        session_title=out.get("session_title"),
        trace_id=out.get("trace_id"),
        steps=[AgentStepItem(**step) for step in out.get("steps", [])],
        user_message=MessageItem(**out["user_message"]),
        assistant_message=MessageItem(**out["assistant_message"]),
    )
