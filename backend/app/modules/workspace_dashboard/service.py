"""Service orchestrating dashboard permission checks and caching."""

from __future__ import annotations

from typing import Optional

from ...dependencies import CurrentPrincipal
from ..workspace.repository import WorkspacePermissionRepository
from .repository import DashboardRepository
from .schemas import DashboardSummary


class DashboardService:
    """Coordinate dashboard queries behind membership checks."""

    def __init__(
        self,
        *,
        repository: DashboardRepository,
        permission_repository: WorkspacePermissionRepository,
    ) -> None:
        self._repository = repository
        self._permission_repository = permission_repository

    async def get_summary(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> DashboardSummary:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, division_id)
        return await self._repository.fetch_summary(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
        )
