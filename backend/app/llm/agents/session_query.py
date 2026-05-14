from __future__ import annotations

import re
from typing import Any

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import SessionQueryResult

PROMPT = """## Role / Domain
You are a session-planning agent for a retrieval-augmented chat system.

## Primary Goal
Convert recent conversation and session memory into a useful document retrieval query and a small durable memory update.

## Behavior Rules
- Do not answer the user's question.
- Do not use medical or herbal knowledge as authority.
- Replace pronouns like "it" or "that herb" with concrete names/topics when possible.
- Keep durable memory focused on user-stated facts, preferences, names, or constraints.
- If no durable new memory exists, use an empty summary_delta.

## Task Workflow
1. Read the current session summary.
2. Read the recent dialogue.
3. Identify what the next retrieval search should find.
4. Write one standalone retrieval query.
5. Write zero to three short sentences of new durable memory.

## Special Instructions
- The retrieval query should work for semantic and keyword search.
- Keep the retrieval query short and direct.
- Do not include markdown.

## Output Format
Return only JSON:
{"retrieval_query": string, "summary_delta": string}
"""


def _format_dialogue(messages: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for m in messages:
        role = m.get("role", "")
        content = (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines)


def run(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    fallback_user_text: str,
) -> tuple[str, str]:
    payload = (
        "SESSION_SUMMARY:\n"
        f"{(session_summary or '').strip() or '(none yet)'}\n\n"
        "RECENT_DIALOGUE:\n"
        f"{_format_dialogue(messages)}\n"
    )
    raw = complete_json(
        model=settings.openai_chat_model,
        messages=[message("system", PROMPT), message("user", payload)],
        temperature=0.2,
    )
    result = parse_model_or_fallback(
        SessionQueryResult,
        raw,
        SessionQueryResult(retrieval_query=fallback_user_text.strip(), summary_delta=""),
    )
    retrieval_query = re.sub(r"\s+", " ", result.retrieval_query.strip())
    if not retrieval_query:
        retrieval_query = fallback_user_text.strip()
    return retrieval_query[:500], result.summary_delta.strip()[: settings.session_summary_max_chars]
