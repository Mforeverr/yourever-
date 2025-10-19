# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Projects REST endpoints with comprehensive scope validation.

This module implements secure project management endpoints following REST principles
and the Open/Closed Pattern. All endpoints require proper scope validation to prevent
cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-level access: /api/organizations/{org_id}/projects
- Division-level access: /api/organizations/{org_id}/divisions/{div_id}/projects
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_project_service
from .schemas import ProjectListResponse, ProjectCreateRequest, ProjectResponse
from .service import ProjectService

router = APIRouter(prefix="/api", tags=["projects"])


# Organization-scoped endpoints
@router.get("/organizations/{org_id}/projects", response_model=ProjectListResponse)
async def list_organization_projects(
    org_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectListResponse:
    """
    List all projects within a specific organization.

    Requires organization-level project:read permission.
    Prevents cross-organization data access.
    """
    projects = await service.list_projects_for_organization(principal, org_id)
    return ProjectListResponse(results=projects)


@router.post("/organizations/{org_id}/projects", response_model=ProjectResponse)
async def create_organization_project(
    org_id: str,
    project_request: ProjectCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Create a new project within a specific organization.

    Requires organization-level project:create permission.
    Project will be associated with the validated organization.
    """
    project = await service.create_project_for_organization(principal, org_id, project_request)
    return ProjectResponse.from_entity(project)


@router.get("/organizations/{org_id}/projects/{project_id}", response_model=ProjectResponse)
async def get_organization_project(
    org_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Get a specific project within an organization.

    Requires organization-level project:read permission.
    Validates that the project belongs to the specified organization.
    """
    project = await service.get_project_for_organization(principal, org_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectResponse.from_entity(project)


@router.put("/organizations/{org_id}/projects/{project_id}", response_model=ProjectResponse)
async def update_organization_project(
    org_id: str,
    project_id: str,
    project_request: ProjectCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Update a project within an organization.

    Requires organization-level project:update permission.
    Validates that the project belongs to the specified organization.
    """
    project = await service.update_project_for_organization(principal, org_id, project_id, project_request)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectResponse.from_entity(project)


@router.delete("/organizations/{org_id}/projects/{project_id}")
async def delete_organization_project(
    org_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> dict:
    """
    Delete a project within an organization.

    Requires organization-level project:delete permission.
    Validates that the project belongs to the specified organization.
    """
    success = await service.delete_project_for_organization(principal, org_id, project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return {"message": "Project deleted successfully"}


# Division-scoped endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/projects", response_model=ProjectListResponse)
async def list_division_projects(
    org_id: str,
    div_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectListResponse:
    """
    List all projects within a specific division.

    Requires division-level project:read permission.
    Prevents cross-division data access.
    """
    projects = await service.list_projects_for_division(principal, org_id, div_id)
    return ProjectListResponse(results=projects)


@router.post("/organizations/{org_id}/divisions/{div_id}/projects", response_model=ProjectResponse)
async def create_division_project(
    org_id: str,
    div_id: str,
    project_request: ProjectCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Create a new project within a specific division.

    Requires division-level project:create permission.
    Project will be associated with the validated division.
    """
    project = await service.create_project_for_division(principal, org_id, div_id, project_request)
    return ProjectResponse.from_entity(project)


@router.get("/organizations/{org_id}/divisions/{div_id}/projects/{project_id}", response_model=ProjectResponse)
async def get_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Get a specific project within a division.

    Requires division-level project:read permission.
    Validates that the project belongs to the specified division.
    """
    project = await service.get_project_for_division(principal, org_id, div_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectResponse.from_entity(project)


@router.put("/organizations/{org_id}/divisions/{div_id}/projects/{project_id}", response_model=ProjectResponse)
async def update_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    project_request: ProjectCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Update a project within a division.

    Requires division-level project:update permission.
    Validates that the project belongs to the specified division.
    """
    project = await service.update_project_for_division(principal, org_id, div_id, project_id, project_request)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectResponse.from_entity(project)


@router.delete("/organizations/{org_id}/divisions/{div_id}/projects/{project_id}")
async def delete_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> dict:
    """
    Delete a project within a division.

    Requires division-level project:delete permission.
    Validates that the project belongs to the specified division.
    """
    success = await service.delete_project_for_division(principal, org_id, div_id, project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return {"message": "Project deleted successfully"}
