# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Workspace REST endpoints with comprehensive scope validation.

This module implements secure workspace management operations following REST principles
and the Open/Closed Pattern. All endpoints require proper scope validation to prevent
cross-tenant access and ensure security compliance.

Security Implementation:
- Organization-scoped workspace operations: /api/organizations/{org_id}/workspace
- Division-scoped workspace operations: /api/organizations/{org_id}/divisions/{div_id}/workspace
- Cross-tenant prevention via scope guard validation
- Audit logging for security violations
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException, status

from ...core.scope_integration import require_organization_access_with_id, require_division_access_with_ids
from ...dependencies import CurrentPrincipal, require_current_principal
from ...core.scope import ScopeContext
from .di import get_workspace_service
from .schemas import (
    ActivityFeedResponse,
    ChannelCreatePayload,
    ChannelListResponse,
    ChannelUpdatePayload,
    ProjectCreatePayload,
    ProjectUpdatePayload,
    WorkspaceOverview,
    WorkspaceProject,
    WorkspaceChannel,
)
from .service import WorkspaceService

router = APIRouter(prefix="/api", tags=["workspaces"])


# Organization-scoped workspace endpoints
@router.get("/organizations/{org_id}/workspace/overview", response_model=WorkspaceOverview)
async def get_organization_workspace_overview(
    org_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceOverview:
    """
    Return workspace overview for an organization.

    Requires organization-level workspace:read permission.
    Returns projects, tasks, docs, and channels for the organization scope.
    Prevents cross-organization workspace data access.
    """
    return await service.get_overview(
        principal=principal,
        org_id=org_id,
        division_id=None,
        include_templates=include_templates,
    )


@router.get("/organizations/{org_id}/workspace/channels", response_model=ChannelListResponse)
async def list_organization_channels(
    org_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200, alias="pageSize"),
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ChannelListResponse:
    """
    Return channels scoped to an organization.

    Requires organization-level workspace:read permission.
    Prevents cross-organization channel data access.
    """
    return await service.list_channels(
        principal=principal,
        org_id=org_id,
        division_id=None,
        include_templates=include_templates,
        page=page,
        page_size=page_size,
    )


@router.get("/organizations/{org_id}/workspace/activities", response_model=ActivityFeedResponse)
async def get_organization_activity_feed(
    org_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ActivityFeedResponse:
    """
    Return activity feed entries for an organization.

    Requires organization-level workspace:read permission.
    Prevents cross-organization activity data access.
    """
    return await service.fetch_activity_feed(
        principal=principal,
        org_id=org_id,
        division_id=None,
        include_templates=include_templates,
        limit=limit,
        cursor=cursor,
    )


@router.post("/organizations/{org_id}/workspace/projects", response_model=WorkspaceProject, status_code=201)
async def create_organization_project(
    org_id: str,
    payload: ProjectCreatePayload,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """
    Create a project for an organization.

    Requires organization-level project:create permission.
    Project will be associated with the validated organization scope.
    """
    return await service.create_project(principal=principal, org_id=org_id, payload=payload)


@router.post("/organizations/{org_id}/workspace/channels", response_model=WorkspaceChannel, status_code=201)
async def create_organization_channel(
    org_id: str,
    payload: ChannelCreatePayload,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"channel:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """
    Create a channel for an organization.

    Requires organization-level channel:create permission.
    Channel will be associated with the validated organization scope.
    """
    return await service.create_channel(principal=principal, org_id=org_id, payload=payload)


@router.patch("/organizations/{org_id}/workspace/projects/{project_id}", response_model=WorkspaceProject)
async def update_organization_project(
    org_id: str,
    project_id: str,
    payload: ProjectUpdatePayload,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """
    Update a project within an organization.

    Requires organization-level project:update permission.
    Validates that the project belongs to the specified organization.
    """
    project = await service.update_project(
        principal=principal,
        project_id=project_id,
        org_id=org_id,
        payload=payload,
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return project


@router.patch("/organizations/{org_id}/workspace/channels/{channel_id}", response_model=WorkspaceChannel)
async def update_organization_channel(
    org_id: str,
    channel_id: str,
    payload: ChannelUpdatePayload,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"channel:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """
    Update a channel within an organization.

    Requires organization-level channel:update permission.
    Validates that the channel belongs to the specified organization.
    """
    channel = await service.update_channel(
        principal=principal,
        channel_id=channel_id,
        org_id=org_id,
        payload=payload,
    )
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
            code="channel_not_found"
        )
    return channel


@router.delete("/organizations/{org_id}/workspace/projects/{project_id}", status_code=204)
async def delete_organization_project(
    org_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"project:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """
    Delete a project within an organization.

    Requires organization-level project:delete permission.
    Validates that the project belongs to the specified organization.
    """
    success = await service.delete_project(principal=principal, project_id=project_id, org_id=org_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )


@router.delete("/organizations/{org_id}/workspace/channels/{channel_id}", status_code=204)
async def delete_organization_channel(
    org_id: str,
    channel_id: str,
    scope_ctx: ScopeContext = Depends(require_organization_access_with_id({"channel:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """
    Delete a channel within an organization.

    Requires organization-level channel:delete permission.
    Validates that the channel belongs to the specified organization.
    """
    success = await service.delete_channel(principal=principal, channel_id=channel_id, org_id=org_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
            code="channel_not_found"
        )


# Division-scoped workspace endpoints
@router.get("/organizations/{org_id}/divisions/{div_id}/workspace/overview", response_model=WorkspaceOverview)
async def get_division_workspace_overview(
    org_id: str,
    div_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceOverview:
    """
    Return workspace overview for a division.

    Requires division-level workspace:read permission.
    Returns projects, tasks, docs, and channels for the division scope.
    Prevents cross-division workspace data access.
    """
    return await service.get_overview(
        principal=principal,
        org_id=org_id,
        division_id=div_id,
        include_templates=include_templates,
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/workspace/channels", response_model=ChannelListResponse)
async def list_division_channels(
    org_id: str,
    div_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200, alias="pageSize"),
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ChannelListResponse:
    """
    Return channels scoped to a division.

    Requires division-level workspace:read permission.
    Prevents cross-division channel data access.
    """
    return await service.list_channels(
        principal=principal,
        org_id=org_id,
        division_id=div_id,
        include_templates=include_templates,
        page=page,
        page_size=page_size,
    )


@router.get("/organizations/{org_id}/divisions/{div_id}/workspace/activities", response_model=ActivityFeedResponse)
async def get_division_activity_feed(
    org_id: str,
    div_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"workspace:read"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ActivityFeedResponse:
    """
    Return activity feed entries for a division.

    Requires division-level workspace:read permission.
    Prevents cross-division activity data access.
    """
    return await service.fetch_activity_feed(
        principal=principal,
        org_id=org_id,
        division_id=div_id,
        include_templates=include_templates,
        limit=limit,
        cursor=cursor,
    )


@router.post("/organizations/{org_id}/divisions/{div_id}/workspace/projects", response_model=WorkspaceProject, status_code=201)
async def create_division_project(
    org_id: str,
    div_id: str,
    payload: ProjectCreatePayload,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """
    Create a project for a division.

    Requires division-level project:create permission.
    Project will be associated with the validated division scope.
    """
    return await service.create_project_for_division(principal=principal, org_id=org_id, div_id=div_id, payload=payload)


@router.post("/organizations/{org_id}/divisions/{div_id}/workspace/channels", response_model=WorkspaceChannel, status_code=201)
async def create_division_channel(
    org_id: str,
    div_id: str,
    payload: ChannelCreatePayload,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"channel:create"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """
    Create a channel for a division.

    Requires division-level channel:create permission.
    Channel will be associated with the validated division scope.
    """
    return await service.create_channel_for_division(principal=principal, org_id=org_id, div_id=div_id, payload=payload)


@router.patch("/organizations/{org_id}/divisions/{div_id}/workspace/projects/{project_id}", response_model=WorkspaceProject)
async def update_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    payload: ProjectUpdatePayload,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """
    Update a project within a division.

    Requires division-level project:update permission.
    Validates that the project belongs to the specified division.
    """
    project = await service.update_project_for_division(
        principal=principal,
        project_id=project_id,
        org_id=org_id,
        div_id=div_id,
        payload=payload,
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )
    return project


@router.patch("/organizations/{org_id}/divisions/{div_id}/workspace/channels/{channel_id}", response_model=WorkspaceChannel)
async def update_division_channel(
    org_id: str,
    div_id: str,
    channel_id: str,
    payload: ChannelUpdatePayload,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"channel:update"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """
    Update a channel within a division.

    Requires division-level channel:update permission.
    Validates that the channel belongs to the specified division.
    """
    channel = await service.update_channel_for_division(
        principal=principal,
        channel_id=channel_id,
        org_id=org_id,
        div_id=div_id,
        payload=payload,
    )
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
            code="channel_not_found"
        )
    return channel


@router.delete("/organizations/{org_id}/divisions/{div_id}/workspace/projects/{project_id}", status_code=204)
async def delete_division_project(
    org_id: str,
    div_id: str,
    project_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"project:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """
    Delete a project within a division.

    Requires division-level project:delete permission.
    Validates that the project belongs to the specified division.
    """
    success = await service.delete_project_for_division(principal=principal, project_id=project_id, org_id=org_id, div_id=div_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
            code="project_not_found"
        )


@router.delete("/organizations/{org_id}/divisions/{div_id}/workspace/channels/{channel_id}", status_code=204)
async def delete_division_channel(
    org_id: str,
    div_id: str,
    channel_id: str,
    scope_ctx: ScopeContext = Depends(require_division_access_with_ids({"channel:delete"})),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """
    Delete a channel within a division.

    Requires division-level channel:delete permission.
    Validates that the channel belongs to the specified division.
    """
    success = await service.delete_channel_for_division(principal=principal, channel_id=channel_id, org_id=org_id, div_id=div_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found",
            code="channel_not_found"
        )
