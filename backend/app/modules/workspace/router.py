"""Workspace REST endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ...dependencies import CurrentPrincipal, require_current_principal
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

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


@router.get("/{org_id}/overview", response_model=WorkspaceOverview)
async def get_workspace_overview(
    org_id: str,
    division_id: str | None = Query(default=None, alias="divisionId"),
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceOverview:
    """Return projects, tasks, docs, and channels for a scope."""

    return await service.get_overview(
        principal=principal,
        org_id=org_id,
        division_id=division_id,
        include_templates=include_templates,
    )


@router.get(
    "/{org_id}/divisions/{division_id}/channels",
    response_model=ChannelListResponse,
)
async def list_division_channels(
    org_id: str,
    division_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200, alias="pageSize"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ChannelListResponse:
    """Return channels scoped to a division."""

    return await service.list_channels(
        principal=principal,
        org_id=org_id,
        division_id=division_id,
        include_templates=include_templates,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{org_id}/divisions/{division_id}/activities",
    response_model=ActivityFeedResponse,
)
async def get_activity_feed(
    org_id: str,
    division_id: str,
    include_templates: bool = Query(default=True, alias="includeTemplates"),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> ActivityFeedResponse:
    """Return activity feed entries for a division."""

    return await service.fetch_activity_feed(
        principal=principal,
        org_id=org_id,
        division_id=division_id,
        include_templates=include_templates,
        limit=limit,
        cursor=cursor,
    )


@router.post("/{org_id}/projects", response_model=WorkspaceProject, status_code=201)
async def create_project(
    org_id: str,
    payload: ProjectCreatePayload,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """Create a project for an organization."""

    return await service.create_project(principal=principal, org_id=org_id, payload=payload)


@router.patch("/projects/{project_id}", response_model=WorkspaceProject)
async def update_project(
    project_id: str,
    payload: ProjectUpdatePayload,
    org_id: str = Query(..., alias="orgId"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceProject:
    """Update a project and clear template flags."""

    return await service.update_project(
        principal=principal,
        project_id=project_id,
        org_id=org_id,
        payload=payload,
    )


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    org_id: str = Query(..., alias="orgId"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """Delete a project."""

    await service.delete_project(principal=principal, project_id=project_id, org_id=org_id)


@router.post("/{org_id}/channels", response_model=WorkspaceChannel, status_code=201)
async def create_channel(
    org_id: str,
    payload: ChannelCreatePayload,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """Create a channel."""

    return await service.create_channel(principal=principal, org_id=org_id, payload=payload)


@router.patch("/channels/{channel_id}", response_model=WorkspaceChannel)
async def update_channel(
    channel_id: str,
    payload: ChannelUpdatePayload,
    org_id: str = Query(..., alias="orgId"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceChannel:
    """Update a channel."""

    return await service.update_channel(
        principal=principal,
        channel_id=channel_id,
        org_id=org_id,
        payload=payload,
    )


@router.delete("/channels/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    org_id: str = Query(..., alias="orgId"),
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: WorkspaceService = Depends(get_workspace_service),
) -> None:
    """Delete a channel."""

    await service.delete_channel(principal=principal, channel_id=channel_id, org_id=org_id)
