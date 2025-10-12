# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Projects REST endpoints.
"""

from fastapi import APIRouter, Depends

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_project_service
from .schemas import ProjectListResponse
from .service import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectListResponse:
    """Return projects visible to the authenticated principal."""

    projects = await service.list_projects(principal)
    return ProjectListResponse(results=projects)
