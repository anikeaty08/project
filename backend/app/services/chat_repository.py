from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload


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

    def touch_session(self, session: ChatSession) -> None:
        session.updated_at = datetime.now(timezone.utc)
