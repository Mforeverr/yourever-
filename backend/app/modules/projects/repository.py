# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Project repository abstractions.
"""

from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .models import ProjectModel
from .schemas import ProjectSummary


class ProjectRepository(Protocol):
    """Contract for persisting and retrieving projects."""

    async def list_for_principal(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        ...


class SQLAlchemyProjectRepository:
    """Project repository backed by SQLAlchemy."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_principal(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        query = select(ProjectModel)
        # TODO: Scope to principal once org/division claims are added to token.
        result = await self._session.execute(query)
        records = result.scalars().all()
        return [self._to_summary(record) for record in records]

    @staticmethod
    def _to_summary(record: ProjectModel) -> ProjectSummary:
        return ProjectSummary(
            id=record.id,
            name=record.name,
            status=record.status,
            org_id=record.org_id,
            division_id=record.division_id,
            updated_at=record.updated_at,
        )
