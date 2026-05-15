from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.auth import AuthUser
from app.services.chat_agent_graph import ChatAgentGraph
from app.services.chat_models import message_to_response
from app.services.chat_repository import ChatRepository
from app.services.observability import new_trace_id


class ChatOrchestrator:
    def __init__(self) -> None:
        self.repo = ChatRepository()
        self.graph = ChatAgentGraph()

    def run_turn(
        self,
        db: Session,
        session_id: uuid.UUID,
        user_content: str,
        language: str | None,
        upload_ids: list[uuid.UUID] | None = None,
        auth_user: AuthUser | None = None,
    ) -> dict[str, Any]:
        trace_id = new_trace_id()
        user_content = user_content.strip()
        if not user_content:
            raise HTTPException(status_code=400, detail="Message content is empty")

        state = self.graph.invoke(
            {
                "db": db,
                "session_id": session_id,
                "user_content": user_content,
                "language": language,
                "upload_ids": upload_ids,
                "auth_user": auth_user,
                "trace_id": trace_id,
                "steps": [],
            }
        )

        return {
            "answer": state["answer"],
            "sources": state["sources"],
            "retrieval_query": state["plan"].query,
            "trace_id": trace_id,
            "steps": state.get("steps", []),
            "user_message_id": str(state["user_row"].id),
            "assistant_message_id": str(state["assistant_row"].id),
            "session_title": state["session"].title,
            "user_message": message_to_response(state["user_row"]),
            "assistant_message": message_to_response(state["assistant_row"]),
        }
