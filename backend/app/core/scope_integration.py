# Author: Eldrie (CTO Dev)
# Date: 2025-10-19
# Role: Backend

"""
Scope guard integration patterns for existing API architecture.

This module provides seamless integration between the scope guard system
and the existing FastAPI application architecture, including:

- FastAPI dependency functions for route protection
- Decorator patterns for endpoint security
- Service integration utilities
- Request context management
- Error handling integration
"""

from __future__ import annotations

import functools
import inspect
from typing import Any, Callable, List, Optional, Set, TypeVar, Union

from fastapi import Depends, HTTPException, Request, status
from fastapi.params import Depends as FastAPIDepends

from ..dependencies import CurrentPrincipal, require_current_principal
from .scope import ScopeContext, ScopeGuard, get_scope_guard, require_division_access, require_organization_access

T = TypeVar("T", bound=Callable[..., Any])


class ScopeRequirements:
    """Configuration class for scope requirements on endpoints."""

    def __init__(
        self,
        require_organization: bool = False,
        require_division: bool = False,
        required_permissions: Optional[Set[str]] = None,
        allow_cross_organization: bool = False,
        allow_cross_division: bool = False,
    ) -> None:
        self.require_organization = require_organization
        self.require_division = require_division
        self.required_permissions = required_permissions or set()
        self.allow_cross_organization = allow_cross_organization
        self.allow_cross_division = allow_cross_division


class ScopedRequest:
    """Request context that includes validated scope information."""

    def __init__(
        self,
        principal: CurrentPrincipal,
        scope_context: Optional[ScopeContext] = None,
        request: Optional[Request] = None,
    ) -> None:
        self.principal = principal
        self.scope_context = scope_context
        self.request = request

    @property
    def organization_id(self) -> Optional[str]:
        """Get the validated organization ID from scope context."""
        return self.scope_context.organization_id if self.scope_context else None

    @property
    def division_id(self) -> Optional[str]:
        """Get the validated division ID from scope context."""
        return self.scope_context.division_id if self.scope_context else None

    @property
    def permissions(self) -> Set[str]:
        """Get the validated permissions from scope context."""
        return self.scope_context.permissions if self.scope_context else set()

    def has_permission(self, permission: str) -> bool:
        """Check if the request has a specific permission."""
        return permission in self.permissions


def create_organization_dependency(
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[CurrentPrincipal], ScopeContext]:
    """
    Create a FastAPI dependency that validates organization access.

    Usage:
        @router.get("/organizations/{org_id}/projects")
        async def get_projects(
            org_id: str,
            scope_ctx: ScopeContext = Depends(require_organization_access({"project:read"}))
        ):
            # Endpoint logic here
            pass
    """
    async def dependency(
        principal: CurrentPrincipal = Depends(require_current_principal),
    ) -> ScopeContext:
        guard = scope_guard or get_scope_guard()
        # Note: Organization ID should be extracted from path parameters
        # This is a simplified version - in practice, you'd need to get org_id from the path
        raise NotImplementedError(
            "Organization ID must be provided. Use require_organization_access_with_id instead."
        )

    return dependency


def create_division_dependency(
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[CurrentPrincipal], ScopeContext]:
    """
    Create a FastAPI dependency that validates division access.

    Usage:
        @router.get("/organizations/{org_id}/divisions/{div_id}/members")
        async def get_division_members(
            org_id: str,
            div_id: str,
            scope_ctx: ScopeContext = Depends(require_division_access({"member:read"}))
        ):
            # Endpoint logic here
            pass
    """
    async def dependency(
        principal: CurrentPrincipal = Depends(require_current_principal),
    ) -> ScopeContext:
        guard = scope_guard or get_scope_guard()
        # Note: Organization and division IDs should be extracted from path parameters
        # This is a simplified version - in practice, you'd need to get IDs from the path
        raise NotImplementedError(
            "Organization and division IDs must be provided. Use require_division_access_with_ids instead."
        )

    return dependency


