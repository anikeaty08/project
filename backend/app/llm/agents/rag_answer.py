from __future__ import annotations

from typing import Any

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_chat

PROMPT = """## Role / Domain
You are a retrieval-grounded assistant for Ayurveda and herbal reference material.

## Primary Goal
Answer the user's latest question naturally using the supplied retrieved context.

## Behavior Rules
- Use retrieved context for factual claims.
- If the retrieved context is missing or too thin, say the indexed sources do not contain enough information.
- Cite source numbers like [1] or [2] when a claim comes from a retrieved source.
- Treat session memory as conversation memory, not as medical authority.
- Treat upload or web supplement material as secondary context.
- If the upload supplement contains plant image identification, answer the image question directly from it first, then use retrieved herb context only as enrichment.
- Do not invent citations, URLs, ingredients, dosages, or source details.
- Do not say you cannot display photos or images. The frontend may show visual references separately; answer the user normally.

## Task Workflow
1. Read session memory and retrieved context.
2. Read the latest user message and recent dialogue.
3. Decide what can be answered from context.
4. Answer directly and cite sources where useful.
5. Mention uncertainty when the context does not support a claim.

## Special Instructions
- Match the user's language when possible.
- Include medical caution only for medication, prescriptions, safety, interactions, dosage, pregnancy, children, or serious symptoms.
- For plant image identification, include the likely name, botanical name when available, confidence/uncertainty, and visible evidence in the user's language.
- Avoid repetitive disclaimers.

## Output Format
Return natural text for the user. Do not force a fixed section format unless it helps the answer.
"""


def run(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    context_block: str,
    language: str | None,
    supplement_block: str | None = None,
) -> str:
    context_parts = [
        "SESSION_SUMMARY (conversation memory only):",
        (session_summary or "").strip() or "(none)",
        "",
        "RETRIEVED_CONTEXT:",
        context_block.strip() or "(No matching chunks were found in the vector store.)",
    ]
    if supplement_block and supplement_block.strip():
        context_parts.extend(["", "UPLOAD_OR_WEB_SUPPLEMENT:", supplement_block.strip()])
    if language:
        context_parts.extend(["", f"Preferred response language code: {language}"])

    openai_messages = [
        message("system", PROMPT),
        message("system", "\n".join(context_parts)),
    ]
    for m in messages:
        role = m.get("role")
        if role in ("user", "assistant"):
            openai_messages.append(message(role, m.get("content", "")))

    return complete_chat(
        model=settings.openai_chat_model,
        messages=openai_messages,
        temperature=0.2,
    )
