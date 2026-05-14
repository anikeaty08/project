from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from app.config import settings

SESSION_AGENT_SYSTEM = """You are a session assistant. Your job is NOT to answer the user's question from medical or herbal knowledge.
You only:
1) Read the recent conversation and the running session summary.
2) Produce a short "retrieval_query" string optimized for semantic / keyword search in a document index (standalone, no pronouns like "it" or "that herb" — replace with concrete names/topics).
3) Produce "summary_delta": 0-3 short sentences capturing NEW durable facts the user stated (preferences, names, constraints) to merge into the session summary. If nothing new, use an empty string.

Output ONLY valid JSON with keys: retrieval_query (string), summary_delta (string). No markdown.
"""


def _format_dialogue(messages: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for m in messages:
        role = m.get("role", "")
        content = (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines)


def run_session_query_agent(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    fallback_user_text: str,
) -> tuple[str, str]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    summary_block = (session_summary or "").strip() or "(none yet)"
    dialogue = _format_dialogue(messages)

    user_payload = (
        "SESSION_SUMMARY (may be incomplete):\n"
        f"{summary_block}\n\n"
        "RECENT DIALOGUE:\n"
        f"{dialogue}\n"
    )

    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SESSION_AGENT_SYSTEM},
            {"role": "user", "content": user_payload},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return fallback_user_text.strip(), ""

    rq = data.get("retrieval_query") or ""
    sd = data.get("summary_delta") or ""
    if isinstance(rq, str):
        rq = rq.strip()
    else:
        rq = ""
    if isinstance(sd, str):
        sd = sd.strip()
    else:
        sd = ""

    if not rq:
        rq = fallback_user_text.strip()
    rq = re.sub(r"\s+", " ", rq)[:500]
    sd = sd[: settings.session_summary_max_chars]
    return rq, sd
