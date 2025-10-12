# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Huddle domain service.
"""

from ...dependencies import CurrentPrincipal
from .repository import HuddleRepository
from .schemas import HuddleSummary


class HuddleService:
    def __init__(self, repository: HuddleRepository) -> None:
        self._repository = repository

    async def list_upcoming(self, principal: CurrentPrincipal) -> list[HuddleSummary]:
        return await self._repository.list_upcoming(principal)