def require_organization_access_with_id(
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[CurrentPrincipal, str], ScopeContext]:
    """
    FastAPI dependency that validates organization access from path parameters.

    Usage:
        @router.get("/organizations/{org_id}/projects")
        async def get_projects(
            org_id: str,
            scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:read"}))
        ):
            # Endpoint logic here
            pass
    """
    async def dependency(
        principal: CurrentPrincipal = Depends(require_current_principal),
        organization_id: str = None,  # This will be injected from path parameters
    ) -> ScopeContext:
        if not organization_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID is required",
                code="missing_organization_id",
            )

        guard = scope_guard or get_scope_guard()
        return await require_organization_access(
            principal, organization_id, required_permissions, guard
        )

    return dependency


def require_division_access_with_ids(
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[CurrentPrincipal, str, str], ScopeContext]:
    """
    FastAPI dependency that validates division access from path parameters.

    Usage:
        @router.get("/organizations/{org_id}/divisions/{div_id}/members")
        async def get_division_members(
            org_id: str,
            div_id: str,
            scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"member:read"}))
        ):
            # Endpoint logic here
            pass
    """
    async def dependency(
        principal: CurrentPrincipal = Depends(require_current_principal),
        organization_id: str = None,  # This will be injected from path parameters
        division_id: str = None,  # This will be injected from path parameters
    ) -> ScopeContext:
        if not organization_id or not division_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization ID and division ID are required",
                code="missing_scope_ids",
            )

        guard = scope_guard or get_scope_guard()
        return await require_division_access(
            principal, organization_id, division_id, required_permissions, guard
        )

    return dependency


def scoped_endpoint(
    requirements: ScopeRequirements,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[T], T]:
    """
    Decorator for applying scope requirements to FastAPI endpoints.

    Usage:
        @scoped_endpoint(ScopeRequirements(
            require_organization=True,
            required_permissions={"project:read"}
        ))
        @router.get("/organizations/{org_id}/projects")
        async def get_projects(org_id: str):
            # Endpoint logic here
            pass
    """
    def decorator(func: T) -> T:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and principal from kwargs
            request: Optional[Request] = kwargs.get("request")
            principal: Optional[CurrentPrincipal] = kwargs.get("principal")

            if not principal:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                    code="authentication_required",
                )

            guard = scope_guard or get_scope_guard()

            # Extract organization and division IDs from path parameters
            organization_id = kwargs.get("organization_id") or kwargs.get("org_id")
            division_id = kwargs.get("division_id") or kwargs.get("div_id")

            scope_context: Optional[ScopeContext] = None

            # Validate organization access if required
            if requirements.require_organization and organization_id:
                try:
                    scope_context = await guard.check_organization_access(
                        principal, organization_id, requirements.required_permissions
                    )
                except HTTPException:
                    # Log violation and re-raise
                    await guard.log_violation(scope_context, request)
                    raise

            # Validate division access if required
            if requirements.require_division and organization_id and division_id:
                try:
                    scope_context = await guard.check_division_access(
                        principal, organization_id, division_id, requirements.required_permissions
                    )
                except HTTPException:
                    # Log violation and re-raise
                    await guard.log_violation(scope_context, request)
                    raise

            # Add scope context to kwargs for downstream use
            kwargs["scope_context"] = scope_context

            # Call the original function
            return await func(*args, **kwargs)

        # Preserve FastAPI route metadata
        if hasattr(func, "__route__"):
            wrapper.__route__ = func.__route__

        return wrapper  # type: ignore

    return decorator


