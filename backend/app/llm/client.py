from __future__ import annotations

from typing import Any

from openai import OpenAI, OpenAIError

from app.config import settings


def _require_api_key() -> None:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")


def complete_chat(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    response_format: dict[str, str] | None = None,
) -> str:
    _require_api_key()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format:
        kwargs["response_format"] = response_format
    client = OpenAI(api_key=settings.openai_api_key)
    try:
        completion = client.chat.completions.create(**kwargs)
    except OpenAIError as e:
        raise ValueError(f"LLM request failed: {e.__class__.__name__}") from e
    return completion.choices[0].message.content or ""


def complete_json(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
) -> str:
    return complete_chat(
        model=model,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"},
    )
