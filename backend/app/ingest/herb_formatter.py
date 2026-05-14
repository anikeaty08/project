from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class HerbField:
    key: str
    label: str
    skip_empty: bool = True
    join_with: str = ", "


HERB_FIELDS = (
    HerbField("name", "Herb name"),
    HerbField("link", "Reference link"),
    HerbField("preview", "Overview"),
    HerbField("pacify", "Pacifies (doshas)"),
    HerbField("aggravate", "Aggravates (doshas)"),
    HerbField("tridosha", "Balances all doshas (tridosha)", skip_empty=False),
    HerbField("rasa", "Rasa"),
    HerbField("guna", "Guna"),
    HerbField("virya", "Virya"),
    HerbField("vipaka", "Vipaka"),
    HerbField("prabhav", "Prabhava / key actions"),
)


def herb_record_to_document(record: dict[str, Any]) -> str:
    lines: list[str] = []
    for field in HERB_FIELDS:
        value = record.get(field.key)
        if _is_empty(value) and field.skip_empty:
            continue
        lines.append(f"{field.label}: {_render_value(value, field)}")
    return "\n".join(lines)


def _is_empty(value: Any) -> bool:
    if value is None or value == "":
        return True
    if isinstance(value, (list, tuple, set, dict)) and not value:
        return True
    return False


def _render_value(value: Any, field: HerbField) -> str:
    if isinstance(value, (list, tuple, set)):
        return field.join_with.join(str(x) for x in value)
    if value is None:
        return ""
    return str(value)
