from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, status
from httpx import ASGITransport, AsyncClient

from app.dependencies import CurrentPrincipal, require_current_principal
from app.main import create_app
from app.modules.workspace_dashboard.di import get_dashboard_service
from app.modules.workspace_dashboard.schemas import DashboardKpi, DashboardSummary
from app.modules.workspace_dashboard.service import DashboardService


pytestmark = pytest.mark.asyncio


class _StubDashboardService:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def get_summary(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str | None,
        include_templates: bool,
    ) -> DashboardSummary:
        self.calls.append(
            {
                "principal": principal.id,
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
            }
        )
        return DashboardSummary(
            orgId=org_id,
            divisionId=division_id,
            generatedAt=datetime.now(timezone.utc),
            kpis=[
                DashboardKpi(id="onTrack", label="On Track", count=3, deltaDirection="flat"),
                DashboardKpi(id="stuck", label="At Risk", count=1, deltaDirection="flat"),
                DashboardKpi(id="overdue", label="Overdue", count=0, deltaDirection="flat"),
            ],
            projects=[],
            docs=[],
            activity=[],
            presence=[],
            hasTemplates=False,
        )


@pytest.fixture()
def dashboard_app() -> FastAPI:
    application = create_app()
    stub_service = _StubDashboardService()
    application.state.dashboard_stub = stub_service

    async def _get_service() -> DashboardService:
        return stub_service  # type: ignore[return-value]

    async def _principal() -> CurrentPrincipal:
        return CurrentPrincipal(id="user-1", email="user@example.com", role="member")

    application.dependency_overrides[get_dashboard_service] = _get_service
    application.dependency_overrides[require_current_principal] = _principal

    yield application

    application.dependency_overrides.clear()


async def test_get_dashboard_summary(dashboard_app: FastAPI) -> None:
    transport = ASGITransport(app=dashboard_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/workspaces/org-9/dashboard",
            params={"divisionId": "div-3", "includeTemplates": "false"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["orgId"] == "org-9"
    assert payload["divisionId"] == "div-3"
    assert payload["kpis"][0]["id"] == "onTrack"
    stub = dashboard_app.state.dashboard_stub
    assert stub.calls[-1] == {
        "principal": "user-1",
        "org_id": "org-9",
        "division_id": "div-3",
        "include_templates": False,
    }
