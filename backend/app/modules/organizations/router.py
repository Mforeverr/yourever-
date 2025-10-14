"""
Router for organization management endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_organization_service
from .schemas import (
    OrganizationCreate,
    OrganizationResponse,
    InvitationResponse,
    InvitationAccept,
    TemplateResponse,
    SlugAvailability,
    WorkspaceCreationResult,
)
from .service import OrganizationService

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("", response_model=List[OrganizationResponse])
async def get_user_organizations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> List[OrganizationResponse]:
    """Get all organizations for the authenticated user."""
    try:
        return await service.get_user_organizations(principal)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch organizations: {str(e)}"
        ) from None


@router.post("", response_model=WorkspaceCreationResult)
async def create_organization(
    create_data: OrganizationCreate,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> WorkspaceCreationResult:
    """Create a new organization with a primary division."""
    try:
        return await service.create_organization(principal, create_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from None
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create organization: {str(e)}"
        ) from None


@router.get("/slug/availability", response_model=SlugAvailability)
async def check_slug_availability(
    slug: str = Query(..., description="Slug to check for availability"),
    service: OrganizationService = Depends(get_organization_service),
) -> SlugAvailability:
    """Check if a slug is available and get suggestions if not."""
    try:
        return await service.check_slug_availability(slug)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check slug availability: {str(e)}"
        ) from None


@router.get("/invitations", response_model=List[InvitationResponse])
async def get_pending_invitations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> List[InvitationResponse]:
    """Get pending invitations for the authenticated user."""
    try:
        return await service.get_pending_invitations(principal)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch invitations: {str(e)}"
        ) from None


@router.post("/join", response_model=OrganizationResponse)
async def accept_invitation(
    invitation_data: InvitationAccept,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> OrganizationResponse:
    """Accept an invitation and join an organization."""
    try:
        organization = await service.accept_invitation(principal, invitation_data.token)
        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or has expired"
            )
        return organization
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept invitation: {str(e)}"
        ) from None


@router.get("/templates", response_model=List[TemplateResponse])
async def get_available_templates(
    service: OrganizationService = Depends(get_organization_service),
) -> List[TemplateResponse]:
    """Get all available templates for workspace creation."""
    try:
        return await service.get_available_templates()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch templates: {str(e)}"
        ) from None


@router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    service: OrganizationService = Depends(get_organization_service),
) -> TemplateResponse:
    """Get a specific template by ID."""
    try:
        template = await service.get_template(template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template '{template_id}' not found"
            )
        return template
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch template: {str(e)}"
        ) from None