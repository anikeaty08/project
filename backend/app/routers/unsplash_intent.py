from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.unsplash_intent_agent import run_unsplash_intent_agent

router = APIRouter(prefix="/unsplash", tags=["unsplash"])


class UnsplashIntentRequest(BaseModel):
    text: str = Field(default="", max_length=8000)


class UnsplashIntentResponse(BaseModel):
    show_images: bool
    keyword: str


@router.post("/intent", response_model=UnsplashIntentResponse)
def unsplash_intent(body: UnsplashIntentRequest):
    raw = (body.text or "").strip()[:4000]
    if not raw:
        return UnsplashIntentResponse(show_images=False, keyword="")
    try:
        out = run_unsplash_intent_agent(raw)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return UnsplashIntentResponse(
        show_images=bool(out.get("show_images")),
        keyword=str(out.get("keyword") or ""),
    )
