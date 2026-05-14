from __future__ import annotations

from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
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
    from app.models import chat  # noqa: F401

    from app.db.base import Base

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
