# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
User service orchestrating repository access.
"""

from typing import Any, Dict, Optional

from ...dependencies import CurrentPrincipal
from .repository import UserRepository
from .schemas import OnboardingSession, StoredOnboardingStatus, WorkspaceUser
from ..onboarding.errors import OnboardingValidationError
from ..onboarding.schemas import OnboardingCompletionResponse
from ..onboarding.validation import evaluate_completion_validation


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

    async def complete_onboarding(
        self,
        principal: CurrentPrincipal,
        status: StoredOnboardingStatus,
        answers: Optional[Dict[str, Any]] = None,
    ) -> OnboardingCompletionResponse:
        await self._ensure_user(principal)
        validation = evaluate_completion_validation(status, answers)
        if validation.hasBlockingIssue:
            raise OnboardingValidationError(validation)

        session = await self._repository.complete_onboarding(principal.id, status, answers)
        return OnboardingCompletionResponse(session=session, validation=validation)
