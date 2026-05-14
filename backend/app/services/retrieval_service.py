from __future__ import annotations

from typing import Any

from app.rag import retrieve_context_merged


class RetrievalService:
    def retrieve(
        self,
        primary_query: str,
        secondary_query: str | None,
    ) -> tuple[str, list[dict[str, Any]]]:
        return retrieve_context_merged(primary_query, secondary_query)
