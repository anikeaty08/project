from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

from tavily import TavilyClient

from app.config import settings
from app.llm.agent_base import message
from app.llm.client import complete_json
from app.llm.json_utils import parse_model_or_fallback
from app.llm.schemas import PrescriptionVerifyResult

PROMPT_TEMPLATE = """## Role / Domain
You are a web-evidence synthesis agent for medication and prescription questions.

## Primary Goal
Summarize what public search results say while separating trusted-domain evidence from supplementary sources.

## Behavior Rules
- This is not medical advice; users must consult a licensed professional for decisions.
- Treat trusted-domain snippets as verified-reference facts only when they directly support a claim.
- Treat other domains as supplementary only.
- Do not invent citations, claims, or URLs.
- Clearly state limitations and uncertainty.

## Task Workflow
1. Read the search query and optional document context.
2. Review trusted-domain results.
3. Review other results.
4. Write a concise trusted summary when supported.
5. Write supplementary notes cautiously.
6. Return citations and limitations.

## Special Instructions
- Trusted domains for this run: {trusted_domains}
- If no trusted result supports a claim, leave verified_summary empty and explain limitations.

## Output Format
Return only JSON:
{{
  "verified_summary": string,
  "supplementary_notes": string,
  "trusted_citations": [{{"title": string, "url": string, "snippet": string}}],
  "other_citations": [{{"title": string, "url": string, "snippet": string}}],
  "limitations": string
}}
"""

PROMPT = PROMPT_TEMPLATE.format(trusted_domains="{trusted_domains}")
SEARCH_QUERY_MAX_CHARS = 400
DOCUMENT_CONTEXT_MAX_CHARS = 3000
RESULT_SNIPPET_MAX_CHARS = 600


def _trusted_domain_set() -> set[str]:
    return {
        p.strip().lower()
        for p in settings.tavily_trusted_domains.split(",")
        if p.strip()
    }


def _host(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_trusted_url(url: str, trusted: set[str]) -> bool:
    host = _host(url)
    return bool(host) and any(host == d or host.endswith("." + d) for d in trusted)


def _format_result_line(r: dict[str, Any]) -> str:
    url = str(r.get("url") or "")
    title = str(r.get("title") or "")
    content = str(r.get("content") or r.get("snippet") or "")
    return f"- {title}\n  URL: {url}\n  Snippet: {content[:RESULT_SNIPPET_MAX_CHARS]}"


def run(*, search_query: str, context_from_document: str | None = None) -> dict[str, Any]:
    if not settings.tavily_api_key:
        raise ValueError("TAVILY_API_KEY is not set")
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    trusted_list = sorted(_trusted_domain_set())
    trusted_set = set(trusted_list)
    client = TavilyClient(api_key=settings.tavily_api_key)
    query = search_query[:SEARCH_QUERY_MAX_CHARS]

    trusted_results: list[dict[str, Any]] = []
    if trusted_list:
        trusted_results = (client.search(
            query=query,
            search_depth="advanced",
            max_results=6,
            include_domains=trusted_list,
        ).get("results") or [])

    broad_results = (client.search(
        query=query,
        search_depth="advanced",
        max_results=6,
        include_domains=None,
    ).get("results") or [])

    seen_urls: set[str] = set()
    trusted_blocks: list[str] = []
    other_blocks: list[str] = []
    for result in trusted_results:
        url = str(result.get("url") or "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            trusted_blocks.append(_format_result_line(result))

    for result in broad_results:
        url = str(result.get("url") or "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)
        if _is_trusted_url(url, trusted_set):
            trusted_blocks.append(_format_result_line(result))
        else:
            other_blocks.append(_format_result_line(result))

    user_block = f"SEARCH_QUERY:\n{search_query}\n"
    if context_from_document:
        user_block += f"\nDOCUMENT_CONTEXT:\n{context_from_document[:DOCUMENT_CONTEXT_MAX_CHARS]}\n"
    user_block += "\nTRUSTED_DOMAIN_RESULTS:\n" + (
        "\n".join(trusted_blocks) if trusted_blocks else "(no results from trusted domains)"
    )
    user_block += "\n\nOTHER_RESULTS:\n" + ("\n".join(other_blocks) if other_blocks else "(none)")

    raw = complete_json(
        model=settings.openai_chat_model,
        messages=[
            message(
                "system",
                PROMPT_TEMPLATE.format(
                    trusted_domains=", ".join(trusted_list) if trusted_list else "(none configured)"
                ),
            ),
            message("user", user_block),
        ],
        temperature=0.2,
    )
    result = parse_model_or_fallback(
        PrescriptionVerifyResult,
        raw,
        PrescriptionVerifyResult(
            supplementary_notes=raw[:2000],
            limitations="Could not parse model output.",
        ),
    )
    result.tavily_raw_result_count = len(trusted_results) + len(broad_results)
    return result.model_dump()


def to_prompt_block(verify: dict[str, Any]) -> str:
    lines = [
        "WEB_VERIFICATION (informational only, not medical advice):",
        f"Verified (trusted domains): {verify.get('verified_summary', '')}",
        f"Supplementary: {verify.get('supplementary_notes', '')}",
        f"Limitations: {verify.get('limitations', '')}",
    ]
    return "\n".join(lines).strip()
