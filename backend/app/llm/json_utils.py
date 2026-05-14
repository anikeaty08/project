from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

ModelT = TypeVar("ModelT", bound=BaseModel)


def parse_json_object(raw: str) -> dict[str, Any]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", raw.strip())
        if not match:
            raise
        data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise json.JSONDecodeError("Expected JSON object", raw, 0)
    return data


def validate_model(model_type: type[ModelT], data: dict[str, Any]) -> ModelT:
    validator = getattr(model_type, "model_validate", None)
    if validator is not None:
        return validator(data)
    return model_type.parse_obj(data)


def parse_model_or_fallback(
    model_type: type[ModelT],
    raw: str,
    fallback: ModelT,
) -> ModelT:
    try:
        return validate_model(model_type, parse_json_object(raw))
    except (json.JSONDecodeError, ValidationError, ValueError, TypeError):
        return fallback
