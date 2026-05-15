from __future__ import annotations

import hashlib
import logging
import secrets
import time
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import settings
from app.models.chat import ChatSession

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthUser:
    clerk_user_id: str
    claims: dict[str, Any]


_jwks_client: PyJWKClient | None = None
_jwks_client_key: tuple[str, str] | None = None


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


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return token.strip()


def _jwks_url() -> str:
    if settings.clerk_jwks_url:
        return settings.clerk_jwks_url
    if settings.clerk_issuer:
        return settings.clerk_issuer.rstrip("/") + "/.well-known/jwks.json"
    raise HTTPException(status_code=503, detail="Clerk auth is not configured")


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_client_key
    key = (_jwks_url(), settings.clerk_issuer)
    if _jwks_client is None or _jwks_client_key != key:
        _jwks_client = PyJWKClient(key[0], cache_keys=True, lifespan=300)
        _jwks_client_key = key
    return _jwks_client


def verify_clerk_token(token: str) -> AuthUser:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        options = {"require": ["exp", "iat", "sub"]}
        kwargs: dict[str, Any] = {
            "key": signing_key.key,
            "algorithms": ["RS256"],
            "options": options,
            "leeway": max(0, settings.clerk_jwt_leeway_seconds),
        }
        if settings.clerk_issuer:
            kwargs["issuer"] = settings.clerk_issuer.rstrip("/")
        if settings.clerk_audience:
            kwargs["audience"] = settings.clerk_audience
        else:
            kwargs["options"] = {**options, "verify_aud": False}
        claims = jwt.decode(token, **kwargs)
        sub = str(claims.get("sub") or "").strip()
        if not sub:
            raise HTTPException(status_code=401, detail="Token is missing subject")
        return AuthUser(clerk_user_id=sub, claims=claims)
    except HTTPException:
        raise
    except Exception as exc:
        logger.info("Clerk token verification failed: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired sign-in session",
        ) from exc


def require_clerk_user(
    authorization: str | None = Header(default=None),
) -> AuthUser:
    return verify_clerk_token(_bearer_token(authorization))


def verify_session_user(session: ChatSession, user: AuthUser) -> None:
    owner = session.clerk_user_id
    if not owner:
        raise HTTPException(status_code=403, detail="Session is not linked to a Clerk user")
    if owner != user.clerk_user_id:
        raise HTTPException(status_code=403, detail="Session does not belong to this user")
