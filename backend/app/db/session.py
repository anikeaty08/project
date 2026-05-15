from __future__ import annotations

from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

_engine = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set")
        _engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            echo=False,
        )
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


def get_session_factory():
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    if not settings.database_url:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Set DATABASE_URL (see .env.example).",
        )
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables if DATABASE_URL is configured."""
    if not settings.database_url:
        return
    from app.models import chat, session_upload, prakriti  # noqa: F401

    from app.db.base import Base

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _ensure_added_columns(engine)


def _ensure_added_columns(engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    dialect = engine.dialect.name

    def has_column(table: str, column: str) -> bool:
        if table not in existing_tables:
            return False
        return column in {c["name"] for c in inspector.get_columns(table)}

    type_map = {
        "string": "TEXT" if dialect == "sqlite" else "VARCHAR(128)",
        "text": "TEXT",
        "datetime": "TIMESTAMP" if dialect != "sqlite" else "DATETIME",
    }
    additions = [
        ("chat_sessions", "owner_token_hash", type_map["string"]),
        ("chat_sessions", "clerk_user_id", type_map["string"]),
        ("session_uploads", "status", type_map["string"]),
        ("session_uploads", "processing_error", type_map["text"]),
        ("session_uploads", "processed_at", type_map["datetime"]),
        ("session_uploads", "trace_id", type_map["string"]),
    ]
    with engine.begin() as conn:
        for table, column, col_type in additions:
            if has_column(table, column):
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
        if "session_uploads" in existing_tables and has_column("session_uploads", "status"):
            conn.execute(
                text("UPDATE session_uploads SET status = 'completed' WHERE status IS NULL")
            )
