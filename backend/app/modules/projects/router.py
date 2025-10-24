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

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_project_service
from .schemas import (
    ProjectListResponse,
    ProjectCreateRequest,
    ProjectResponse,
    ProjectUpdateRequest,
    ProjectWorkspaceSnapshot,
    WorkspaceViewsList,
    WorkspaceViewCreateRequest,
    WorkspaceViewUpdateRequest,
    WorkspaceView,
    ProjectMember,
    ProjectMemberRole,
    ProjectMemberAddRequest,
    ProjectMemberUpdateRequest,
    ProjectDetailEnvelope,
)
from .service import ProjectService
from .error_handlers import handle_service_error
from .errors import ProjectError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["projects"])


# Organization-scoped endpoints
@router.get("/organizations/{org_id}/projects", response_model=ProjectListResponse)
async def list_organization_projects(
    org_id: str,
    page: int = Query(default=1, ge=1, description="Page number for pagination"),
    per_page: int = Query(default=25, ge=1, le=100, description="Items per page"),
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectListResponse:
    """
    List all projects within a specific organization.

    Requires organization-level project:read permission.
    Prevents cross-organization data access.
    """
    try:
        projects = await service.list_projects_for_organization(principal, org_id)
        return ProjectListResponse(results=projects)
    except ProjectError as e:
        raise handle_service_error(e)


@router.post("/organizations/{org_id}/projects", response_model=ProjectDetailEnvelope)
async def create_organization_project(
    org_id: str,
    project_request: ProjectCreateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectDetailEnvelope:
    """
    Create a new project within a specific organization.

    Requires organization-level project:create permission.
    Project will be associated with the validated organization.
    """
    try:
        project = await service.create_project_for_organization(principal, org_id, project_request)
        response = ProjectDetailEnvelope.from_project(project)
        logger.info(
            "projects.create_organization_project.success",
            extra={"project": response.model_dump(by_alias=True)}
        )
        return response
    except ProjectError as e:
        raise handle_service_error(e)


@router.get("/organizations/{org_id}/projects/{project_id}", response_model=ProjectDetailEnvelope)
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
    return ProjectDetailEnvelope.from_project(project)


@router.patch("/organizations/{org_id}/projects/{project_id}", response_model=ProjectDetailEnvelope)
async def update_organization_project(
    org_id: str,
    project_id: str,
    project_request: ProjectUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Update a project within an organization using PATCH for partial updates.

    Requires organization-level project:update permission.
    Validates that the project belongs to the specified organization.
    Only provided fields will be updated; undefined fields remain unchanged.
    """
    project = await service.update_project_for_organization(principal, org_id, project_id, project_request)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectDetailEnvelope.from_project(project)


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


@router.post("/organizations/{org_id}/divisions/{div_id}/projects", response_model=ProjectDetailEnvelope)
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
    response = ProjectDetailEnvelope.from_project(project)
    logger.info(
        "projects.create_division_project.success",
        extra={"project": response.model_dump(by_alias=True)}
    )
    return response


@router.get("/organizations/{org_id}/divisions/{div_id}/projects/{project_id}", response_model=ProjectDetailEnvelope)
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
    return ProjectDetailEnvelope.from_project(project)


@router.patch("/organizations/{org_id}/divisions/{div_id}/projects/{project_id}", response_model=ProjectDetailEnvelope)
async def update_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    project_request: ProjectUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """
    Update a project within a division using PATCH for partial updates.

    Requires division-level project:update permission.
    Validates that the project belongs to the specified division.
    Only provided fields will be updated; undefined fields remain unchanged.
    """
    project = await service.update_project_for_division(principal, org_id, div_id, project_id, project_request)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return ProjectDetailEnvelope.from_project(project)


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


# Project Workspace Management Endpoints

@router.get(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/workspace",
    response_model=ProjectWorkspaceSnapshot,
    responses={
        404: {"description": "Project not found or access denied"},
        409: {"description": "Project workspace access disabled"},
        503: {"description": "Service temporarily unavailable"}
    }
)
async def get_project_workspace_snapshot(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectWorkspaceSnapshot:
    """
    Get comprehensive project workspace snapshot.

    This endpoint delivers project metadata, members, active views, and capability flags
    in a single payload for UI initialization. This is the primary endpoint for loading
    a project workspace.

    Requires division-level project:read permission.
    Validates that the project belongs to the specified division.
    """
    workspace = await service.get_project_workspace_snapshot(principal, org_id, div_id, project_id)
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )
    return workspace


# Workspace Views Management Endpoints

@router.get(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/views",
    response_model=WorkspaceViewsList,
    responses={
        404: {"description": "Project not found or access denied"}
    }
)
async def list_workspace_views(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> WorkspaceViewsList:
    """
    List all workspace views for a project.

    Returns all available views (board, list, timeline, calendar, mindmap, docs)
    for the specified project with their configurations.

    Requires division-level project:read permission.
    """
    views_list = await service.list_workspace_views(principal, org_id, div_id, project_id)
    if not views_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )
    return views_list


@router.post(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/views",
    response_model=WorkspaceView,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Project not found or access denied"},
        403: {"description": "Insufficient permissions to create views"}
    }
)
async def create_workspace_view(
    org_id: str,
    div_id: str,
    project_id: str,
    view_request: WorkspaceViewCreateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> WorkspaceView:
    """
    Create a new workspace view for a project.

    Supports creating views of type: board, list, timeline, calendar, mindmap, docs.
    Each view has its own configuration settings and layout preferences.

    Requires division-level project:update permission.
    """
    view = await service.create_workspace_view(principal, org_id, div_id, project_id, view_request)
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )
    return view


@router.get(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/views/{view_id}",
    response_model=WorkspaceView,
    responses={
        404: {"description": "View not found or access denied"}
    }
)
async def get_workspace_view(
    org_id: str,
    div_id: str,
    project_id: str,
    view_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> WorkspaceView:
    """
    Get a specific workspace view.

    Returns detailed configuration for a specific workspace view,
    including layout settings, filters, and preferences.

    Requires division-level project:read permission.
    """
    views_list = await service.list_workspace_views(principal, org_id, div_id, project_id)
    if not views_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )

    view = next((v for v in views_list.views if v.id == view_id), None)
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="View not found",
            code="view_not_found"
        )
    return view


@router.patch(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/views/{view_id}",
    response_model=WorkspaceView,
    responses={
        404: {"description": "View not found or access denied"},
        403: {"description": "Insufficient permissions to update views"}
    }
)
async def update_workspace_view(
    org_id: str,
    div_id: str,
    project_id: str,
    view_id: str,
    view_request: WorkspaceViewUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> WorkspaceView:
    """
    Update an existing workspace view.

    Allows updating view name, default status, and configuration settings.
    Use PATCH for partial updates to preserve existing settings.

    Requires division-level project:update permission.
    """
    view = await service.update_workspace_view(principal, org_id, div_id, project_id, view_id, view_request)
    if not view:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="View not found or access denied",
            code="view_not_found"
        )
    return view


@router.delete(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/views/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"description": "View not found or access denied"},
        403: {"description": "Insufficient permissions to delete views"}
    }
)
async def delete_workspace_view(
    org_id: str,
    div_id: str,
    project_id: str,
    view_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> None:
    """
    Delete a workspace view.

    Permanently removes a workspace view and its configuration.
    The underlying tasks and data remain untouched - only the view is deleted.

    Requires division-level project:update permission.
    """
    success = await service.delete_workspace_view(principal, org_id, div_id, project_id, view_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="View not found or access denied",
            code="view_not_found"
        )
    # Return 204 No Content on successful deletion


# Project Membership Management Endpoints

@router.get(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/members",
    response_model=list[ProjectMember],
    responses={
        404: {"description": "Project not found or access denied"},
        403: {"description": "Insufficient permissions to view members"}
    }
)
async def list_project_members(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectMember]:
    """
    List all members of a project.

    Returns a list of all users who are members of the specified project,
    including their roles and membership timestamps.

    Requires division-level project:read permission.
    """
    # First validate project access
    project = await service.get_project_for_division(principal, org_id, div_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )

    return await service.get_project_members(project_id)


@router.post(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/members",
    response_model=ProjectMember,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"description": "Project not found or access denied"},
        403: {"description": "Insufficient permissions to manage members"},
        400: {"description": "Invalid member data or user already exists"}
    }
)
async def add_project_member(
    org_id: str,
    div_id: str,
    project_id: str,
    member_request: ProjectMemberAddRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:manage"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectMember:
    """
    Add a new member to a project.

    Adds a user to the project with the specified role. The user must already
    exist in the system and have access to the parent organization/division.

    Requires division-level project:manage permission.
    """
    # First validate project access
    project = await service.get_project_for_division(principal, org_id, div_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )

    member = await service.add_project_member(
        project_id, member_request.user_id, member_request.role, principal.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add member. User may not exist or already be a member.",
            code="add_member_failed"
        )

    return member


@router.patch(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/members/{user_id}",
    response_model=ProjectMember,
    responses={
        404: {"description": "Project or member not found or access denied"},
        403: {"description": "Insufficient permissions to manage members"},
        400: {"description": "Invalid role update"}
    }
)
async def update_project_member_role(
    org_id: str,
    div_id: str,
    project_id: str,
    user_id: str,
    role_update: ProjectMemberUpdateRequest,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:manage"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> ProjectMember:
    """
    Update a project member's role.

    Changes the role of an existing project member. Cannot change the role
    of the project owner.

    Requires division-level project:manage permission.
    """
    # First validate project access
    project = await service.get_project_for_division(principal, org_id, div_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )

    member = await service.update_project_member_role(
        project_id, user_id, role_update.role, principal.id
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or cannot be updated",
            code="member_not_found"
        )

    return member


@router.delete(
    "/organizations/{org_id}/divisions/{div_id}/projects/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"description": "Project or member not found or access denied"},
        403: {"description": "Insufficient permissions to manage members"},
        400: {"description": "Cannot remove project owner"}
    }
)
async def remove_project_member(
    org_id: str,
    div_id: str,
    project_id: str,
    user_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:manage"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ProjectService = Depends(get_project_service),
) -> None:
    """
    Remove a member from a project.

    Removes a user from the project. Cannot remove the project owner.
    The owner can only be changed by transferring ownership.

    Requires division-level project:manage permission.
    """
    # First validate project access
    project = await service.get_project_for_division(principal, org_id, div_id, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied",
            code="project_not_found"
        )

    success = await service.remove_project_member(project_id, user_id, principal.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove member. Member may be the project owner or does not exist.",
            code="remove_member_failed"
        )
    # Return 204 No Content on successful deletion
