from __future__ import annotations

import re
from typing import Protocol

from app.config import settings
from app.models.chat import ChatSession


def _memory_lines(text: str) -> list[str]:
    return [
        re.sub(r"\s+", " ", line).strip(" -")
        for line in (text or "").splitlines()
        if re.sub(r"\s+", " ", line).strip(" -")
    ]


class MemoryStore(Protocol):
    def get_summary(self, session: ChatSession) -> str | None:
        ...

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        ...


class PostgresSummaryMemoryStore:
    def get_summary(self, session: ChatSession) -> str | None:
        return session.summary_text

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        old_lines = _memory_lines(session.summary_text or "")
        new_lines = _memory_lines(delta or "")
        if not new_lines:
            return session.summary_text
        seen: set[str] = set()
        merged: list[str] = []
        for line in old_lines + new_lines:
            key = line.lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(line)
        combined = "\n".join(f"- {line}" for line in merged)
        while len(combined) > settings.session_summary_max_chars and merged:
            merged.pop(0)
            combined = "\n".join(f"- {line}" for line in merged)
        session.summary_text = combined or None
        return session.summary_text

    def remember_turn(
        self,
        session: ChatSession,
        user_content: str,
        assistant_answer: str,
    ) -> str | None:
        facts: list[str] = []
        user = re.sub(r"\s+", " ", user_content).strip()
        answer = re.sub(r"\s+", " ", assistant_answer).strip()
        if user:
            facts.append(f"User asked: {user[:180]}")
        if answer and not answer.lower().startswith("i can only help with ayurveda"):
            facts.append(f"Assistant answered: {answer[:240]}")
        return self.merge_summary_delta(session, "\n".join(facts))


def get_memory_store() -> MemoryStore:
    return PostgresSummaryMemoryStore()
