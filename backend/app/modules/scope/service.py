"""Domain service responsible for orchestrating scope persistence and caching."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Dict, Optional

from fastapi import HTTPException, Request, status

from ...dependencies import CurrentPrincipal
from ..users.schemas import WorkspaceDivision, WorkspaceOrganization, WorkspaceUser
from ..users.service import UserService
from .repository import ScopePreference, ScopePreferenceRepository
from .schemas import ScopeContext, ScopeState, ScopeUpdateRequest

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class ScopeChangeEvent:
    """Structured payload describing a scope transition."""

    user_id: str
    previous: Optional[ScopeContext]
    current: Optional[ScopeContext]
    correlation_id: str
    reason: str
    ip_hash: Optional[str]
    user_agent: Optional[str]
    occurred_at: datetime


class ScopeEventPublisher:
    """Interface for publishing scope events."""

    async def publish_scope_changed(self, event: ScopeChangeEvent) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class LoggingScopeEventPublisher(ScopeEventPublisher):
    """Default publisher that records events to application logs."""

    async def publish_scope_changed(self, event: ScopeChangeEvent) -> None:
        logger.info(
            "scope.changed",
            extra={
                "user_id": event.user_id,
                "correlation_id": event.correlation_id,
                "reason": event.reason,
                "ip_hash": event.ip_hash,
                "user_agent": event.user_agent,
                "previous": event.previous.model_dump() if event.previous else None,
                "current": event.current.model_dump() if event.current else None,
                "occurred_at": event.occurred_at.isoformat(),
            },
        )


class ScopeCache:
    """Simple in-process TTL cache for scope state."""

    def __init__(self, ttl_seconds: int = 120) -> None:
        self._ttl = ttl_seconds
        self._store: Dict[str, tuple[float, ScopeState]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[ScopeState]:
        async with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, payload = entry
            if time.monotonic() >= expires_at:
                self._store.pop(key, None)
                return None
            return payload.model_copy(deep=True)

    async def set(self, key: str, payload: ScopeState) -> None:
        async with self._lock:
            self._store[key] = (time.monotonic() + self._ttl, payload.model_copy(deep=True))

    async def clear(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)


class ScopeRateLimiter:
    """Fixed-window rate limiter guarding scope transitions."""

    def __init__(self, max_events: int, window_seconds: int) -> None:
        self._max_events = max_events
        self._window = window_seconds
        self._events: Dict[str, Deque[float]] = {}
        self._lock = asyncio.Lock()

    async def allow(self, user_id: str) -> bool:
        async with self._lock:
            now = time.monotonic()
            queue = self._events.setdefault(user_id, deque())
            while queue and now - queue[0] > self._window:
                queue.popleft()
            if len(queue) >= self._max_events:
                return False
            queue.append(now)
            return True


class ScopeService:
    """Coordinates scope retrieval, persistence, caching, and auditing."""

    def __init__(
        self,
        user_service: UserService,
        repository: ScopePreferenceRepository,
        cache: Optional[ScopeCache] = None,
        event_publisher: Optional[ScopeEventPublisher] = None,
        rate_limiter: Optional[ScopeRateLimiter] = None,
    ) -> None:
        self._user_service = user_service
        self._repository = repository
        self._cache = cache or ScopeCache()
        self._publisher = event_publisher or LoggingScopeEventPublisher()
        self._rate_limiter = rate_limiter or ScopeRateLimiter(max_events=30, window_seconds=60)

    async def get_scope(self, principal: CurrentPrincipal) -> ScopeState:
        cache_key = principal.id
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        started_at = time.perf_counter()
        user = await self._user_service.get_current_user(principal)
        preference = await self._repository.get_preference(user.id)
        state = self._build_state(user, preference)
        await self._cache.set(cache_key, state)

        elapsed_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "scope.resolved",
            extra={"user_id": principal.id, "latency_ms": round(elapsed_ms, 2)},
        )
        return state

    async def update_scope(
        self,
        principal: CurrentPrincipal,
        payload: ScopeUpdateRequest,
        *,
        request: Optional[Request] = None,
        correlation_id: str,
    ) -> ScopeState:
        if not await self._rate_limiter.allow(principal.id):
            logger.warning(
                "scope.rate_limited",
                extra={"user_id": principal.id, "reason": "too-many-requests"},
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Scope changes are temporarily rate limited. Please retry shortly.",
            )

        user = await self._user_service.get_current_user(principal)
        previous_preference = await self._repository.get_preference(user.id)
        previous_state = self._build_state(user, previous_preference)

        organization = self._find_organization(user, payload.orgId)
        if not organization:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

        division = self._resolve_division(organization, payload.divisionId)
        if payload.divisionId and not division:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Division not found")

        preference = await self._repository.upsert_preference(
            user_id=user.id,
            org_id=organization.id,
            division_id=division.id if division else None,
        )
        state = self._build_state(user, preference)

        await self._cache.set(principal.id, state)

        ip_hash = None
        user_agent = None
        if request and request.client and request.client.host:
            digest = hashlib.sha256(request.client.host.encode("utf-8"))
            ip_hash = digest.hexdigest()
        if request:
            user_agent = request.headers.get("user-agent")

        event = ScopeChangeEvent(
            user_id=user.id,
            previous=previous_state.active,
            current=state.active,
            correlation_id=correlation_id,
            reason=payload.reason,
            ip_hash=ip_hash,
            user_agent=user_agent,
            occurred_at=datetime.now(timezone.utc),
        )
        await self._publisher.publish_scope_changed(event)

        logger.info(
            "scope.updated",
            extra={
                "user_id": principal.id,
                "org_id": organization.id,
                "division_id": division.id if division else None,
                "correlation_id": correlation_id,
                "reason": payload.reason,
            },
        )

        return state

    @staticmethod
    def _find_organization(user: WorkspaceUser, org_id: str) -> Optional[WorkspaceOrganization]:
        for organization in user.organizations:
            if organization.id == org_id:
                return organization
        return None

    @staticmethod
    def _resolve_division(
        organization: WorkspaceOrganization, desired_division_id: Optional[str]
    ) -> Optional[WorkspaceDivision]:
        if desired_division_id:
            for division in organization.divisions:
                if division.id == desired_division_id:
                    return division
            return None
        return organization.divisions[0] if organization.divisions else None

    @staticmethod
    def _compute_role(organization: WorkspaceOrganization, division: Optional[WorkspaceDivision]) -> Optional[str]:
        if division and division.userRole:
            return division.userRole
        return organization.userRole

    @staticmethod
    def _collect_permissions(org_role: Optional[str], division_role: Optional[str]) -> list[str]:
        permissions = {"scope:read"}
        normalized_org = (org_role or "").lower()
        normalized_division = (division_role or "").lower()

        if normalized_org in {"owner", "admin"}:
            permissions.update({"scope:manage", "org:manage"})
        elif normalized_org:
            permissions.add("org:view")

        if normalized_division in {"owner", "admin", "lead"}:
            permissions.update({"division:manage", "division:view"})
        elif normalized_division:
            permissions.add("division:view")

        return sorted(permissions)

    def _build_state(
        self, user: WorkspaceUser, preference: Optional[ScopePreference]
    ) -> ScopeState:
        organizations = user.organizations or []
        if not organizations:
            return ScopeState(
                userId=user.id,
                organizations=[],
                active=None,
                rememberedAt=None,
                cachedAt=datetime.now(timezone.utc),
            )

        active_org = None
        active_division = None
        remembered_at = None
        last_updated_at = None

        if preference:
            active_org = self._find_organization(user, preference.org_id)
            if active_org:
                active_division = self._resolve_division(active_org, preference.division_id)
                remembered_at = preference.remembered_at
                last_updated_at = preference.updated_at

        if not active_org:
            active_org = organizations[0]
            active_division = self._resolve_division(active_org, None)

        role = self._compute_role(active_org, active_division) if active_org else None
        division_role = active_division.userRole if active_division else None
        permissions = self._collect_permissions(active_org.userRole if active_org else None, division_role)

        active_context = None
        if active_org:
            active_context = ScopeContext(
                orgId=active_org.id,
                divisionId=active_division.id if active_division else None,
                role=role,
                divisionRole=division_role,
                permissions=permissions,
                lastUpdatedAt=last_updated_at,
            )

        return ScopeState(
            userId=user.id,
            organizations=organizations,
            active=active_context,
            rememberedAt=remembered_at,
            cachedAt=datetime.now(timezone.utc),
        )
