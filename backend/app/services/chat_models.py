from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.models.chat import ChatMessage


@dataclass(frozen=True)
class RetrievalPlan:
    query: str
    summary_delta: str


@dataclass(frozen=True)
class UploadContext:
    secondary_query: str | None
    supplement_text: str | None
    pending_notes: list[str]


@dataclass(frozen=True)
class AgentStep:
    key: str
    label: str
    status: str = "completed"


def agent_step(key: str, label: str, status: str = "completed") -> dict[str, str]:
    return {"key": key, "label": label, "status": status}


def message_to_response(row: ChatMessage) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "role": row.role,
        "content": row.content,
        "sources": row.sources_json,
        "created_at": row.created_at,
    }
