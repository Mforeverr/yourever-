# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Workspace dashboard REST endpoints with comprehensive scope validation.

This module implements secure dashboard data aggregation operations following REST principles
and the Open/Closed Pattern. All endpoints require proper scope validation to prevent
cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-scoped dashboard: /api/organizations/{org_id}/dashboard
- Division-scoped dashboard: /api/organizations/{org_id}/divisions/{div_id}/dashboard
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException, status

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_dashboard_service
from .schemas import DashboardSummary, DashboardWidgetCreateRequest, DashboardWidgetResponse, DashboardUpdateRequest
from .service import DashboardService

router = APIRouter(prefix="/api", tags=["workspace-dashboard"])


# Organization-scoped dashboard endpoints
@router.get("/organizations/{org_id}/dashboard", response_model=DashboardSummary)
async def get_organization_dashboard_summary(
    org_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    """
    Return aggregated dashboard data for an organization.

    Requires organization-level dashboard:read permission.
    Prevents cross-organization dashboard data access.
    """
    return await service.get_summary(
        principal=principal,
        org_id=org_id,
        division_id=None,
        include_templates=include_templates,
    )


@router.get("/organizations/{org_id}/dashboard/widgets", response_model=list[DashboardWidgetResponse])
async def list_organization_dashboard_widgets(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardWidgetResponse]:
    """
    List dashboard widgets for an organization.

    Requires organization-level dashboard:read permission.
    Prevents cross-organization widget data access.
    """
    widgets = await service.list_widgets_for_organization(principal, org_id)
    return [DashboardWidgetResponse.from_entity(widget) for widget in widgets]


@router.post("/organizations/{org_id}/dashboard/widgets", response_model=DashboardWidgetResponse)
async def create_organization_dashboard_widget(
    org_id: str,
    widget_request: DashboardWidgetCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardWidgetResponse:
    """
    Create a dashboard widget for an organization.

    Requires organization-level dashboard:configure permission.
    Widget will be associated with the validated organization scope.
    """
    widget = await service.create_widget_for_organization(principal, org_id, widget_request)
    return DashboardWidgetResponse.from_entity(widget)


@router.put("/organizations/{org_id}/dashboard/widgets/{widget_id}", response_model=DashboardWidgetResponse)
async def update_organization_dashboard_widget(
    org_id: str,
    widget_id: str,
    widget_request: DashboardUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardWidgetResponse:
    """
    Update a dashboard widget within an organization.

    Requires organization-level dashboard:configure permission.
    Validates that the widget belongs to the specified organization.
    """
    widget = await service.update_widget_for_organization(principal, org_id, widget_id, widget_request)
    if not widget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard widget not found",
            code="widget_not_found"
        )
    return DashboardWidgetResponse.from_entity(widget)


@router.delete("/organizations/{org_id}/dashboard/widgets/{widget_id}")
async def delete_organization_dashboard_widget(
    org_id: str,
    widget_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> dict:
    """
    Delete a dashboard widget within an organization.

    Requires organization-level dashboard:configure permission.
    Validates that the widget belongs to the specified organization.
    """
    success = await service.delete_widget_for_organization(principal, org_id, widget_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard widget not found",
            code="widget_not_found"
        )
    return {"message": "Dashboard widget deleted successfully"}


@router.post("/organizations/{org_id}/dashboard/refresh")
async def refresh_organization_dashboard(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> dict:
    """
    Refresh dashboard data for an organization.

    Requires organization-level dashboard:read permission.
    Triggers a refresh of cached dashboard data.
    """
    await service.refresh_dashboard_for_organization(principal, org_id)
    return {"message": "Dashboard refresh initiated successfully"}


# Division-scoped dashboard endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/dashboard", response_model=DashboardSummary)
async def get_division_dashboard_summary(
    org_id: str,
    div_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    """
    Return aggregated dashboard data for a division.

    Requires division-level dashboard:read permission.
    Prevents cross-division dashboard data access.
    """
    return await service.get_summary(
        principal=principal,
        org_id=org_id,
        division_id=div_id,
        include_templates=include_templates,
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/dashboard/widgets", response_model=list[DashboardWidgetResponse])
async def list_division_dashboard_widgets(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> list[DashboardWidgetResponse]:
    """
    List dashboard widgets for a division.

    Requires division-level dashboard:read permission.
    Prevents cross-division widget data access.
    """
    widgets = await service.list_widgets_for_division(principal, org_id, div_id)
    return [DashboardWidgetResponse.from_entity(widget) for widget in widgets]


@router.post("/organizations/{org_id}/divisions/{div_id}/dashboard/widgets", response_model=DashboardWidgetResponse)
async def create_division_dashboard_widget(
    org_id: str,
    div_id: str,
    widget_request: DashboardWidgetCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardWidgetResponse:
    """
    Create a dashboard widget for a division.

    Requires division-level dashboard:configure permission.
    Widget will be associated with the validated division scope.
    """
    widget = await service.create_widget_for_division(principal, org_id, div_id, widget_request)
    return DashboardWidgetResponse.from_entity(widget)


@router.put("/organizations/{org_id}/divisions/{div_id}/dashboard/widgets/{widget_id}", response_model=DashboardWidgetResponse)
async def update_division_dashboard_widget(
    org_id: str,
    div_id: str,
    widget_id: str,
    widget_request: DashboardUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardWidgetResponse:
    """
    Update a dashboard widget within a division.

    Requires division-level dashboard:configure permission.
    Validates that the widget belongs to the specified division.
    """
    widget = await service.update_widget_for_division(principal, org_id, div_id, widget_id, widget_request)
    if not widget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard widget not found",
            code="widget_not_found"
        )
    return DashboardWidgetResponse.from_entity(widget)


@router.delete("/organizations/{org_id}/divisions/{div_id}/dashboard/widgets/{widget_id}")
async def delete_division_dashboard_widget(
    org_id: str,
    div_id: str,
    widget_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:configure"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> dict:
    """
    Delete a dashboard widget within a division.

    Requires division-level dashboard:configure permission.
    Validates that the widget belongs to the specified division.
    """
    success = await service.delete_widget_for_division(principal, org_id, div_id, widget_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard widget not found",
            code="widget_not_found"
        )
    return {"message": "Dashboard widget deleted successfully"}


@router.post("/organizations/{org_id}/divisions/{div_id}/dashboard/refresh")
async def refresh_division_dashboard(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"dashboard:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> dict:
    """
    Refresh dashboard data for a division.

    Requires division-level dashboard:read permission.
    Triggers a refresh of cached dashboard data.
    """
    await service.refresh_dashboard_for_division(principal, org_id, div_id)
    return {"message": "Dashboard refresh initiated successfully"}
