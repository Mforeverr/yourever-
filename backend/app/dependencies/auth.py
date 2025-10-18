# Author: Codex (Senior Frontend Developer)
# Date: 2025-10-11
# Role: Backend integration liaison

"""
FastAPI dependency that validates Supabase-issued JWT bearer tokens.

The frontend (Next.js) attaches `Authorization: Bearer <token>` to every API call.
We validate the token against the Supabase JWT secret and expose a strongly-typed
principal object downstream so routers can enforce tenant-level permissions.
"""

from functools import lru_cache
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pydantic import BaseModel

http_bearer = HTTPBearer(auto_error=False)


class CurrentPrincipal(BaseModel):
    """Represents the authenticated Supabase user hitting the API."""

    id: str
    email: Optional[str] = None
    role: Optional[str] = None
    claims: Optional["TokenClaims"] = None


class TokenClaims(BaseModel):
    """Normalized snapshot of Supabase JWT claims for downstream consumers."""

    subject: str
    expires_at: Optional[datetime] = None
    issued_at: Optional[datetime] = None
    session_id: Optional[str] = None
    audience: Optional[str] = None
    provider: str = "supabase"
    raw: dict[str, Any] = {}


class _SupabaseConfig(BaseModel):
    jwt_secret: str
    audience: Optional[str] = None


@lru_cache
def _get_supabase_config() -> _SupabaseConfig:
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise RuntimeError("SUPABASE_JWT_SECRET is not configured")

    audience = os.getenv("SUPABASE_JWT_AUDIENCE")
    return _SupabaseConfig(jwt_secret=secret, audience=audience)


def _decode_token(token: str) -> dict:
    config = _get_supabase_config()
    try:
        return jwt.decode(
            token,
            config.jwt_secret,
            algorithms=["HS256"],
            audience=config.audience,
            options={"verify_aud": config.audience is not None},
        )
    except jwt.ExpiredSignatureError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from error
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from error


async def require_current_principal(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> CurrentPrincipal:
    """
    FastAPI dependency that resolves the authenticated principal.

    Raises:
        HTTPException(401): when the bearer token is missing/invalid/expired.
    """

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    token_payload = _decode_token(credentials.credentials)
    subject = token_payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    def _parse_timestamp(value: Any) -> Optional[datetime]:
        if value is None:
            return None
        try:
            # Supabase emits numeric timestamps in seconds
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        except (TypeError, ValueError):
            return None

    claims = TokenClaims(
        subject=str(subject),
        expires_at=_parse_timestamp(token_payload.get("exp")),
        issued_at=_parse_timestamp(token_payload.get("iat")),
        session_id=token_payload.get("session_id") or token_payload.get("sid"),
        audience=token_payload.get("aud"),
        raw={key: value for key, value in token_payload.items()},
    )

    return CurrentPrincipal(
        id=str(subject),
        email=token_payload.get("email"),
        role=token_payload.get("role"),
        claims=claims,
    )
