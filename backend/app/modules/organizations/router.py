"""Organizations REST endpoints."""

from fastapi import APIRouter, Depends, status

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_organization_invitation_service, get_organization_service
from .schemas import (
    InvitationBatchCreateRequest,
    InvitationBatchCreateResponse,
    InvitationListResponse,
    InvitationResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationSummary,
    WorkspaceCreationResponse,
)
from .service import OrganizationInvitationService, OrganizationService

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post(
    "",
    response_model=WorkspaceCreationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: OrganizationCreate,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> WorkspaceCreationResponse:
    """Create a new organization and optionally send invitations."""

    return await service.create(principal, payload)


@router.get("", response_model=list[OrganizationSummary])
async def list_organizations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> list[OrganizationSummary]:
    """Return organizations visible to the authenticated principal."""

    return await service.list_for_principal(principal)


@router.get(
    "/invitations",
    response_model=InvitationListResponse,
)
async def list_invitations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationInvitationService = Depends(get_organization_invitation_service),
) -> InvitationListResponse:
    """Return pending invitations scoped to the authenticated principal."""

    return await service.list_for_principal(principal)


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
    "/invitations/{invitation_id}/accept",
    response_model=OrganizationResponse,
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
)
async def decline_invitation(
    invitation_id: str,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationInvitationService = Depends(get_organization_invitation_service),
) -> InvitationResponse:
    """Decline a pending invitation."""

    return await service.decline(principal, invitation_id)
