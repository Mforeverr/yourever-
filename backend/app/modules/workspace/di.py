"""Dependency wiring for workspace module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from .repository import WorkspacePermissionRepository, WorkspaceRepository
from .service import WorkspaceService, WorkspaceTemplateService


async def get_workspace_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> WorkspaceRepository:
    return WorkspaceRepository(session)


async def get_workspace_permission_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> WorkspacePermissionRepository:
    return WorkspacePermissionRepository(session)


async def get_workspace_service(
    repository: WorkspaceRepository = Depends(get_workspace_repository),
    permission_repository: WorkspacePermissionRepository = Depends(get_workspace_permission_repository),
) -> WorkspaceService:
    return WorkspaceService(repository=repository, permission_repository=permission_repository)


async def get_workspace_template_service(
    session: AsyncSession = Depends(db_session_dependency),
) -> WorkspaceTemplateService:
    return WorkspaceTemplateService(session)
