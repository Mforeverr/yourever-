# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
User service orchestrating repository access.
"""

from ...dependencies import CurrentPrincipal
from .repository import UserRepository
from .schemas import OnboardingSession, StoredOnboardingStatus, WorkspaceUser


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    async def _ensure_user(self, principal: CurrentPrincipal) -> WorkspaceUser:
        user = await self._repository.get_user(principal.id)
        if user:
            return user
        return await self._repository.create_user(principal)

    async def get_current_user(self, principal: CurrentPrincipal) -> WorkspaceUser:
        return await self._ensure_user(principal)

    async def get_onboarding_session(self, principal: CurrentPrincipal) -> OnboardingSession:
        await self._ensure_user(principal)
        return await self._repository.get_or_create_onboarding_session(principal.id)

    async def update_onboarding_progress(
        self,
        principal: CurrentPrincipal,
        status: StoredOnboardingStatus,
    ) -> OnboardingSession:
        await self._ensure_user(principal)
        return await self._repository.update_onboarding_status(principal.id, status)
