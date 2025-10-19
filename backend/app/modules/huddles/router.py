# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Huddles REST endpoints with comprehensive scope validation.

This module implements secure huddle management endpoints following REST principles
and the Open/Closed Pattern. All endpoints require proper scope validation to prevent
cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-level access: /api/organizations/{org_id}/huddles
- Division-level access: /api/organizations/{org_id}/divisions/{div_id}/huddles
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_huddle_service
from .schemas import HuddleListResponse, HuddleCreateRequest, HuddleResponse, HuddleUpdateRequest
from .service import HuddleService

router = APIRouter(prefix="/api", tags=["huddles"])


# Organization-scoped endpoints
@router.get("/organizations/{org_id}/huddles", response_model=HuddleListResponse)
async def list_organization_huddles(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleListResponse:
    """
    List all huddles within a specific organization.

    Requires organization-level huddle:read permission.
    Prevents cross-organization data access.
    """
    huddles = await service.list_huddles_for_organization(principal, org_id)
    return HuddleListResponse(results=huddles)


@router.post("/organizations/{org_id}/huddles", response_model=HuddleResponse)
async def create_organization_huddle(
    org_id: str,
    huddle_request: HuddleCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Create a new huddle within a specific organization.

    Requires organization-level huddle:create permission.
    Huddle will be associated with the validated organization.
    """
    huddle = await service.create_huddle_for_organization(principal, org_id, huddle_request)
    return HuddleResponse.from_entity(huddle)


@router.get("/organizations/{org_id}/huddles/{huddle_id}", response_model=HuddleResponse)
async def get_organization_huddle(
    org_id: str,
    huddle_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Get a specific huddle within an organization.

    Requires organization-level huddle:read permission.
    Validates that the huddle belongs to the specified organization.
    """
    huddle = await service.get_huddle_for_organization(principal, org_id, huddle_id)
    if not huddle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return HuddleResponse.from_entity(huddle)


@router.put("/organizations/{org_id}/huddles/{huddle_id}", response_model=HuddleResponse)
async def update_organization_huddle(
    org_id: str,
    huddle_id: str,
    huddle_request: HuddleUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Update a huddle within an organization.

    Requires organization-level huddle:update permission.
    Validates that the huddle belongs to the specified organization.
    """
    huddle = await service.update_huddle_for_organization(principal, org_id, huddle_id, huddle_request)
    if not huddle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return HuddleResponse.from_entity(huddle)


@router.delete("/organizations/{org_id}/huddles/{huddle_id}")
async def delete_organization_huddle(
    org_id: str,
    huddle_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> dict:
    """
    Delete a huddle within an organization.

    Requires organization-level huddle:delete permission.
    Validates that the huddle belongs to the specified organization.
    """
    success = await service.delete_huddle_for_organization(principal, org_id, huddle_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return {"message": "Huddle deleted successfully"}


@router.get("/organizations/{org_id}/huddles/upcoming", response_model=HuddleListResponse)
async def list_organization_upcoming_huddles(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleListResponse:
    """
    List upcoming huddles within a specific organization.

    Requires organization-level huddle:read permission.
    Returns only scheduled huddles that haven't occurred yet.
    """
    huddles = await service.list_upcoming_huddles_for_organization(principal, org_id)
    return HuddleListResponse(results=huddles)


# Division-scoped endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/huddles", response_model=HuddleListResponse)
async def list_division_huddles(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleListResponse:
    """
    List all huddles within a specific division.

    Requires division-level huddle:read permission.
    Prevents cross-division data access.
    """
    huddles = await service.list_huddles_for_division(principal, org_id, div_id)
    return HuddleListResponse(results=huddles)


@router.post("/organizations/{org_id}/divisions/{div_id}/huddles", response_model=HuddleResponse)
async def create_division_huddle(
    org_id: str,
    div_id: str,
    huddle_request: HuddleCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Create a new huddle within a specific division.

    Requires division-level huddle:create permission.
    Huddle will be associated with the validated division.
    """
    huddle = await service.create_huddle_for_division(principal, org_id, div_id, huddle_request)
    return HuddleResponse.from_entity(huddle)


@router.get("/organizations/{org_id}/divisions/{div_id}/huddles/{huddle_id}", response_model=HuddleResponse)
async def get_division_huddle(
    org_id: str,
    div_id: str,
    huddle_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Get a specific huddle within a division.

    Requires division-level huddle:read permission.
    Validates that the huddle belongs to the specified division.
    """
    huddle = await service.get_huddle_for_division(principal, org_id, div_id, huddle_id)
    if not huddle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return HuddleResponse.from_entity(huddle)


@router.put("/organizations/{org_id}/divisions/{div_id}/huddles/{huddle_id}", response_model=HuddleResponse)
async def update_division_huddle(
    org_id: str,
    div_id: str,
    huddle_id: str,
    huddle_request: HuddleUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleResponse:
    """
    Update a huddle within a division.

    Requires division-level huddle:update permission.
    Validates that the huddle belongs to the specified division.
    """
    huddle = await service.update_huddle_for_division(principal, org_id, div_id, huddle_id, huddle_request)
    if not huddle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return HuddleResponse.from_entity(huddle)


@router.delete("/organizations/{org_id}/divisions/{div_id}/huddles/{huddle_id}")
async def delete_division_huddle(
    org_id: str,
    div_id: str,
    huddle_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> dict:
    """
    Delete a huddle within a division.

    Requires division-level huddle:delete permission.
    Validates that the huddle belongs to the specified division.
    """
    success = await service.delete_huddle_for_division(principal, org_id, div_id, huddle_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Huddle not found",
            code="huddle_not_found"
        )
    return {"message": "Huddle deleted successfully"}


@router.get("/organizations/{org_id}/divisions/{div_id}/huddles/upcoming", response_model=HuddleListResponse)
async def list_division_upcoming_huddles(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"huddle:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleListResponse:
    """
    List upcoming huddles within a specific division.

    Requires division-level huddle:read permission.
    Returns only scheduled huddles that haven't occurred yet.
    """
    huddles = await service.list_upcoming_huddles_for_division(principal, org_id, div_id)
    return HuddleListResponse(results=huddles)
