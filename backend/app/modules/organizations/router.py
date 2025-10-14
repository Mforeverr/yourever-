"""Organizations REST endpoints."""

from fastapi import APIRouter, Depends

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_organization_service
from .schemas import OrganizationSummary
from .service import OrganizationService

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("", response_model=list[OrganizationSummary])
async def list_organizations(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: OrganizationService = Depends(get_organization_service),
) -> list[OrganizationSummary]:
    """Return organizations visible to the authenticated principal."""

    return await service.list_for_principal(principal)
