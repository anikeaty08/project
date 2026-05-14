from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from collections.abc import Iterator

logger = logging.getLogger("app.orchestrator")


def new_trace_id() -> str:
    return uuid.uuid4().hex


@contextmanager
def traced_stage(trace_id: str, session_id: object, stage: str) -> Iterator[None]:
    start = time.perf_counter()
    logger.info(
        "stage_start",
        extra={"trace_id": trace_id, "session_id": str(session_id), "stage": stage},
    )
    try:
        yield
    except Exception as exc:
        logger.exception(
            "stage_failed",
            extra={
                "trace_id": trace_id,
                "session_id": str(session_id),
                "stage": stage,
                "error_type": exc.__class__.__name__,
            },
        )
        raise
    finally:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info(
            "stage_end",
            extra={
                "trace_id": trace_id,
                "session_id": str(session_id),
                "stage": stage,
                "elapsed_ms": elapsed_ms,
            },
        )


def safe_error(exc: Exception) -> str:
    return f"{exc.__class__.__name__}: {str(exc)[:300]}"
