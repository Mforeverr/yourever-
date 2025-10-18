"""Organizations REST endpoints."""

from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Query, status

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import (
    get_organization_hub_service,
    get_organization_invitation_service,
    get_organization_service,
)
from .hub_service import OrganizationHubService
from .jobs import InvitationExpiryScheduler
from .schemas import (
    DivisionCreate,
    DivisionCreateRequest,
    HubInvitation,
    HubOverview,
    HubOrganization,
    InvitationActionRequest,
    InvitationBatchCreateRequest,
    InvitationBatchCreateResponse,
    InvitationListResponse,
    InvitationResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationSummary,
    SlugAvailability,
    WorkspaceCreationResponse,
)
from .service import OrganizationInvitationService, OrganizationService


_INVITATION_SCHEDULER = InvitationExpiryScheduler()


@asynccontextmanager
async def _organizations_lifespan(_app: FastAPI):
    """Manage background invitation expiry scheduler lifecycle."""

    _INVITATION_SCHEDULER.start()
    try:
        yield
    finally:
        await _INVITATION_SCHEDULER.shutdown()


router = APIRouter(
    prefix="/api/organizations",
    tags=["organizations"],
    lifespan=_organizations_lifespan,
)


@router.post(
    "",
    response_model=WorkspaceCreationResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=WorkspaceCreationResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
async def create_organization(
    payload: OrganizationCreate,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> WorkspaceCreationResponse:
    """Create a new organization and optionally send invitations."""

    return await service.create(principal, payload)


@router.get(
    "/slug/availability",
    response_model=SlugAvailability,
)
async def check_slug_availability(
    slug: str = Query(..., min_length=1, max_length=100),
    _principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> SlugAvailability:
    """Check whether a slug can be used and return alternatives if needed."""

    return await service.check_slug_availability(slug)


@router.get("", response_model=list[OrganizationSummary])
async def list_organizations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> list[OrganizationSummary]:
    """Return organizations visible to the authenticated principal."""

    return await service.list_for_principal(principal)


@router.get(
    "/hub",
    response_model=HubOverview,
)
async def get_workspace_hub_overview(
    principal: CurrentPrincipal = Depends(require_current_principal),
    hub_service: OrganizationHubService = Depends(get_organization_hub_service),
) -> HubOverview:
    """Return combined organizations and invitations for the workspace hub."""

    return await hub_service.get_overview(principal)


@router.get(
    "/pending-invitations",
    response_model=InvitationListResponse,
)
async def list_pending_invitations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    hub_service: OrganizationHubService = Depends(get_organization_hub_service),
) -> InvitationListResponse:
    """Return pending invitations scoped to the authenticated principal."""

    invitations = await hub_service.list_pending_invitations(principal)
    return InvitationListResponse(invitations=invitations)


@router.get(
    "/invitations",
    response_model=InvitationListResponse,
    include_in_schema=False,
)
async def list_invitations_legacy(
    principal: CurrentPrincipal = Depends(require_current_principal),
    hub_service: OrganizationHubService = Depends(get_organization_hub_service),
) -> InvitationListResponse:
    """Legacy endpoint maintained for backward compatibility."""

    invitations = await hub_service.list_pending_invitations(principal)
    return InvitationListResponse(invitations=invitations)


@router.post(
    "/{org_id}/invitations",
    response_model=InvitationBatchCreateResponse,
)
async def create_invitations(
    org_id: str,
    payload: InvitationBatchCreateRequest,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationInvitationService = Depends(get_organization_invitation_service),
) -> InvitationBatchCreateResponse:
    """Create invitations within an organization."""

    return await service.create(principal, org_id, payload)


@router.post(
    "/{org_id}/accept-invitation",
    response_model=HubOrganization,
)
async def accept_invitation_for_org(
    org_id: str,
    payload: InvitationActionRequest,
    principal: CurrentPrincipal = Depends(require_current_principal),
    hub_service: OrganizationHubService = Depends(get_organization_hub_service),
) -> HubOrganization:
    """Accept a pending invitation for a given organization."""

    return await hub_service.accept_invitation(
        principal=principal,
        org_id=org_id,
        payload=payload,
    )


@router.post(
    "/{org_id}/decline-invitation",
    response_model=HubInvitation,
)
async def decline_invitation_for_org(
    org_id: str,
    payload: InvitationActionRequest,
    principal: CurrentPrincipal = Depends(require_current_principal),
    hub_service: OrganizationHubService = Depends(get_organization_hub_service),
) -> HubInvitation:
    """Decline an invitation for the supplied organization."""

    return await hub_service.decline_invitation(
        principal=principal,
        org_id=org_id,
        payload=payload,
    )


@router.post(
    "/invitations/{invitation_id}/accept",
    response_model=OrganizationResponse,
    include_in_schema=False,
)
async def accept_invitation(
    invitation_id: str,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationInvitationService = Depends(get_organization_invitation_service),
) -> OrganizationResponse:
    """Accept a pending invitation."""

    return await service.accept(principal, invitation_id)


@router.post(
    "/invitations/{invitation_id}/decline",
    response_model=InvitationResponse,
    include_in_schema=False,
)
async def decline_invitation(
    invitation_id: str,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationInvitationService = Depends(get_organization_invitation_service),
) -> InvitationResponse:
    """Decline a pending invitation."""

    return await service.decline(principal, invitation_id)
