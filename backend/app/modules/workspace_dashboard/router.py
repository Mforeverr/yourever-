"""REST endpoints for the workspace dashboard page."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_dashboard_service
from .schemas import DashboardSummary
from .service import DashboardService

router = APIRouter(prefix="/api/workspaces", tags=["workspace-dashboard"])


@router.get("/{org_id}/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(
    org_id: str,
    division_id: str | None = Query(default=None, alias="divisionId"),
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    """Return aggregated dashboard data for a scope."""

    return await service.get_summary(
        principal=principal,
        org_id=org_id,
        division_id=division_id,
        include_templates=include_templates,
    )
