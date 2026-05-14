from __future__ import annotations

from typing import Any

from app.llm.agents import (
    plant_image,
    prescription_document,
    prescription_intent,
    prescription_verify,
    rag_answer,
    session_query,
    unsplash_intent,
)


def run_session_query_agent(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    fallback_user_text: str,
) -> tuple[str, str]:
    return session_query.run(messages, session_summary, fallback_user_text)


def run_rag_answer_agent(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    context_block: str,
    language: str | None,
    supplement_block: str | None = None,
) -> str:
    return rag_answer.run(messages, session_summary, context_block, language, supplement_block)


def is_prescription_related_message(text: str) -> bool:
    return prescription_intent.run(text)


def is_prescription_keyword_match(text: str) -> bool:
    return prescription_intent.keyword_match(text)


def run_prescription_document_agent(
    filename: str,
    mime_type: str,
    file_bytes: bytes,
) -> dict[str, Any]:
    return prescription_document.run(filename, mime_type, file_bytes)


def run_plant_image_agent(
    filename: str,
    mime_type: str,
    file_bytes: bytes,
    user_context: str | None = None,
) -> dict[str, Any]:
    return plant_image.run(filename, mime_type, file_bytes, user_context)


def is_parse_weak(parsed: dict[str, Any]) -> bool:
    return prescription_document.is_parse_weak(parsed)


def run_prescription_verify_agent(
    *,
    search_query: str,
    context_from_document: str | None = None,
) -> dict[str, Any]:
    return prescription_verify.run(
        search_query=search_query,
        context_from_document=context_from_document,
    )


def verify_result_to_prompt_block(verify: dict[str, Any]) -> str:
    return prescription_verify.to_prompt_block(verify)


def run_unsplash_intent_agent(assistant_text: str) -> dict[str, Any]:
    return unsplash_intent.run(assistant_text)
