from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.llm.tasks import (
    is_prescription_related_message,
    run_prescription_verify_agent,
    run_rag_answer_agent,
    run_session_query_agent,
    verify_result_to_prompt_block,
)
from app.config import settings
from app.memory import get_memory_store
from app.models.chat import ChatMessage, ChatSession
from app.models.session_upload import SessionUpload
from app.rag import retrieve_context_merged
from app.services.history_utils import messages_to_dicts, trim_messages_for_llm

_QUERY_PRONOUNS = {
    "it",
    "this",
    "that",
    "they",
    "them",
    "these",
    "those",
    "he",
    "she",
    "its",
    "unka",
    "iske",
    "iska",
    "yeh",
    "ye",
    "woh",
    "uska",
}


def _message_to_response(row: ChatMessage) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "role": row.role,
        "content": row.content,
        "sources": row.sources_json,
        "created_at": row.created_at,
    }


def should_plan_retrieval_query(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    latest_user_content: str,
) -> bool:
    prior_turns = [
        m
        for m in messages[:-1]
        if m.get("role") in ("user", "assistant") and str(m.get("content") or "").strip()
    ]
    if not prior_turns and not (session_summary or "").strip():
        return False
    words = {
        token.strip(".,!?;:()[]{}\"'").lower()
        for token in latest_user_content.split()
    }
    if words & _QUERY_PRONOUNS:
        return True
    return bool((session_summary or "").strip() and len(latest_user_content) < 40)


def _load_session_uploads(
    db: Session, session_id: uuid.UUID, upload_ids: list[uuid.UUID] | None
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


def _upload_secondary_query(upload_rows: list[SessionUpload]) -> str | None:
    parts: list[str] = []
    for u in upload_rows:
        p = u.parse_result_json or {}
        q = str(p.get("retrieval_query") or "").strip()
        if q:
            parts.append(q)
    merged = " ".join(parts).strip()
    return merged[:1200] if merged else None


def _upload_supplement_text(upload_rows: list[SessionUpload]) -> str:
    blocks: list[str] = []
    for u in upload_rows:
        p = u.parse_result_json or {}
        if p:
            blocks.append(
                f"USER_UPLOAD {u.original_filename}:\n"
                f"{str(p.get('flat_text') or '')[:2200]}"
            )
        v = u.verify_result_json
        if isinstance(v, dict) and v:
            blocks.append(verify_result_to_prompt_block(v))
    return "\n\n".join(blocks).strip()


def run_chat_turn(
    db: Session,
    session_id: uuid.UUID,
    user_content: str,
    language: str | None,
    upload_ids: list[uuid.UUID] | None = None,
) -> dict[str, Any]:
    user_content = user_content.strip()
    if not user_content:
        raise HTTPException(status_code=400, detail="Message content is empty")

    sess = db.get(ChatSession, session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")

    memory = get_memory_store()
    session_summary = memory.get_summary(sess)
    upload_rows = _load_session_uploads(db, session_id, upload_ids)

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

    if should_plan_retrieval_query(trimmed, session_summary, user_content):
        retrieval_query, summary_delta = run_session_query_agent(
            trimmed,
            session_summary,
            user_content,
        )
    else:
        retrieval_query, summary_delta = user_content[:500], ""

    secondary = _upload_secondary_query(upload_rows)
    context_str, sources = retrieve_context_merged(
        retrieval_query,
        secondary,
    )

    supplement_parts: list[str] = []
    up_sup = _upload_supplement_text(upload_rows)
    if up_sup:
        supplement_parts.append(up_sup)

    if is_prescription_related_message(user_content) and settings.tavily_api_key:
        doc_ctx = up_sup[:4000] if up_sup else None
        search_q = f"{user_content}\n{retrieval_query}".strip()[:450]
        try:
            chat_verify = run_prescription_verify_agent(
                search_query=search_q,
                context_from_document=doc_ctx,
            )
            supplement_parts.append(verify_result_to_prompt_block(chat_verify))
        except Exception:
            pass

    supplement = "\n\n".join(supplement_parts).strip() or None

    answer = run_rag_answer_agent(
        trimmed,
        session_summary,
        context_str,
        language,
        supplement_block=supplement,
    )

    memory.merge_summary_delta(sess, summary_delta)
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
        "user_message": _message_to_response(user_row),
        "assistant_message": _message_to_response(assistant_row),
    }
