# Author: Eldrie (CTO Dev)
# Date: 2025-10-19
# Role: Backend

"""
Comprehensive scope guard utility module for backend API enforcement.

This module provides a centralized, production-ready scope enforcement system
that follows the Open/Closed Principle and integrates seamlessly with existing
authentication and authorization patterns.

Core capabilities:
- JWT scope extraction and validation
- Allow/deny decision functions with caching
- Structured error construction with machine-readable codes
- Organization and division access validation
- Audit logging for security violations
- Dependency injection support for services
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from fastapi import HTTPException, Request, status

from ..dependencies import CurrentPrincipal
from .errors import APIError
from .organization_resolver import get_organization_resolver, OrganizationResolver

logger = logging.getLogger(__name__)


class ScopeDecision(Enum):
    """Enumeration of scope guard decision types."""
    ALLOW = "allow"
    DENY = "deny"


class ScopeViolationType(Enum):
    """Standardized scope violation categories for machine-readable error codes."""
    ORGANIZATION_ACCESS_DENIED = "org_access_denied"
    DIVISION_ACCESS_DENIED = "division_access_denied"
    MISSING_ORGANIZATION_SCOPE = "missing_org_scope"
    MISSING_DIVISION_SCOPE = "missing_division_scope"
    INSUFFICIENT_PERMISSIONS = "insufficient_permissions"
    SCOPE_EXPIRED = "scope_expired"
    INVALID_SCOPE_FORMAT = "invalid_scope_format"
    CROSS_ORGANIZATION_ACCESS = "cross_org_access"
    CROSS_DIVISION_ACCESS = "cross_division_access"
    RATE_LIMITED = "scope_rate_limited"


@dataclass(frozen=True, slots=True)
class ScopeContext:
    """Immutable context representing a validated scope decision."""
    principal: CurrentPrincipal
    organization_id: Optional[str]
    division_id: Optional[str]
    permissions: Set[str]
    decision: ScopeDecision
    violation_type: Optional[ScopeViolationType] = None
    cached_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ttl_seconds: int = 300  # 5 minutes default cache


@dataclass(frozen=True, slots=True)
class ScopeViolationEvent:
    """Structured audit event for scope violations."""
    user_id: str
    violation_type: ScopeViolationType
    requested_org_id: Optional[str]
    requested_division_id: Optional[str]
    actual_org_ids: List[str]
    actual_division_ids: Dict[str, List[str]]
    permissions: Set[str]
    request_path: str
    request_method: str
    ip_hash: Optional[str]
    user_agent: Optional[str]
    correlation_id: Optional[str]
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ScopeCacheEntry:
    """Cache entry for scope validation decisions."""
    context: ScopeContext
    expires_at: float

    def is_expired(self) -> bool:
        return time.monotonic() >= self.expires_at


class ScopeCache:
    """TTL cache for scope validation decisions with async safety."""

    def __init__(self, max_size: int = 10000, cleanup_interval: int = 60) -> None:
        self._max_size = max_size
        self._cleanup_interval = cleanup_interval
        self._store: Dict[str, ScopeCacheEntry] = {}
        self._access_times: Dict[str, float] = {}
        self._lock = asyncio.Lock()
        self._last_cleanup = 0.0

    async def get(self, key: str) -> Optional[ScopeContext]:
        async with self._lock:
            await self._maybe_cleanup()

            entry = self._store.get(key)
            if not entry:
                return None

            if entry.is_expired():
                del self._store[key]
                self._access_times.pop(key, None)
                return None

            self._access_times[key] = time.monotonic()
            return entry.context

    async def set(self, key: str, context: ScopeContext) -> None:
        async with self._lock:
            await self._maybe_cleanup()

            # Evict if at capacity
            if len(self._store) >= self._max_size:
                await self._evict_lru()

            expires_at = time.monotonic() + context.ttl_seconds
            self._store[key] = ScopeCacheEntry(context, expires_at)
            self._access_times[key] = time.monotonic()

    async def clear(self, pattern: Optional[str] = None) -> None:
        async with self._lock:
            if pattern:
                keys_to_remove = [k for k in self._store.keys() if pattern in k]
                for key in keys_to_remove:
                    self._store.pop(key, None)
                    self._access_times.pop(key, None)
            else:
                self._store.clear()
                self._access_times.clear()

    async def _maybe_cleanup(self) -> None:
        now = time.monotonic()
        if now - self._last_cleanup < self._cleanup_interval:
            return

        expired_keys = [
            key for key, entry in self._store.items()
            if entry.is_expired()
        ]

        for key in expired_keys:
            del self._store[key]
            self._access_times.pop(key, None)

        self._last_cleanup = now

    async def _evict_lru(self) -> None:
        if not self._access_times:
            return

        lru_key = min(self._access_times.items(), key=lambda x: x[1])[0]
        self._store.pop(lru_key, None)
        self._access_times.pop(lru_key, None)


class ScopeRateLimiter:
    """Rate limiter for scope validation requests."""

    def __init__(self, max_requests: int = 1000, window_seconds: int = 60) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._requests: Dict[str, deque] = {}
        self._lock = asyncio.Lock()

    async def is_allowed(self, identifier: str) -> bool:
        async with self._lock:
            now = time.monotonic()
            requests = self._requests.setdefault(identifier, deque())

            # Remove old requests outside the window
            while requests and now - requests[0] > self._window_seconds:
                requests.popleft()

            if len(requests) >= self._max_requests:
                return False

            requests.append(now)
            return True


class ScopeAuditor:
    """Audit logging for scope violations and security events."""

    def __init__(self, enabled: bool = True) -> None:
        self._enabled = enabled

    async def log_violation(self, event: ScopeViolationEvent) -> None:
        if not self._enabled:
            return

        logger.warning(
            "scope.violation",
            extra={
                "event_type": "scope_violation",
                "user_id": event.user_id,
                "violation_type": event.violation_type.value,
                "requested_org_id": event.requested_org_id,
                "requested_division_id": event.requested_division_id,
                "actual_org_ids": event.actual_org_ids,
                "actual_division_ids": event.actual_division_ids,
                "permissions": list(event.permissions),
                "request_path": event.request_path,
                "request_method": event.request_method,
                "ip_hash": event.ip_hash,
                "user_agent": event.user_agent,
                "correlation_id": event.correlation_id,
                "occurred_at": event.occurred_at.isoformat(),
            },
        )


class ScopeGuard:
    """
    Core scope guard utility for API enforcement.

    Provides centralized scope validation, caching, and audit logging
    while following the Open/Closed Principle for extensibility.
    """

    def __init__(
        self,
        cache: Optional[ScopeCache] = None,
        rate_limiter: Optional[ScopeRateLimiter] = None,
        auditor: Optional[ScopeAuditor] = None,
        org_resolver: Optional[OrganizationResolver] = None,
    ) -> None:
        self._cache = cache or ScopeCache()
        self._rate_limiter = rate_limiter or ScopeRateLimiter()
        self._auditor = auditor or ScopeAuditor()
        self._org_resolver = org_resolver or get_organization_resolver()

    def _extract_scopes_from_principal(self, principal: CurrentPrincipal) -> Tuple[Set[str], Dict[str, List[str]]]:
        """Extract organization and division scopes from JWT principal."""
        org_scopes = set(principal.org_ids)

        # Normalize division scopes from the principal
        division_scopes: Dict[str, List[str]] = {}
        for org_id, divisions in principal.division_ids.items():
            if org_id in org_scopes and divisions:
                division_scopes[org_id] = list(divisions)

        return org_scopes, division_scopes

    def _build_cache_key(
        self,
        principal: CurrentPrincipal,
        organization_id: Optional[str],
        division_id: Optional[str],
        required_permissions: Set[str],
    ) -> str:
        """Build cache key for scope validation."""
        components = [
            f"user:{principal.id}",
            f"org:{organization_id or 'none'}",
            f"div:{division_id or 'none'}",
            f"perms:{','.join(sorted(required_permissions))}",
        ]
        return ":".join(components)

    async def check_organization_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """
        Validate that the principal has access to the specified organization.

        Args:
            principal: The authenticated user principal
            organization_id: Target organization ID to validate access to
            required_permissions: Optional set of required permissions

        Returns:
            ScopeContext with validation decision

        Raises:
            APIError: If access is denied with machine-readable error code
        """
        required_permissions = required_permissions or set()

        # Use organization resolver to handle mock/UUID conversion
        try:
            org_resolution = self._org_resolver.validate_organization_access(
                principal, organization_id
            )
            # Use the resolved UUID for scope validation
            resolved_org_id = org_resolution.resolved_id
        except ValueError as e:
            # Convert ValueError to APIError for consistent API responses
            context = ScopeContext(
                principal=principal,
                organization_id=organization_id,
                division_id=None,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.ORGANIZATION_ACCESS_DENIED,
            )
            raise self._create_scope_error_with_details(context, str(e))

        cache_key = self._build_cache_key(principal, resolved_org_id, None, required_permissions)

        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        # Rate limiting
        if not await self._rate_limiter.is_allowed(f"org_check:{principal.id}"):
            context = ScopeContext(
                principal=principal,
                organization_id=resolved_org_id,
                division_id=None,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.RATE_LIMITED,
            )
            await self._cache.set(cache_key, context)
            raise self._create_scope_error(context)

        org_scopes, division_scopes = self._extract_scopes_from_principal(principal)

        # Validate organization access with resolved UUID
        if resolved_org_id not in org_scopes:
            context = ScopeContext(
                principal=principal,
                organization_id=resolved_org_id,
                division_id=None,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.ORGANIZATION_ACCESS_DENIED,
            )
            await self._cache.set(cache_key, context)
            raise self._create_scope_error(context)

        # For now, grant basic permissions - this will be enhanced with role-based logic
        granted_permissions = {"org:view", "org:read"}

        context = ScopeContext(
            principal=principal,
            organization_id=resolved_org_id,
            division_id=None,
            permissions=granted_permissions,
            decision=ScopeDecision.ALLOW,
        )

        await self._cache.set(cache_key, context)
        return context

    async def check_division_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """
        Validate that the principal has access to the specified organization and division.

        Args:
            principal: The authenticated user principal
            organization_id: Target organization ID
            division_id: Target division ID within the organization
            required_permissions: Optional set of required permissions

        Returns:
            ScopeContext with validation decision

        Raises:
            APIError: If access is denied with machine-readable error code
        """
        required_permissions = required_permissions or set()
        cache_key = self._build_cache_key(principal, organization_id, division_id, required_permissions)

        # Check cache first
        cached = await self._cache.get(cache_key)
        if cached:
            return cached

        # Rate limiting
        if not await self._rate_limiter.is_allowed(f"div_check:{principal.id}"):
            context = ScopeContext(
                principal=principal,
                organization_id=organization_id,
                division_id=division_id,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.RATE_LIMITED,
            )
            await self._cache.set(cache_key, context)
            raise self._create_scope_error(context)

        org_scopes, division_scopes = self._extract_scopes_from_principal(principal)

        # First validate organization access
        if organization_id not in org_scopes:
            context = ScopeContext(
                principal=principal,
                organization_id=organization_id,
                division_id=division_id,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.ORGANIZATION_ACCESS_DENIED,
            )
            await self._cache.set(cache_key, context)
            raise self._create_scope_error(context)

        # Then validate division access
        org_divisions = division_scopes.get(organization_id, [])
        if division_id not in org_divisions:
            context = ScopeContext(
                principal=principal,
                organization_id=organization_id,
                division_id=division_id,
                permissions=set(),
                decision=ScopeDecision.DENY,
                violation_type=ScopeViolationType.DIVISION_ACCESS_DENIED,
            )
            await self._cache.set(cache_key, context)
            raise self._create_scope_error(context)

        # For now, grant basic permissions - this will be enhanced with role-based logic
        granted_permissions = {"division:view", "division:read"}

        context = ScopeContext(
            principal=principal,
            organization_id=organization_id,
            division_id=division_id,
            permissions=granted_permissions,
            decision=ScopeDecision.ALLOW,
        )

        await self._cache.set(cache_key, context)
        return context

    async def check_cross_organization_access(
        self,
        principal: CurrentPrincipal,
        from_organization_id: str,
        to_organization_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """
        Validate cross-organization access (e.g., moving resources between orgs).

        This is a high-security operation that typically requires elevated permissions.
        """
        required_permissions = required_permissions or {"org:manage"}

        # Check both source and destination organization access
        source_context = await self.check_organization_access(
            principal, from_organization_id, required_permissions
        )
        dest_context = await self.check_organization_access(
            principal, to_organization_id, required_permissions
        )

        # For now, deny cross-org access by default
        # This will be enhanced with role-based logic
        context = ScopeContext(
            principal=principal,
            organization_id=to_organization_id,
            division_id=None,
            permissions=set(),
            decision=ScopeDecision.DENY,
            violation_type=ScopeViolationType.CROSS_ORGANIZATION_ACCESS,
        )

        raise self._create_scope_error(context)

    async def check_cross_division_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        from_division_id: str,
        to_division_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """
        Validate cross-division access within the same organization.
        """
        required_permissions = required_permissions or {"division:manage"}

        # Check both source and destination division access
        source_context = await self.check_division_access(
            principal, organization_id, from_division_id, required_permissions
        )
        dest_context = await self.check_division_access(
            principal, organization_id, to_division_id, required_permissions
        )

        # For now, deny cross-division access by default
        # This will be enhanced with role-based logic
        context = ScopeContext(
            principal=principal,
            organization_id=organization_id,
            division_id=to_division_id,
            permissions=set(),
            decision=ScopeDecision.DENY,
            violation_type=ScopeViolationType.CROSS_DIVISION_ACCESS,
        )

        raise self._create_scope_error(context)

    async def invalidate_cache(self, pattern: Optional[str] = None) -> None:
        """Invalidate cached scope decisions, optionally by pattern."""
        await self._cache.clear(pattern)

    async def log_violation(
        self,
        context: ScopeContext,
        request: Optional[Request] = None,
        correlation_id: Optional[str] = None,
    ) -> None:
        """Log a scope violation for audit purposes."""
        if context.decision != ScopeDecision.DENY or not context.violation_type:
            return

        org_scopes, division_scopes = self._extract_scopes_from_principal(context.principal)

        ip_hash = None
        user_agent = None
        if request and request.client and request.client.host:
            digest = hashlib.sha256(request.client.host.encode("utf-8"))
            ip_hash = digest.hexdigest()
        if request:
            user_agent = request.headers.get("user-agent")

        event = ScopeViolationEvent(
            user_id=context.principal.id,
            violation_type=context.violation_type,
            requested_org_id=context.organization_id,
            requested_division_id=context.division_id,
            actual_org_ids=list(org_scopes),
            actual_division_ids=division_scopes,
            permissions=context.permissions,
            request_path=request.url.path if request else "unknown",
            request_method=request.method if request else "unknown",
            ip_hash=ip_hash,
            user_agent=user_agent,
            correlation_id=correlation_id,
        )

        await self._auditor.log_violation(event)

    def _create_scope_error(self, context: ScopeContext) -> APIError:
        """Create a standardized APIError for scope violations."""
        if not context.violation_type:
            return APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
                code="access_denied",
            )

        detail_messages = {
            ScopeViolationType.ORGANIZATION_ACCESS_DENIED: "You do not have access to this organization",
            ScopeViolationType.DIVISION_ACCESS_DENIED: "You do not have access to this division",
            ScopeViolationType.MISSING_ORGANIZATION_SCOPE: "Organization scope is required for this operation",
            ScopeViolationType.MISSING_DIVISION_SCOPE: "Division scope is required for this operation",
            ScopeViolationType.INSUFFICIENT_PERMISSIONS: "You do not have sufficient permissions for this operation",
            ScopeViolationType.SCOPE_EXPIRED: "Your access scope has expired",
            ScopeViolationType.INVALID_SCOPE_FORMAT: "Invalid scope format",
            ScopeViolationType.CROSS_ORGANIZATION_ACCESS: "Cross-organization access is not permitted",
            ScopeViolationType.CROSS_DIVISION_ACCESS: "Cross-division access is not permitted",
            ScopeViolationType.RATE_LIMITED: "Too many scope validation requests. Please try again later.",
        }

        detail = detail_messages.get(
            context.violation_type,
            "Access denied due to scope validation failure",
        )

        return APIError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            code=context.violation_type.value,
            extra={
                "requested_org_id": context.organization_id,
                "requested_division_id": context.division_id,
                "user_id": context.principal.id,
                "cached_at": context.cached_at.isoformat(),
            },
        )

    def _create_scope_error_with_details(self, context: ScopeContext, custom_message: str) -> APIError:
        """Create an APIError with custom details for organization resolution errors."""
        return APIError(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=custom_message,
            code=context.violation_type.value if context.violation_type else "access_denied",
            extra={
                "requested_org_id": context.organization_id,
                "requested_division_id": context.division_id,
                "user_id": context.principal.id,
                "cached_at": context.cached_at.isoformat(),
                "resolution_error": True,
            },
        )


# Global scope guard instance for dependency injection
_default_scope_guard: Optional[ScopeGuard] = None


def get_scope_guard() -> ScopeGuard:
    """Get or create the default scope guard instance."""
    global _default_scope_guard
    if _default_scope_guard is None:
        _default_scope_guard = ScopeGuard()
    return _default_scope_guard


def set_scope_guard(guard: ScopeGuard) -> None:
    """Set a custom scope guard instance (useful for testing)."""
    global _default_scope_guard
    _default_scope_guard = guard


# Convenience functions for common scope checks
async def require_organization_access(
    principal: CurrentPrincipal,
    organization_id: str,
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> ScopeContext:
    """Convenience function to require organization access."""
    guard = scope_guard or get_scope_guard()
    return await guard.check_organization_access(principal, organization_id, required_permissions)


async def require_division_access(
    principal: CurrentPrincipal,
    organization_id: str,
    division_id: str,
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> ScopeContext:
    """Convenience function to require division access."""
    guard = scope_guard or get_scope_guard()
    return await guard.check_division_access(principal, organization_id, division_id, required_permissions)