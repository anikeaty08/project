from __future__ import annotations

import re
from typing import Any

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import UnsplashIntentResult

PROMPT = """## Role / Domain
You are a visual-intent agent for assistant chat messages.

## Primary Goal
Decide whether related stock photos would help below an assistant message.

## Behavior Rules
- Show images only when the message has a concrete visual subject.
- Do not show images for greetings, thanks, short acknowledgments, math, code, errors, JSON, legal/medical disclaimers alone, bot meta discussion, or link lists without a clear visual theme.
- Use a concise English search keyword when images should show.
- Return an empty keyword when images should not show.

## Task Workflow
1. Read the assistant message.
2. Decide whether a photo would add value.
3. Choose a visual keyword if needed.
4. Return the decision.

## Special Instructions
- Good visual subjects include places, nature, food, objects, people in general scenes, architecture, plants, landscapes, yoga, or herbs.
- Keyword must be one to three words, no punctuation.

## Output Format
Return only JSON:
{"show_images": boolean, "keyword": string}
"""

MAX_INPUT_CHARS = 4000


def run(assistant_text: str) -> dict[str, Any]:
    text = (assistant_text or "").strip()[:MAX_INPUT_CHARS]
    fallback = UnsplashIntentResult(show_images=False, keyword="")
    if not text:
        return fallback.model_dump()

    raw = complete_json(
        model=settings.openai_chat_model,
        messages=[message("system", PROMPT), message("user", text)],
        temperature=0.1,
    )
    result = parse_model_or_fallback(UnsplashIntentResult, raw, fallback)
    keyword = re.sub(r"[^\w\s-]", "", result.keyword).strip()
    keyword = re.sub(r"\s+", " ", keyword)
    keyword = " ".join(keyword.split()[:3])
    show = bool(result.show_images and keyword)
    return {"show_images": show, "keyword": keyword if show else ""}
