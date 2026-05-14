from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)
_client: Any | None = None
_redis_failed: bool = False


def _get_client():
    global _client, _redis_failed
    if not settings.redis_url:
        return None
    if _redis_failed:
        return None
    if _client is not None:
        return _client
    try:
        import redis

        c = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30,
        )
        c.ping()
        _client = c
        return _client
    except Exception as e:
        logger.warning("Redis unavailable (%s); embedding cache disabled", e)
        _redis_failed = True
        return None


def embedding_cache_key(text: str) -> str:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return f"emb:{h}"


def get_cached_embedding(text: str) -> list[float] | None:
    r = _get_client()
    if r is None:
        return None
    try:
        raw = r.get(embedding_cache_key(text))
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_cached_embedding(text: str, vector: list[float]) -> None:
    r = _get_client()
    if r is None:
        return
    try:
        r.setex(
            embedding_cache_key(text),
            settings.embedding_cache_ttl_seconds,
            json.dumps(vector),
        )
    except Exception as e:
        logger.debug("Redis setex failed: %s", e)
