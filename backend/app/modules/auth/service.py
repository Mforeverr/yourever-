"""Domain service orchestrating Supabase session enrichment."""

from __future__ import annotations

import asyncio
import hashlib
import time
from typing import Any, Dict, Optional

from fastapi import Request

from ...dependencies import CurrentPrincipal
from ..users.service import UserService
from ..users.schemas import WorkspaceUser
from .repository import AuthEvent, AuthEventRepository
from .schemas import AuthSessionMetadata, AuthSessionSnapshot


class AuthSessionCache:
    """In-memory TTL cache for auth session snapshots."""

    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, AuthSessionSnapshot]] = {}
        self._lock = asyncio.Lock()

    async def get(self, cache_key: str) -> Optional[AuthSessionSnapshot]:
        async with self._lock:
            entry = self._store.get(cache_key)
            if not entry:
                return None
            expires_at, snapshot = entry
            if time.monotonic() >= expires_at:
                self._store.pop(cache_key, None)
                return None
            return snapshot

    async def set(self, cache_key: str, snapshot: AuthSessionSnapshot) -> None:
        async with self._lock:
            self._store[cache_key] = (time.monotonic() + self._ttl, snapshot)

    async def clear(self, cache_key: str) -> None:
        async with self._lock:
            self._store.pop(cache_key, None)


class AuthService:
    """Coordinates auth metadata, feature flags, and audit events."""

    def __init__(
        self,
        user_service: UserService,
        event_repository: AuthEventRepository,
        cache: Optional[AuthSessionCache] = None,
    ) -> None:
        self._user_service = user_service
        self._events = event_repository
        self._cache = cache or AuthSessionCache()

    async def _resolve_feature_flags(self, user: WorkspaceUser | None) -> Dict[str, bool]:
        # Placeholder for future feature-flag platform integration.
        if not user:
            return {}
        return {}

    @staticmethod
    def _cache_key(principal: CurrentPrincipal) -> str:
        session_id = principal.claims.session_id if principal.claims else None
        return f"{principal.id}:{session_id or 'anonymous'}"

    async def _build_snapshot(self, principal: CurrentPrincipal) -> AuthSessionSnapshot:
        user = await self._user_service.get_current_user(principal)
        feature_flags = await self._resolve_feature_flags(user)
        claims = principal.claims
        metadata = AuthSessionMetadata(
            userId=principal.id,
            sessionId=claims.session_id if claims else None,
            issuedAt=claims.issued_at if claims else None,
            expiresAt=claims.expires_at if claims else None,
            audience=claims.audience if claims else None,
            roles=[role for role in [principal.role] if role],
            claims=claims.raw if claims else {},
        )
        snapshot = AuthSessionSnapshot(user=user, session=metadata, featureFlags=feature_flags)
        return snapshot

    async def get_session_snapshot(self, principal: CurrentPrincipal) -> AuthSessionSnapshot:
        cache_key = self._cache_key(principal)
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        snapshot = await self._build_snapshot(principal)
        await self._cache.set(cache_key, snapshot)
        return snapshot

    async def refresh_session(self, principal: CurrentPrincipal) -> AuthSessionSnapshot:
        cache_key = self._cache_key(principal)
        await self._cache.clear(cache_key)
        snapshot = await self._build_snapshot(principal)
        await self._cache.set(cache_key, snapshot)
        return snapshot

    async def _record_event(
        self,
        principal: CurrentPrincipal,
        event_type: str,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        client_host = request.client.host if request and request.client else None
        ip_hash = None
        if client_host:
            digest = hashlib.sha256(client_host.encode("utf-8"))
            ip_hash = digest.hexdigest()

        user_agent = request.headers.get("user-agent") if request else None
        claims = principal.claims or None
        claims_metadata = {
            "session_id": claims.session_id if claims else None,
            "audience": claims.audience if claims else None,
            "expires_at": claims.expires_at.isoformat() if claims and claims.expires_at else None,
        }
        payload = {
            **(metadata or {}),
            **{k: v for k, v in claims_metadata.items() if v is not None},
        }
        event = AuthEvent(
            user_id=principal.id,
            event_type=event_type,
            ip_hash=ip_hash,
            user_agent=user_agent,
            metadata=payload,
        )
        await self._events.record(event)

    async def track_logout(self, principal: CurrentPrincipal, request: Optional[Request] = None) -> None:
        await self._record_event(principal, "auth.logout", request)
        await self._cache.clear(self._cache_key(principal))

    async def track_refresh(
        self,
        principal: CurrentPrincipal,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        await self._record_event(principal, "auth.refresh", request, metadata)

