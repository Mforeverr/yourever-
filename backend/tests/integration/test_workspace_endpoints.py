"""Integration tests for workspace API routes with dependency overrides."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import FastAPI, HTTPException, Request, status
from httpx import ASGITransport, AsyncClient

from app.dependencies import CurrentPrincipal, require_current_principal
from app.main import create_app
from app.modules.workspace.di import get_workspace_service
from app.modules.workspace.schemas import (
    ChannelListResponse,
    WorkspaceChannel,
    WorkspaceOverview,
)


pytestmark = pytest.mark.asyncio


class _StubWorkspaceService:
    def __init__(self) -> None:
        self.overview_calls: list[dict] = []
        self.channel_calls: list[dict] = []

    async def get_overview(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str | None,
        include_templates: bool,
    ) -> WorkspaceOverview:
        self.overview_calls.append(
            {
                "principal": principal.id,
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
            }
        )
        return WorkspaceOverview(
            orgId=org_id,
            divisionId=division_id,
            projects=[],
            tasks=[],
            docs=[],
            channels=[],
            hasTemplates=include_templates,
        )

    async def list_channels(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: str | None,
        include_templates: bool,
        page: int,
        page_size: int,
    ) -> ChannelListResponse:
        self.channel_calls.append(
            {
                "principal": principal.id,
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
                "page": page,
                "page_size": page_size,
            }
        )
        channel = WorkspaceChannel(
            id="chan-1",
            orgId=org_id,
            divisionId=division_id,
            slug="general",
            name="General",
            channelType="public",
            topic=None,
            description="Workspace updates",
            memberCount=5,
            isFavorite=False,
            isMuted=False,
            unreadCount=0,
            isTemplate=include_templates,
            updatedAt=datetime.now(timezone.utc),
        )
        return ChannelListResponse(items=[channel], total=1, page=page, pageSize=page_size)


@pytest.fixture()
def workspace_app() -> FastAPI:
    app = create_app()

    async def _stub_principal(request: Request) -> CurrentPrincipal:
        auth_header = request.headers.get("authorization")
        if not auth_header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        token = auth_header.split(" ")[-1]
        return CurrentPrincipal(id=token, email=f"{token}@example.com", role="member")

    app.dependency_overrides[require_current_principal] = _stub_principal

    yield app
    app.dependency_overrides.clear()


async def test_get_workspace_overview_requires_auth(workspace_app: FastAPI) -> None:
    transport = ASGITransport(app=workspace_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/workspaces/org-1/overview")
    await transport.aclose()

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


async def test_get_workspace_overview_returns_payload(workspace_app: FastAPI) -> None:
    stub = _StubWorkspaceService()

    workspace_app.dependency_overrides[get_workspace_service] = lambda: stub
    transport = ASGITransport(app=workspace_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/workspaces/org-1/overview",
            params={"includeTemplates": True},
            headers={"Authorization": "Bearer user-123"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["orgId"] == "org-1"
    assert data["hasTemplates"] is True
    assert stub.overview_calls == [
        {
            "principal": "user-123",
            "org_id": "org-1",
            "division_id": None,
            "include_templates": True,
        }
    ]


async def test_list_channels_uses_query_params(workspace_app: FastAPI) -> None:
    stub = _StubWorkspaceService()

    workspace_app.dependency_overrides[get_workspace_service] = lambda: stub
    transport = ASGITransport(app=workspace_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/workspaces/org-1/divisions/div-9/channels",
            params={"includeTemplates": False, "page": 2, "pageSize": 10},
            headers={"Authorization": "Bearer user-456"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] == 1
    assert data["page"] == 2
    assert data["pageSize"] == 10
    assert data["items"][0]["id"] == "chan-1"
    assert stub.channel_calls == [
        {
            "principal": "user-456",
            "org_id": "org-1",
            "division_id": "div-9",
            "include_templates": False,
            "page": 2,
            "page_size": 10,
        }
    ]
