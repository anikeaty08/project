from __future__ import annotations

from typing import Any


def messages_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [{"role": r.role, "content": r.content} for r in rows]


def trim_messages_for_llm(
    messages: list[dict[str, Any]],
    max_turns: int,
    max_chars: int,
) -> list[dict[str, Any]]:
    msgs = [m for m in messages if m.get("role") in ("user", "assistant") and m.get("content")]
    if not msgs:
        return []
    max_messages = max(2, max_turns * 2)
    tail = msgs[-max_messages:]
    while tail and sum(len(str(m.get("content", ""))) for m in tail) > max_chars:
        tail = tail[1:]
    return tail
