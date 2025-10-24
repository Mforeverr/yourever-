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
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from ..core.config import get_settings
from ..db.session import get_db_session

http_bearer = HTTPBearer(auto_error=False)


class TokenClaims(BaseModel):
    """Normalized snapshot of Supabase JWT claims for downstream consumers."""

    subject: str
    expires_at: Optional[datetime] = None
    issued_at: Optional[datetime] = None
    session_id: Optional[str] = None
    audience: Optional[str] = None
    provider: str = "supabase"
    raw: dict[str, Any] = {}


class CurrentPrincipal(BaseModel):
    """Represents the authenticated Supabase user hitting the API."""

    model_config = ConfigDict(extra="ignore")

    id: str
    email: Optional[str] = None
    role: Optional[str] = None
    claims: Optional[TokenClaims] = None
    active_org_id: Optional[str] = Field(
        default=None, description="Organization scope supplied via JWT claims."
    )
    active_division_id: Optional[str] = Field(
        default=None, description="Division scope supplied via JWT claims."
    )
    org_ids: List[str] = Field(
        default_factory=list, description="All organization identifiers scoped to the principal."
    )
    division_ids: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Division identifiers keyed by organization id for downstream enforcement.",
    )
    scope_claims: Dict[str, Any] = Field(
        default_factory=dict, description="Raw scope claim payload preserved for auditing."
    )


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


def _get_first(mapping: Dict[str, Any], keys: List[str]) -> Any:
    for key in keys:
        if key in mapping:
            return mapping[key]
    return None


def _coerce_optional_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        trimmed = value.strip()
        return trimmed or None
    try:
        text = str(value)
    except Exception:
        return None
    trimmed = text.strip()
    return trimmed or None


def _to_string_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        candidate = value.strip()
        return [candidate] if candidate else []
    if isinstance(value, (list, tuple, set)):
        results: List[str] = []
        for item in value:
            coerced = _coerce_optional_str(item)
            if coerced:
                results.append(coerced)
        return results
    coerced = _coerce_optional_str(value)
    return [coerced] if coerced else []


def _normalize_division_ids(value: Any) -> Dict[str, List[str]]:
    if not isinstance(value, dict):
        return {}

    normalized: Dict[str, List[str]] = {}
    for org_key, divisions in value.items():
        key = _coerce_optional_str(org_key)
        if not key:
            continue

        normalized_divisions = _to_string_list(divisions)
        if normalized_divisions:
            normalized[key] = normalized_divisions
    return normalized


def _collect_scope_candidates(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    containers: List[Dict[str, Any]] = []
    seen: set[int] = set()

    def enqueue(candidate: Any) -> None:
        if not isinstance(candidate, dict):
            return
        candidate_id = id(candidate)
        if candidate_id in seen:
            return
        seen.add(candidate_id)
        containers.append(candidate)
        nested = candidate.get("yourever")
        if isinstance(nested, dict):
            enqueue(nested)

    enqueue(payload)
    enqueue(payload.get("app_metadata"))
    enqueue(payload.get("user_metadata"))

    return containers


def _extract_scope_claims(token_payload: Dict[str, Any]) -> Dict[str, Any]:
    scope_payload: Dict[str, Any] = {}
    for container in _collect_scope_candidates(token_payload):
        for key in ("yourever_scope", "scope", "claims"):
            scoped = container.get(key)
            if isinstance(scoped, dict):
                scope_payload.update(scoped)
        for key in (
            "org_id",
            "orgId",
            "division_id",
            "divisionId",
            "org_ids",
            "orgIds",
            "division_ids",
            "divisionIds",
        ):
            if key in container and key not in scope_payload:
                scope_payload[key] = container[key]
    return scope_payload


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    try:
        # Supabase emits numeric timestamps in seconds
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    except (TypeError, ValueError):
        return None


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

    scope_claims = _extract_scope_claims(token_payload)
    active_org_id = _coerce_optional_str(
        _get_first(scope_claims, ["org_id", "orgId", "active_org_id", "activeOrgId"])
    )
    active_division_id = _coerce_optional_str(
        _get_first(
            scope_claims,
            ["division_id", "divisionId", "active_division_id", "activeDivisionId"],
        )
    )
    org_ids = _to_string_list(_get_first(scope_claims, ["org_ids", "orgIds"]))
    division_ids = _normalize_division_ids(
        _get_first(scope_claims, ["division_ids", "divisionIds"])
    )

    if not org_ids:
        settings = get_settings()
        # Attempt to hydrate scope claims from the database when available
        try:
            async with get_db_session() as session:
                membership_query = text(
                    """
                    SELECT om.org_id
                    FROM public.org_memberships AS om
                    WHERE om.user_id = :user_id
                    """
                )
                membership_result = await session.execute(membership_query, {"user_id": subject})
                membership_rows = membership_result.mappings().all()

                if membership_rows:
                    db_org_ids = [str(row["org_id"]) for row in membership_rows]
                    divisions_query = text(
                        """
                        SELECT div.org_id, div.id
                        FROM public.divisions AS div
                        WHERE div.org_id = :org_id
                        """
                    )
                    db_division_ids: Dict[str, List[str]] = {}
                    for org_id in db_org_ids:
                        result = await session.execute(divisions_query, {"org_id": org_id})
                        db_division_ids[org_id] = [str(row["id"]) for row in result.mappings()]

                    org_ids = db_org_ids
                    division_ids = db_division_ids
                    if not active_org_id and org_ids:
                        active_org_id = org_ids[0]
                    if not active_division_id and active_org_id:
                        first_divisions = division_ids.get(active_org_id)
                        if first_divisions:
                            active_division_id = first_divisions[0]
                    scope_claims.setdefault("org_ids", org_ids)
                    scope_claims.setdefault("division_ids", division_ids)
        except Exception:
            # Database hydration is best-effort; swallow errors to avoid masking auth failures.
            pass

    if not org_ids:
        settings = get_settings()
        if settings.enable_mock_organization_fallback:
            try:
                from ..modules.organizations.mock_data import build_fallback_organizations

                temp_principal = CurrentPrincipal(
                    id=str(subject),
                    email=token_payload.get("email"),
                    role=token_payload.get("role"),
                    claims=None,
                    active_org_id=None,
                    active_division_id=None,
                    org_ids=[],
                    division_ids={},
                    scope_claims={},
                )

                fallback_orgs = build_fallback_organizations(temp_principal)
                if fallback_orgs:
                    org_ids = [organization.id for organization in fallback_orgs]
                    division_ids = {
                        organization.id: [division.id for division in organization.divisions]
                        for organization in fallback_orgs
                    }
                    if not active_org_id:
                        active_org_id = org_ids[0]
                    if not active_division_id:
                        first_divisions = division_ids.get(active_org_id)
                        if first_divisions:
                            active_division_id = first_divisions[0]
                    scope_claims.setdefault("org_ids", org_ids)
                    scope_claims.setdefault("division_ids", division_ids)
            except Exception:
                # Fallback enrichment is best-effort; ignore unexpected errors.
                pass

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
        active_org_id=active_org_id,
        active_division_id=active_division_id,
        org_ids=org_ids,
        division_ids=division_ids,
        scope_claims=scope_claims,
    )
