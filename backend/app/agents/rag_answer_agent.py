from __future__ import annotations

from typing import Any

from openai import OpenAI

from app.config import settings

RAG_SYSTEM_PROMPT = """You are a careful assistant for Ayurveda and herbal reference material.

Rules:
- Base factual claims ONLY on the CONTEXT blocks below. If the context does not contain enough information, say clearly that you do not have that information in the indexed sources.
- When you use facts from CONTEXT, mention which source index ([1], [2], ...) they came from when possible.
- The SESSION_SUMMARY block is only conversational memory — do not treat it as medical authority. Prefer CONTEXT for facts.
- Respond in the same language as the user's latest message (English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Urdu, or other Indian languages). If the user mixes languages, follow the dominant language. If unclear, use English.
- Be concise and practical. Do not invent citations or URLs not present in CONTEXT.
"""


def run_rag_answer_agent(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    context_block: str,
    language: str | None,
) -> str:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    lang_hint = ""
    if language:
        lang_hint = f"\nPreferred response language code: {language}\n"

    summary_part = (session_summary or "").strip() or "(none)"
    context_message = (
        "SESSION_SUMMARY (memory only, not a medical source):\n"
        f"{summary_part}\n\n"
        "CONTEXT from retrieval (use only this for factual claims):\n\n"
        + (
            context_block
            if context_block.strip()
            else "(No matching chunks were found in the vector store.)"
        )
        + lang_hint
    )

    openai_messages: list[dict[str, Any]] = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {"role": "system", "content": context_message},
    ]
    for m in messages:
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        openai_messages.append({"role": role, "content": m.get("content", "")})

    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=openai_messages,
        temperature=0.2,
    )
    return completion.choices[0].message.content or ""
