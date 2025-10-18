"""Dependency wiring for the workspace dashboard module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from ..workspace.di import get_workspace_permission_repository
from ..workspace.repository import WorkspacePermissionRepository
from .repository import DashboardRepository
from .service import DashboardService


async def get_dashboard_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> DashboardRepository:
    return DashboardRepository(session)


async def get_dashboard_service(
    repository: DashboardRepository = Depends(get_dashboard_repository),
    permission_repository: WorkspacePermissionRepository = Depends(get_workspace_permission_repository),
) -> DashboardService:
    return DashboardService(repository=repository, permission_repository=permission_repository)
