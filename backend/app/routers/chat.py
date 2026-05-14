from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import rag

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    language: str | None = None


class SourceItem(BaseModel):
    rank: int
    source: str
    source_type: str | None = None
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


@router.post("/", response_model=ChatResponse)
def chat_endpoint(body: ChatRequest):
    msgs: list[dict[str, Any]] = [m.model_dump() for m in body.messages]
    try:
        answer, sources = rag.chat_with_rag(msgs, language=body.language)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return ChatResponse(
        answer=answer,
        sources=[SourceItem(**s) for s in sources],
    )
