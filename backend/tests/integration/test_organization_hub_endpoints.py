import pytest
from fastapi import FastAPI, HTTPException, Request, status
from httpx import ASGITransport, AsyncClient

from app.dependencies import CurrentPrincipal, require_current_principal
from app.main import create_app
from app.modules.organizations.di import get_organization_hub_service
from app.modules.organizations.schemas import (
    HubInvitation,
    HubOrganization,
    HubOverview,
    HubStats,
    InvitationActionRequest,
)


pytestmark = pytest.mark.asyncio


class _StubHubService:
    def __init__(self) -> None:
        self.overview_calls: list[str] = []
        self.pending_calls: int = 0
        self.accept_calls: list[InvitationActionRequest] = []
        self.decline_calls: list[InvitationActionRequest] = []

    async def get_overview(self, principal: CurrentPrincipal) -> HubOverview:
        self.overview_calls.append(principal.id)
        return HubOverview(
            organizations=[
                HubOrganization(
                    id="org-1",
                    name="Org One",
                    slug="org-one",
                    description=None,
                    logoUrl=None,
                    createdAt=None,
                    userRole="owner",
                    divisions=[],
                    industry=None,
                    location=None,
                    timezone=None,
                    memberCount=None,
                    activeProjects=None,
                    lastActiveAt=None,
                    tags=None,
                    accentColor=None,
                )
            ],
            invitations=[],
            stats=HubStats(
                totalOrganizations=1,
                pendingInvitations=0,
                lastUpdatedAt="2024-01-01T00:00:00Z",
            ),
        )

    async def list_pending_invitations(self, principal: CurrentPrincipal) -> list[HubInvitation]:
        self.pending_calls += 1
        return [
            HubInvitation(
                id="inv-1",
                email="user@example.com",
                orgId="org-1",
                divisionId=None,
                role="member",
                message=None,
                status="pending",
                token=None,
                tokenHash="hash",
                inviterId="owner",
                inviterName="Owner",
                orgName="Org One",
                divisionName=None,
                createdAt="2024-01-01T00:00:00Z",
                updatedAt=None,
                expiresAt=None,
                acceptedAt=None,
                declinedAt=None,
            )
        ]

    async def accept_invitation(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: InvitationActionRequest,
    ) -> HubOrganization:
        self.accept_calls.append(payload)
        if org_id != "org-1":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Org not found")
        return HubOrganization(
            id="org-1",
            name="Org One",
            slug="org-one",
            description=None,
            logoUrl=None,
            createdAt=None,
            userRole="owner",
            divisions=[],
            industry=None,
            location=None,
            timezone=None,
            memberCount=None,
            activeProjects=None,
            lastActiveAt=None,
            tags=None,
            accentColor=None,
        )

    async def decline_invitation(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: InvitationActionRequest,
    ) -> HubInvitation:
        self.decline_calls.append(payload)
        return HubInvitation(
            id=payload.invitation_id,
            email="user@example.com",
            orgId=org_id,
            divisionId=None,
            role="member",
            message=None,
            status="declined",
            token=None,
            tokenHash="hash",
            inviterId="owner",
            inviterName="Owner",
            orgName="Org One",
            divisionName=None,
            createdAt="2024-01-01T00:00:00Z",
            updatedAt=None,
            expiresAt=None,
            acceptedAt=None,
            declinedAt="2024-01-01T00:00:00Z",
        )


@pytest.fixture()
def organizations_app() -> FastAPI:
    app = create_app()
    hub_service = _StubHubService()

    async def _stub_principal(request: Request) -> CurrentPrincipal:
        auth_header = request.headers.get("authorization")
        if not auth_header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        token = auth_header.split(" ")[-1]
        return CurrentPrincipal(id=token, email=f"{token}@example.com", role="member")

    app.dependency_overrides[require_current_principal] = _stub_principal
    app.dependency_overrides[get_organization_hub_service] = lambda: hub_service

    yield app
    app.dependency_overrides.clear()


async def test_get_workspace_hub_overview(organizations_app: FastAPI) -> None:
    transport = ASGITransport(app=organizations_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/organizations/hub",
            headers={"Authorization": "Bearer user-1"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["organizations"][0]["id"] == "org-1"


async def test_pending_invitations_endpoint(organizations_app: FastAPI) -> None:
    transport = ASGITransport(app=organizations_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/organizations/pending-invitations",
            headers={"Authorization": "Bearer user-1"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["invitations"][0]["id"] == "inv-1"


async def test_accept_invitation_endpoint(organizations_app: FastAPI) -> None:
    transport = ASGITransport(app=organizations_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/organizations/org-1/accept-invitation",
            json={"invitationId": "inv-1"},
            headers={"Authorization": "Bearer user-1"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["id"] == "org-1"


async def test_decline_invitation_endpoint(organizations_app: FastAPI) -> None:
    transport = ASGITransport(app=organizations_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/api/organizations/org-1/decline-invitation",
            json={"invitationId": "inv-1"},
            headers={"Authorization": "Bearer user-1"},
        )
    await transport.aclose()

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "declined"
