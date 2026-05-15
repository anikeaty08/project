from __future__ import annotations

import uuid
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload


def session_title_from_message(content: str, max_chars: int = 64) -> str:
    text = re.sub(r"\s+", " ", content).strip()
    if not text:
        return "New chat"
    if text.lower().startswith("please help me with the attached file"):
        return "Uploaded file"
    text = text.strip(" .,:;!?")
    if len(text) <= max_chars:
        return text or "New chat"
    clipped = text[: max_chars + 1].rsplit(" ", 1)[0].strip(" .,:;!?")
    return clipped or text[:max_chars].strip(" .,:;!?") or "New chat"


class ChatRepository:
    def get_session(self, db: Session, session_id: uuid.UUID) -> ChatSession:
        sess = db.get(ChatSession, session_id)
        if sess is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return sess

    def load_uploads(
        self,
        db: Session,
        session_id: uuid.UUID,
        upload_ids: list[uuid.UUID] | None,
    ) -> list[SessionUpload]:
        if not upload_ids:
            return []
        rows: list[SessionUpload] = []
        for uid in upload_ids:
            row = db.get(SessionUpload, uid)
            if row is None or row.session_id != session_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Upload {uid} not found for this session",
                )
            rows.append(row)
        return rows

    def add_message(
        self,
        db: Session,
        session_id: uuid.UUID,
        role: str,
        content: str,
        sources: list[dict[str, Any]] | None = None,
    ) -> ChatMessage:
        row = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            sources_json=sources,
        )
        db.add(row)
        db.flush()
        return row

    def load_messages(self, db: Session, session_id: uuid.UUID) -> list[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        return list(db.scalars(stmt).all())

    def owned_messages_statement(self, session_id: uuid.UUID, clerk_user_id: str):
        return (
            select(ChatMessage)
            .join(ChatSession, ChatMessage.session_id == ChatSession.id)
            .where(
                ChatMessage.session_id == session_id,
                ChatSession.clerk_user_id == clerk_user_id,
            )
            .order_by(ChatMessage.created_at.asc())
        )

    def load_owned_messages(
        self,
        db: Session,
        session_id: uuid.UUID,
        clerk_user_id: str,
    ) -> list[ChatMessage]:
        return list(db.scalars(self.owned_messages_statement(session_id, clerk_user_id)).all())

    def touch_session(self, session: ChatSession) -> None:
        session.updated_at = datetime.now(timezone.utc)

    def set_initial_title(self, session: ChatSession, content: str) -> None:
        if session.title and session.title.strip() not in {"New chat", "Untitled chat"}:
            return
        session.title = session_title_from_message(content)
        self.touch_session(session)
