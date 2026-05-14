from __future__ import annotations

from typing import Any

PROMPT_SECTIONS = (
    "## Role / Domain",
    "## Primary Goal",
    "## Behavior Rules",
    "## Task Workflow",
    "## Special Instructions",
    "## Output Format",
)


def has_required_prompt_sections(prompt: str) -> bool:
    return all(section in prompt for section in PROMPT_SECTIONS)


def message(role: str, content: Any) -> dict[str, Any]:
    return {"role": role, "content": content}