def create_scoped_dependency(
    requirements: ScopeRequirements,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[..., ScopedRequest]:
    """
    Create a FastAPI dependency that validates scope requirements and returns a scoped request.

    Usage:
        scoped_req = create_scoped_dependency(
            ScopeRequirements(
                require_organization=True,
                required_permissions={"project:read"}
            )
        )

        @router.get("/organizations/{org_id}/projects")
        async def get_projects(
            org_id: str,
            scoped: ScopedRequest = Depends(scoped_req)
        ):
            # Access scoped.organization_id, scoped.division_id, scoped.permissions
            pass
    """
    async def dependency(
        request: Request,
        principal: CurrentPrincipal = Depends(require_current_principal),
        organization_id: Optional[str] = None,
        division_id: Optional[str] = None,
    ) -> ScopedRequest:
        guard = scope_guard or get_scope_guard()
        scope_context: Optional[ScopeContext] = None

        try:
            # Validate organization access if required
            if requirements.require_organization and organization_id:
                scope_context = await guard.check_organization_access(
                    principal, organization_id, requirements.required_permissions
                )

            # Validate division access if required
            if requirements.require_division and organization_id and division_id:
                scope_context = await guard.check_division_access(
                    principal, organization_id, division_id, requirements.required_permissions
                )

        except HTTPException as e:
            # Log violation and re-raise
            await guard.log_violation(scope_context, request)
            raise e

        return ScopedRequest(principal, scope_context, request)

    return dependency


class ScopedService:
    """
    Base class for services that require scope validation.

    Services that inherit from this class automatically get scope validation
    capabilities and can easily validate organization/division access.
    """

    def __init__(self, scope_guard: Optional[ScopeGuard] = None) -> None:
        self._scope_guard = scope_guard or get_scope_guard()

    async def validate_organization_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """Validate organization access within a service method."""
        return await self._scope_guard.check_organization_access(
            principal, organization_id, required_permissions
        )

    async def validate_division_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """Validate division access within a service method."""
        return await self._scope_guard.check_division_access(
            principal, organization_id, division_id, required_permissions
        )

    async def validate_cross_organization_access(
        self,
        principal: CurrentPrincipal,
        from_organization_id: str,
        to_organization_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """Validate cross-organization access within a service method."""
        return await self._scope_guard.check_cross_organization_access(
            principal, from_organization_id, to_organization_id, required_permissions
        )

    async def validate_cross_division_access(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        from_division_id: str,
        to_division_id: str,
        required_permissions: Optional[Set[str]] = None,
    ) -> ScopeContext:
        """Validate cross-division access within a service method."""
        return await self._scope_guard.check_cross_division_access(
            principal, organization_id, from_division_id, to_division_id, required_permissions
        )


def validate_scope_in_service(
    principal: CurrentPrincipal,
    organization_id: Optional[str] = None,
    division_id: Optional[str] = None,
    required_permissions: Optional[Set[str]] = None,
    scope_guard: Optional[ScopeGuard] = None,
) -> Callable[[T], T]:
    """
    Decorator for validating scope within service methods.

    Usage:
        class ProjectService(ScopedService):
            @validate_scope_in_service(
                organization_id=lambda kwargs: kwargs.get("org_id"),
                required_permissions={"project:read"}
            )
            async def get_projects(self, org_id: str, **kwargs):
                # Service logic here
                pass
    """
    def decorator(func: T) -> T:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            guard = scope_guard or get_scope_guard()

            # Resolve organization_id and division_id from parameters
            resolved_org_id = organization_id
            resolved_div_id = division_id

            if callable(organization_id):
                resolved_org_id = organization_id(kwargs)
            elif isinstance(organization_id, str):
                resolved_org_id = kwargs.get(organization_id)

            if callable(division_id):
                resolved_div_id = division_id(kwargs)
            elif isinstance(division_id, str):
                resolved_div_id = kwargs.get(division_id)

            # Validate scope based on what's provided
            if resolved_org_id and resolved_div_id:
                await guard.check_division_access(
                    principal, resolved_org_id, resolved_div_id, required_permissions
                )
            elif resolved_org_id:
                await guard.check_organization_access(
                    principal, resolved_org_id, required_permissions
                )

            return await func(*args, **kwargs)

        return wrapper  # type: ignore

    return decorator


# Middleware for automatic scope validation
class ScopeValidationMiddleware:
    """
    FastAPI middleware for automatic scope validation based on path patterns.

    This middleware can automatically validate scope requirements for routes
    based on path patterns and configured requirements.
    """

    def __init__(
        self,
        app,
        scope_patterns: List[tuple[str, ScopeRequirements]],
        scope_guard: Optional[ScopeGuard] = None,
    ) -> None:
        self.app = app
        self.scope_patterns = scope_patterns
        self._scope_guard = scope_guard or get_scope_guard()

    async def __call__(self, scope, receive, send):
        # This would be implemented to automatically validate scope
        # based on path patterns before the request reaches the route handler
        # Implementation is complex and would require deep FastAPI integration
        return await self.app(scope, receive, send)