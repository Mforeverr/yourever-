# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Dashboard service with comprehensive scope validation and security.

This service implements secure dashboard operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access.
"""

from __future__ import annotations

from typing import Optional

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from ..workspace.repository import WorkspacePermissionRepository
from .repository import DashboardRepository
from .schemas import DashboardSummary, DashboardWidget, DashboardWidgetCreateRequest, DashboardWidgetResponse, DashboardUpdateRequest


class DashboardService(ScopedService):
    """
    Encapsulates secure dashboard domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all dashboard operations respect organization
    and division boundaries.
    """

    def __init__(
        self,
        *,
        repository: DashboardRepository,
        permission_repository: WorkspacePermissionRepository,
    ) -> None:
        super().__init__()
        self._repository = repository
        self._permission_repository = permission_repository

    # Organization-scoped methods
    async def get_summary_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> DashboardSummary:
        """
        Get dashboard summary for an organization with scope validation.

        This method validates organization access and optionally division access
        before returning the dashboard summary.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"dashboard:read"}
        )

        # Additional validation if division is specified
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, division_id, {"dashboard:read"}
            )

        return await self._repository.fetch_summary(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
        )

    # Legacy method for backward compatibility
    async def get_summary(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> DashboardSummary:
        """
        Legacy method - get dashboard summary with old permission validation.

        DEPRECATED: Use get_summary_for_organization instead for better security.
        """
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, division_id)
        return await self._repository.fetch_summary(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
        )

    # Organization-scoped widget methods
    async def list_widgets_for_organization(
        self,
        principal: CurrentPrincipal,
        org_id: str,
    ) -> list[DashboardWidget]:
        """List dashboard widgets for an organization with scope validation."""
        await self.validate_organization_access(principal, org_id, {"dashboard:read"})
        # For now, return empty list - widget functionality can be extended later
        return []

    async def create_widget_for_organization(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        widget_request: DashboardWidgetCreateRequest,
    ) -> DashboardWidget:
        """Create a dashboard widget for an organization with scope validation."""
        await self.validate_organization_access(principal, org_id, {"dashboard:configure"})
        # For now, return a mock widget - real implementation would save to database
        from datetime import datetime, timezone
        import uuid

        return DashboardWidget(
            id=str(uuid.uuid4()),
            org_id=org_id,
            division_id=None,
            widget_type=widget_request.widget_type,
            title=widget_request.title,
            description=widget_request.description,
            config=widget_request.config,
            position=widget_request.position,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            created_by=principal.sub,
        )

    async def update_widget_for_organization(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        widget_id: str,
        widget_request: DashboardUpdateRequest,
    ) -> Optional[DashboardWidget]:
        """Update a dashboard widget for an organization with scope validation."""
        await self.validate_organization_access(principal, org_id, {"dashboard:configure"})
        # For now, return None - real implementation would update in database
        return None

    async def delete_widget_for_organization(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        widget_id: str,
    ) -> bool:
        """Delete a dashboard widget for an organization with scope validation."""
        await self.validate_organization_access(principal, org_id, {"dashboard:configure"})
        # For now, return False - real implementation would delete from database
        return False

    async def refresh_dashboard_for_organization(
        self,
        principal: CurrentPrincipal,
        org_id: str,
    ) -> None:
        """Refresh dashboard data for an organization with scope validation."""
        await self.validate_organization_access(principal, org_id, {"dashboard:read"})
        # For now, do nothing - real implementation would clear cache

    # Division-scoped widget methods
    async def list_widgets_for_division(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str,
    ) -> list[DashboardWidget]:
        """List dashboard widgets for a division with scope validation."""
        await self.validate_division_access(principal, org_id, division_id, {"dashboard:read"})
        # For now, return empty list - widget functionality can be extended later
        return []

    async def create_widget_for_division(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str,
        widget_request: DashboardWidgetCreateRequest,
    ) -> DashboardWidget:
        """Create a dashboard widget for a division with scope validation."""
        await self.validate_division_access(principal, org_id, division_id, {"dashboard:configure"})
        # For now, return a mock widget - real implementation would save to database
        from datetime import datetime, timezone
        import uuid

        return DashboardWidget(
            id=str(uuid.uuid4()),
            org_id=org_id,
            division_id=division_id,
            widget_type=widget_request.widget_type,
            title=widget_request.title,
            description=widget_request.description,
            config=widget_request.config,
            position=widget_request.position,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            created_by=principal.sub,
        )

    async def update_widget_for_division(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str,
        widget_id: str,
        widget_request: DashboardUpdateRequest,
    ) -> Optional[DashboardWidget]:
        """Update a dashboard widget for a division with scope validation."""
        await self.validate_division_access(principal, org_id, division_id, {"dashboard:configure"})
        # For now, return None - real implementation would update in database
        return None

    async def delete_widget_for_division(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str,
        widget_id: str,
    ) -> bool:
        """Delete a dashboard widget for a division with scope validation."""
        await self.validate_division_access(principal, org_id, division_id, {"dashboard:configure"})
        # For now, return False - real implementation would delete from database
        return False

    async def refresh_dashboard_for_division(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str,
    ) -> None:
        """Refresh dashboard data for a division with scope validation."""
        await self.validate_division_access(principal, org_id, division_id, {"dashboard:read"})
        # For now, do nothing - real implementation would clear cache
