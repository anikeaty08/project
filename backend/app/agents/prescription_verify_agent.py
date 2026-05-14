from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlparse

from openai import OpenAI
from tavily import TavilyClient

from app.config import settings

VERIFY_SYSTEM = """You synthesize public web search results about medications and prescriptions.

Rules:
- This is NOT medical advice. Say the user must consult a licensed professional for decisions.
- Treat snippets whose URL hostname is in TRUSTED_DOMAINS as "verified_reference" facts when they directly support a claim.
- Other domains are "supplementary_only" — you may mention them cautiously but do not present them as authoritative.
- Output ONLY valid JSON with keys:
  - verified_summary: string (what trusted sources suggest, or empty if none)
  - supplementary_notes: string (other results, clearly labeled as non-authoritative in prose)
  - trusted_citations: array of { "title": string, "url": string, "snippet": string }
  - other_citations: array of { "title": string, "url": string, "snippet": string }
  - limitations: string (what was not found or uncertain)
"""


def _trusted_domain_set() -> set[str]:
    parts = [p.strip().lower() for p in settings.tavily_trusted_domains.split(",")]
    return {p for p in parts if p}


def _host(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_trusted_url(url: str, trusted: set[str]) -> bool:
    host = _host(url)
    if not host:
        return False
    for d in trusted:
        if host == d or host.endswith("." + d):
            return True
    return False


def _parse_json_obj(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    m = re.search(r"\{[\s\S]*\}", raw)
    if m:
        raw = m.group(0)
    return json.loads(raw)


def run_prescription_verify_agent(
    *,
    search_query: str,
    context_from_document: str | None = None,
) -> dict[str, Any]:
    if not settings.tavily_api_key:
        raise ValueError("TAVILY_API_KEY is not set")
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    trusted = list(_trusted_domain_set())
    client_tv = TavilyClient(api_key=settings.tavily_api_key)
    search = client_tv.search(
        query=search_query[:400],
        search_depth="advanced",
        max_results=8,
        include_domains=trusted if trusted else None,
    )

    results = search.get("results") or []
    trusted_set = _trusted_domain_set()
    trusted_blocks: list[str] = []
    other_blocks: list[str] = []
    for r in results:
        url = str(r.get("url") or "")
        title = str(r.get("title") or "")
        content = str(r.get("content") or r.get("snippet") or "")
        line = f"- {title}\n  URL: {url}\n  Snippet: {content[:600]}"
        if _is_trusted_url(url, trusted_set):
            trusted_blocks.append(line)
        else:
            other_blocks.append(line)

    user_block = f"SEARCH_QUERY:\n{search_query}\n"
    if context_from_document:
        user_block += f"\nDOCUMENT_CONTEXT (may be partial):\n{context_from_document[:3000]}\n"
    user_block += "\nTRUSTED_DOMAIN_RESULTS:\n" + (
        "\n".join(trusted_blocks) if trusted_blocks else "(no results from trusted domains)"
    )
    user_block += "\n\nOTHER_RESULTS:\n" + (
        "\n".join(other_blocks) if other_blocks else "(none)"
    )

    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": VERIFY_SYSTEM + f"\nTRUSTED_DOMAINS: {', '.join(trusted)}"},
            {"role": "user", "content": user_block},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        out = _parse_json_obj(raw)
    except json.JSONDecodeError:
        out = {
            "verified_summary": "",
            "supplementary_notes": raw[:2000],
            "trusted_citations": [],
            "other_citations": [],
            "limitations": "Could not parse model output.",
        }

    for key in (
        "verified_summary",
        "supplementary_notes",
        "trusted_citations",
        "other_citations",
        "limitations",
    ):
        if key not in out:
            out[key] = [] if "citations" in key else ""

    if not isinstance(out.get("trusted_citations"), list):
        out["trusted_citations"] = []
    if not isinstance(out.get("other_citations"), list):
        out["other_citations"] = []

    out["tavily_raw_result_count"] = len(results)
    return out


def verify_result_to_prompt_block(verify: dict[str, Any]) -> str:
    lines = [
        "WEB_VERIFICATION (informational only, not medical advice):",
        f"Verified (trusted domains): {verify.get('verified_summary', '')}",
        f"Supplementary: {verify.get('supplementary_notes', '')}",
        f"Limitations: {verify.get('limitations', '')}",
    ]
    return "\n".join(lines).strip()
