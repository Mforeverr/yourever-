from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.dependencies import CurrentPrincipal
from app.modules.workspace_dashboard.repository import DashboardRepository
from app.modules.workspace_dashboard.schemas import DashboardKpi, DashboardSummary
from app.modules.workspace_dashboard.service import DashboardService
from app.modules.workspace.repository import WorkspacePermissionRepository


pytestmark = pytest.mark.asyncio


class TestDashboardService:
    @pytest.fixture()
    def principal(self) -> CurrentPrincipal:
        return CurrentPrincipal(id="user-123", email="user@example.com", role="member")

    @pytest.fixture()
    def repository(self) -> AsyncMock:
        repo = AsyncMock(spec=DashboardRepository)
        summary = DashboardSummary(
            orgId="org-1",
            divisionId=None,
            generatedAt=datetime.now(timezone.utc),
            kpis=[
                DashboardKpi(id="onTrack", label="On Track", count=4, deltaDirection="flat"),
                DashboardKpi(id="stuck", label="At Risk", count=1, deltaDirection="flat"),
                DashboardKpi(id="overdue", label="Overdue", count=2, deltaDirection="flat"),
            ],
            projects=[],
            docs=[],
            activity=[],
            presence=[],
            hasTemplates=False,
        )
        repo.fetch_summary.return_value = summary
        return repo

    @pytest.fixture()
    def permission_repository(self) -> AsyncMock:
        repo = AsyncMock(spec=WorkspacePermissionRepository)
        repo.ensure_membership.return_value = None
        repo.ensure_division_membership.return_value = None
        return repo

    @pytest.fixture()
    def service(
        self,
        repository: AsyncMock,
        permission_repository: AsyncMock,
    ) -> DashboardService:
        return DashboardService(repository=repository, permission_repository=permission_repository)

    async def test_get_summary_checks_permissions(
        self,
        service: DashboardService,
        repository: AsyncMock,
        permission_repository: AsyncMock,
        principal: CurrentPrincipal,
    ) -> None:
        summary = await service.get_summary(
            principal=principal,
            org_id="org-1",
            division_id="div-9",
            include_templates=True,
        )

        permission_repository.ensure_membership.assert_awaited_once_with(principal, "org-1")
        permission_repository.ensure_division_membership.assert_awaited_once_with(principal, "org-1", "div-9")
        repository.fetch_summary.assert_awaited_once_with(
            org_id="org-1",
            division_id="div-9",
            include_templates=True,
        )
        assert summary.org_id == "org-1"
        assert len(summary.kpis) == 3
