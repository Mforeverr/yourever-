# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Dependency wiring for the projects module.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from .repository import ProjectRepository, SQLAlchemyProjectRepository
from .service import ProjectService


async def get_project_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> ProjectRepository:
    return SQLAlchemyProjectRepository(session=session)


async def get_project_service(
    repository: ProjectRepository = Depends(get_project_repository),
) -> ProjectService:
    return ProjectService(repository=repository)
