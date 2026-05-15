from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.llm.tasks import run_unsplash_intent_agent

router = APIRouter(prefix="/unsplash", tags=["unsplash"])

HERB_KEYWORDS = [
    ("tulsi", "tulsi holy basil plant"),
    ("holy basil", "tulsi holy basil plant"),
    ("ashwagandha", "ashwagandha plant"),
    ("brahmi", "brahmi herb plant"),
    ("saffron", "saffron crocus flower"),
    ("turmeric", "turmeric plant"),
    ("haridra", "turmeric plant"),
    ("aloe", "aloe vera plant"),
    ("kumari", "aloe vera plant"),
    ("guduchi", "guduchi giloy plant"),
    ("giloy", "guduchi giloy plant"),
]


class UnsplashIntentRequest(BaseModel):
    text: str = Field(default="", max_length=8000)


class UnsplashIntentResponse(BaseModel):
    show_images: bool
    keyword: str


class UnsplashSearchRequest(BaseModel):
    keyword: str = Field(default="", max_length=120)
    per_page: int = Field(default=3, ge=1, le=6)


class UnsplashPhoto(BaseModel):
    id: str
    url: str
    thumb_url: str
    alt: str
    photographer: str
    photographer_url: str
    unsplash_url: str


@router.post("/intent", response_model=UnsplashIntentResponse)
def unsplash_intent(body: UnsplashIntentRequest):
    raw = (body.text or "").strip()[:4000]
    if not raw:
        return UnsplashIntentResponse(show_images=False, keyword="")
    lower = raw.lower()
    for needle, keyword in HERB_KEYWORDS:
        if needle in lower:
            return UnsplashIntentResponse(show_images=True, keyword=keyword)
    if any(word in lower for word in ("plant", "herb", "flower", "leaf", "leaves", "tree", "root")):
        words = [word for word in lower.replace("\n", " ").split() if word.isalpha()]
        keyword = " ".join((words[:2] + ["plant"])[:3]).strip()
        if keyword:
            return UnsplashIntentResponse(show_images=True, keyword=keyword)
    try:
        out = run_unsplash_intent_agent(raw)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return UnsplashIntentResponse(
        show_images=bool(out.get("show_images")),
        keyword=str(out.get("keyword") or ""),
    )


@router.post("/search", response_model=list[UnsplashPhoto])
def unsplash_search(body: UnsplashSearchRequest):
    keyword = " ".join((body.keyword or "").strip().split()[:4])
    if not keyword:
        return []
    if not settings.unsplash_access_key:
        raise HTTPException(status_code=503, detail="UNSPLASH_ACCESS_KEY is not configured")
    try:
        response = httpx.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": keyword,
                "per_page": body.per_page,
                "orientation": "landscape",
                "content_filter": "high",
            },
            headers={
                "Accept-Version": "v1",
                "Authorization": f"Client-ID {settings.unsplash_access_key}",
            },
            timeout=8.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Unsplash search failed") from exc
    data = response.json()
    photos: list[UnsplashPhoto] = []
    for item in data.get("results", [])[: body.per_page]:
        urls = item.get("urls") or {}
        user = item.get("user") or {}
        links = item.get("links") or {}
        photos.append(
            UnsplashPhoto(
                id=str(item.get("id") or ""),
                url=str(urls.get("regular") or urls.get("small") or ""),
                thumb_url=str(urls.get("small") or urls.get("thumb") or ""),
                alt=str(item.get("alt_description") or item.get("description") or keyword),
                photographer=str(user.get("name") or ""),
                photographer_url=str((user.get("links") or {}).get("html") or ""),
                unsplash_url=str(links.get("html") or ""),
            )
        )
    return [photo for photo in photos if photo.url]
