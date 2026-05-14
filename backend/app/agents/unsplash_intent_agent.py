from __future__ import annotations

import json
import re
from typing import Any

from openai import OpenAI

from app.config import settings

SYSTEM = """You decide if an assistant chat message should show decorative stock photos (Unsplash) below it.

Return ONLY valid JSON:
{"show_images": boolean, "keyword": string}

Rules:
- show_images: true only when the message describes something concrete and VISUAL (places, nature, food, objects, people in general scenes, architecture, plants, landscapes, yoga/herbs as physical subjects, etc.) where stock photos would help.
- show_images: false for: greetings, thanks, goodbye, short acknowledgments, pure math, code or stack traces, JSON, error messages, legal/medical disclaimers only, meta talk about the bot, lists of links with no visual theme, or when there is no clear visual subject.
- keyword: if show_images is true, 1 to 3 English words ONLY, suitable as a stock photo search query (no punctuation, no quotes). If show_images is false, use empty string "".
"""


def _parse_json_obj(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        raw = m.group(0)
    return json.loads(raw)


def run_unsplash_intent_agent(assistant_text: str) -> dict[str, Any]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    text = (assistant_text or "").strip()[:4000]
    if not text:
        return {"show_images": False, "keyword": ""}

    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": text},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        data = _parse_json_obj(raw)
    except json.JSONDecodeError:
        return {"show_images": False, "keyword": ""}

    show = bool(data.get("show_images"))
    kw = str(data.get("keyword") or "").strip()
    kw = re.sub(r"[^\w\s-]", "", kw)
    kw = re.sub(r"\s+", " ", kw).strip()
    parts = kw.split()[:3]
    kw = " ".join(parts)

    if show and not kw:
        show = False

    return {"show_images": show, "keyword": kw if show else ""}
