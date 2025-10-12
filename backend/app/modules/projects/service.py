# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Project service contract. Replace mock data with real persistence when ready.
"""

from ...dependencies import CurrentPrincipal
from .repository import ProjectRepository
from .schemas import ProjectSummary


class ProjectService:
    """Encapsulates project domain behaviours."""

    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def list_projects(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        return await self._repository.list_for_principal(principal)
