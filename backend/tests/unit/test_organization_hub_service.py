from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.dependencies import CurrentPrincipal
from app.modules.organizations.hub_service import (
    HubEventPublisher,
    InvitationActionRateLimiter,
    OrganizationHubService,
)
from app.modules.organizations.schemas import (
    HubOverview,
    InvitationActionRequest,
    InvitationResponse,
    OrganizationDivision,
    OrganizationResponse,
)


class _StubRepository:
    def __init__(self) -> None:
        self.expire_calls = 0
        self.organizations: list[OrganizationResponse] = [
            OrganizationResponse(
                id="org-1",
                name="Owner Org",
                slug="owner-org",
                description="",
                logoUrl=None,
                createdAt=None,
                divisions=[
                    OrganizationDivision(
                        id="div-1",
                        name="Division",
                        key="division",
                        description=None,
                        org_id="org-1",
                        created_at=None,
                        user_role="owner",
                    )
                ],
                userRole="owner",
            ),
            OrganizationResponse(
                id="org-2",
                name="Member Org",
                slug="member-org",
                description="",
                logoUrl=None,
                createdAt=None,
                divisions=[],
                userRole="member",
            ),
        ]
        self.invitations: list[InvitationResponse] = [
            InvitationResponse(
                id="inv-1",
                email="user@example.com",
                orgId="org-3",
                divisionId=None,
                role="member",
                message=None,
                status="pending",
                token=None,
                tokenHash="abc",
                inviterId="user-2",
                inviterName="Owner",
                orgName="New Org",
                divisionName=None,
                createdAt=datetime.now(timezone.utc),
                updatedAt=None,
                expiresAt=None,
                acceptedAt=None,
                declinedAt=None,
            )
        ]

    async def expire_stale_invitations(self) -> int:
        self.expire_calls += 1
        return 0

    async def get_user_organizations(self, user_id: str):
        return self.organizations

    async def get_pending_invitations(self, user_email: str):
        return self.invitations


class _StubUserService:
    async def get_current_user(self, principal: CurrentPrincipal):
        return SimpleNamespace(id=principal.id, email=principal.email)


class _StubInvitationService:
    def __init__(self) -> None:
        self.accepted: list[str] = []
        self.declined: list[str] = []
        self.response = OrganizationResponse(
            id="org-1",
            name="Owner Org",
            slug="owner-org",
            description="",
            logoUrl=None,
            createdAt=None,
            divisions=[],
            userRole="owner",
        )
        self.decline_response = InvitationResponse(
            id="inv-1",
            email="user@example.com",
            orgId="org-1",
            divisionId=None,
            role="member",
            message=None,
            status="pending",
            token=None,
            tokenHash="hash",
            inviterId="user-2",
            inviterName="Owner",
            orgName="Owner Org",
            divisionName=None,
            createdAt=datetime.now(timezone.utc),
            updatedAt=None,
            expiresAt=None,
            acceptedAt=None,
            declinedAt=None,
        )

    async def accept(self, _principal: CurrentPrincipal, invitation_id: str):
        self.accepted.append(invitation_id)
        return self.response

    async def decline(self, _principal: CurrentPrincipal, invitation_id: str):
        self.declined.append(invitation_id)
        return self.decline_response


class _StubEvents(HubEventPublisher):
    def __init__(self) -> None:
        self.accepted: list[str] = []
        self.declined: list[str] = []

    async def invitation_accepted(self, *, user_id: str, invitation_id: str, org_id: str) -> None:
        self.accepted.append(invitation_id)

    async def invitation_declined(self, *, user_id: str, invitation_id: str, org_id: str) -> None:
        self.declined.append(invitation_id)


@pytest.mark.asyncio
async def test_get_overview_combines_data() -> None:
    repository = _StubRepository()
    service = OrganizationHubService(
        repository=repository,
        user_service=_StubUserService(),
        invitation_service=_StubInvitationService(),
        event_publisher=_StubEvents(),
        rate_limiter=InvitationActionRateLimiter(max_events=10, window_seconds=60),
    )

    principal = CurrentPrincipal(id="user-1", email="user@example.com", role="member")

    overview = await service.get_overview(principal)

    assert isinstance(overview, HubOverview)
    assert [org.id for org in overview.organizations] == ["org-1", "org-2"]
    assert overview.invitations[0].token_hash == "abc"
    assert repository.expire_calls == 1


@pytest.mark.asyncio
async def test_accept_invitation_emits_event() -> None:
    repository = _StubRepository()
    invitation_service = _StubInvitationService()
    events = _StubEvents()
    service = OrganizationHubService(
        repository=repository,
        user_service=_StubUserService(),
        invitation_service=invitation_service,
        event_publisher=events,
        rate_limiter=InvitationActionRateLimiter(max_events=5, window_seconds=60),
    )
    principal = CurrentPrincipal(id="user-1", email="user@example.com", role="member")

    result = await service.accept_invitation(
        principal=principal,
        org_id="org-1",
        payload=InvitationActionRequest(invitationId="inv-1"),
    )

    assert result.id == "org-1"
    assert invitation_service.accepted == ["inv-1"]
    assert events.accepted == ["inv-1"]

    with pytest.raises(HTTPException):
        await service.accept_invitation(
            principal=principal,
            org_id="org-2",
            payload=InvitationActionRequest(invitationId="inv-1"),
        )


@pytest.mark.asyncio
async def test_rate_limiter_blocks_second_action() -> None:
    repository = _StubRepository()
    invitation_service = _StubInvitationService()
    service = OrganizationHubService(
        repository=repository,
        user_service=_StubUserService(),
        invitation_service=invitation_service,
        event_publisher=_StubEvents(),
        rate_limiter=InvitationActionRateLimiter(max_events=1, window_seconds=3600),
    )
    principal = CurrentPrincipal(id="user-1", email="user@example.com", role="member")

    await service.decline_invitation(
        principal=principal,
        org_id="org-1",
        payload=InvitationActionRequest(invitationId="inv-1"),
    )

    with pytest.raises(HTTPException) as exc:
        await service.decline_invitation(
            principal=principal,
            org_id="org-1",
            payload=InvitationActionRequest(invitationId="inv-1"),
        )

    assert exc.value.status_code == 429
