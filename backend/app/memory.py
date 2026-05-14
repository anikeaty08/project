from __future__ import annotations

from typing import Protocol

from app.config import settings
from app.models.chat import ChatSession


class MemoryStore(Protocol):
    def get_summary(self, session: ChatSession) -> str | None:
        ...

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        ...


class PostgresSummaryMemoryStore:
    def get_summary(self, session: ChatSession) -> str | None:
        return session.summary_text

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        combined = ((session.summary_text or "").strip() + "\n" + delta.strip()).strip()
        if len(combined) > settings.session_summary_max_chars:
            combined = combined[-settings.session_summary_max_chars :]
        session.summary_text = combined or None
        return session.summary_text


def get_memory_store() -> MemoryStore:
    return PostgresSummaryMemoryStore()
