# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Shortlink REST endpoints with comprehensive scope validation.

This module implements secure shortlink management operations following REST principles
and the Open/Closed Pattern. All endpoints require proper scope validation to prevent
cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-scoped shortlinks: /api/organizations/{org_id}/shortlinks
- Division-scoped shortlinks: /api/organizations/{org_id}/divisions/{div_id}/shortlinks
- Cross-tenant prevention via scope guard validation
- Scope-aware resolution with access control
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_shortlink_service
from .schemas import (
    ShortlinkResolution,
    ShortlinkType,
    ShortlinkListResponse,
    ShortlinkCreateRequest,
    ShortlinkResponse,
    ShortlinkUpdateRequest
)
from .service import ShortlinkNotFoundError, ShortlinkScopeError, ShortlinkService

router = APIRouter(prefix="/api", tags=["shortlinks"])


# Public resolution endpoint (with authentication for basic access control)
@router.get("/shortlinks/resolve/{shortlink_type}/{entity_id}", response_model=ShortlinkResolution)
async def resolve_shortlink(
    shortlink_type: ShortlinkType,
    entity_id: str,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResolution:
    """
    Resolve a shortlink to its scoped workspace URL.

    This endpoint allows authenticated users to resolve shortlinks,
    but the underlying service will enforce scope validation
    based on the entity type and user permissions.
    """
    try:
        return await service.resolve_with_scope_validation(shortlink_type, entity_id, principal)
    except ShortlinkNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
            code="shortlink_not_found"
        ) from error
    except ShortlinkScopeError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
            code="access_denied"
        ) from error


# Organization-scoped shortlink management endpoints
@router.get("/organizations/{org_id}/shortlinks", response_model=ShortlinkListResponse)
async def list_organization_shortlinks(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"shortlink:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkListResponse:
    """
    List all shortlinks within a specific organization.

    Requires organization-level shortlink:read permission.
    Prevents cross-organization shortlink data access.
    """
    shortlinks = await service.list_shortlinks_for_organization(principal, org_id)
    return ShortlinkListResponse(results=shortlinks)


@router.post("/organizations/{org_id}/shortlinks", response_model=ShortlinkResponse)
async def create_organization_shortlink(
    org_id: str,
    shortlink_request: ShortlinkCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"shortlink:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Create a new shortlink within a specific organization.

    Requires organization-level shortlink:create permission.
    Shortlink will be associated with the validated organization scope.
    """
    shortlink = await service.create_shortlink_for_organization(principal, org_id, shortlink_request)
    return ShortlinkResponse.from_entity(shortlink)


@router.get("/organizations/{org_id}/shortlinks/{shortlink_id}", response_model=ShortlinkResponse)
async def get_organization_shortlink(
    org_id: str,
    shortlink_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"shortlink:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Get a specific shortlink within an organization.

    Requires organization-level shortlink:read permission.
    Validates that the shortlink belongs to the specified organization.
    """
    shortlink = await service.get_shortlink_for_organization(principal, org_id, shortlink_id)
    if not shortlink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return ShortlinkResponse.from_entity(shortlink)


@router.put("/organizations/{org_id}/shortlinks/{shortlink_id}", response_model=ShortlinkResponse)
async def update_organization_shortlink(
    org_id: str,
    shortlink_id: str,
    shortlink_request: ShortlinkUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"shortlink:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Update a shortlink within an organization.

    Requires organization-level shortlink:update permission.
    Validates that the shortlink belongs to the specified organization.
    """
    shortlink = await service.update_shortlink_for_organization(principal, org_id, shortlink_id, shortlink_request)
    if not shortlink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return ShortlinkResponse.from_entity(shortlink)


@router.delete("/organizations/{org_id}/shortlinks/{shortlink_id}")
async def delete_organization_shortlink(
    org_id: str,
    shortlink_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"shortlink:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> dict:
    """
    Delete a shortlink within an organization.

    Requires organization-level shortlink:delete permission.
    Validates that the shortlink belongs to the specified organization.
    """
    success = await service.delete_shortlink_for_organization(principal, org_id, shortlink_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return {"message": "Shortlink deleted successfully"}


# Division-scoped shortlink management endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/shortlinks", response_model=ShortlinkListResponse)
async def list_division_shortlinks(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"shortlink:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkListResponse:
    """
    List all shortlinks within a specific division.

    Requires division-level shortlink:read permission.
    Prevents cross-division shortlink data access.
    """
    shortlinks = await service.list_shortlinks_for_division(principal, org_id, div_id)
    return ShortlinkListResponse(results=shortlinks)


@router.post("/organizations/{org_id}/divisions/{div_id}/shortlinks", response_model=ShortlinkResponse)
async def create_division_shortlink(
    org_id: str,
    div_id: str,
    shortlink_request: ShortlinkCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"shortlink:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Create a new shortlink within a specific division.

    Requires division-level shortlink:create permission.
    Shortlink will be associated with the validated division scope.
    """
    shortlink = await service.create_shortlink_for_division(principal, org_id, div_id, shortlink_request)
    return ShortlinkResponse.from_entity(shortlink)


@router.get("/organizations/{org_id}/divisions/{div_id}/shortlinks/{shortlink_id}", response_model=ShortlinkResponse)
async def get_division_shortlink(
    org_id: str,
    div_id: str,
    shortlink_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"shortlink:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Get a specific shortlink within a division.

    Requires division-level shortlink:read permission.
    Validates that the shortlink belongs to the specified division.
    """
    shortlink = await service.get_shortlink_for_division(principal, org_id, div_id, shortlink_id)
    if not shortlink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return ShortlinkResponse.from_entity(shortlink)


@router.put("/organizations/{org_id}/divisions/{div_id}/shortlinks/{shortlink_id}", response_model=ShortlinkResponse)
async def update_division_shortlink(
    org_id: str,
    div_id: str,
    shortlink_id: str,
    shortlink_request: ShortlinkUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"shortlink:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResponse:
    """
    Update a shortlink within a division.

    Requires division-level shortlink:update permission.
    Validates that the shortlink belongs to the specified division.
    """
    shortlink = await service.update_shortlink_for_division(principal, org_id, div_id, shortlink_id, shortlink_request)
    if not shortlink:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return ShortlinkResponse.from_entity(shortlink)


@router.delete("/organizations/{org_id}/divisions/{div_id}/shortlinks/{shortlink_id}")
async def delete_division_shortlink(
    org_id: str,
    div_id: str,
    shortlink_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"shortlink:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> dict:
    """
    Delete a shortlink within a division.

    Requires division-level shortlink:delete permission.
    Validates that the shortlink belongs to the specified division.
    """
    success = await service.delete_shortlink_for_division(principal, org_id, div_id, shortlink_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shortlink not found",
            code="shortlink_not_found"
        )
    return {"message": "Shortlink deleted successfully"}
