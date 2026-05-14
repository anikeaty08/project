from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.rag_answer_agent import run_rag_answer_agent
from app.agents.session_query_agent import run_session_query_agent
from app.config import settings
from app.models.chat import ChatMessage, ChatSession
from app.rag import retrieve_context
from app.services.history_utils import messages_to_dicts, trim_messages_for_llm


def run_chat_turn(
    db: Session,
    session_id: uuid.UUID,
    user_content: str,
    language: str | None,
) -> dict[str, Any]:
    user_content = user_content.strip()
    if not user_content:
        raise HTTPException(status_code=400, detail="Message content is empty")

    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")

    user_row = ChatMessage(
        session_id=session_id,
        role="user",
        content=user_content,
    )
    db.add(user_row)
    db.flush()

    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    rows = list(db.scalars(stmt).all())
    dicts = messages_to_dicts(rows)
    trimmed = trim_messages_for_llm(
        dicts,
        settings.chat_history_limit,
        settings.chat_history_max_chars,
    )

    retrieval_query, summary_delta = run_session_query_agent(
        trimmed,
        sess.summary_text,
        user_content,
    )
    context_str, sources = retrieve_context(retrieval_query)
    answer = run_rag_answer_agent(
        trimmed,
        sess.summary_text,
        context_str,
        language,
    )

    combined = ((sess.summary_text or "").strip() + "\n" + summary_delta).strip()
    if len(combined) > settings.session_summary_max_chars:
        combined = combined[-settings.session_summary_max_chars :]
    sess.summary_text = combined or None
    sess.updated_at = datetime.now(timezone.utc)

    assistant_row = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources_json=sources,
    )
    db.add(assistant_row)
    db.commit()
    db.refresh(user_row)
    db.refresh(assistant_row)

    return {
        "answer": answer,
        "sources": sources,
        "retrieval_query": retrieval_query,
        "user_message_id": str(user_row.id),
        "assistant_message_id": str(assistant_row.id),
    }
