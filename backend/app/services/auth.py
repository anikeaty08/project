from __future__ import annotations

import hashlib
import secrets

from fastapi import Header, HTTPException

from app.models.chat import ChatSession


def new_owner_token() -> str:
    return secrets.token_urlsafe(32)


def hash_owner_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_owner_token(session: ChatSession, token: str | None) -> None:
    expected = session.owner_token_hash
    if not expected:
        return
    if not token or hash_owner_token(token) != expected:
        raise HTTPException(status_code=403, detail="Invalid session owner token")


def owner_header(x_session_owner: str | None = Header(default=None)) -> str | None:
    return x_session_owner
