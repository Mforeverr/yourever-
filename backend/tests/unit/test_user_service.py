"""Unit tests for UserService."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.onboarding.errors import OnboardingRevisionConflict, OnboardingValidationError
from app.modules.onboarding.schemas import OnboardingCompletionResponse
from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService
from app.modules.users.schemas import OnboardingSession, StoredOnboardingStatus


@pytest.mark.unit
class TestUserService:
    """Test cases for the onboarding behaviours in UserService."""

    @staticmethod
    def _session(
        principal_id: str,
        *,
        revision: str | None,
        last_step: str = "profile",
        completed: bool = False,
    ) -> OnboardingSession:
        status = StoredOnboardingStatus(
            revision=revision,
            completedSteps=[last_step] if last_step != "profile" else [],
            skippedSteps=[],
            lastStep=last_step,
            completed=completed,
        )
        return OnboardingSession(
            id="session-1",
            userId=principal_id,
            currentStep=last_step,
            isCompleted=completed,
            startedAt="2023-01-01T00:00:00Z",
            completedAt=None,
            status=status,
        )

    async def test_get_current_user_success(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)

        expected_user = MagicMock()
        repository.get_user.return_value = expected_user

        result = await service.get_current_user(mock_principal)

        assert result == expected_user
        repository.get_user.assert_awaited_once_with(mock_principal.id)

    async def test_get_onboarding_session_success(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)

        repository.get_user.return_value = MagicMock()
        expected_session = self._session(mock_principal.id, revision="rev-current")
        repository.get_or_create_onboarding_session.return_value = expected_session

        result = await service.get_onboarding_session(mock_principal)

        assert result == expected_session
        repository.get_or_create_onboarding_session.assert_awaited_once_with(mock_principal.id)

    async def test_update_onboarding_progress_generates_new_revision(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)
        repository.get_user.return_value = MagicMock()

        existing_session = self._session(mock_principal.id, revision="rev-a")
        repository.get_or_create_onboarding_session.return_value = existing_session

        submitted_status = StoredOnboardingStatus(
            revision="rev-a",
            completedSteps=["profile"],
            skippedSteps=[],
            lastStep="profile",
        )

        async def update_status(_: str, new_status: StoredOnboardingStatus) -> OnboardingSession:
            return OnboardingSession(
                id="session-2",
                userId=mock_principal.id,
                currentStep=new_status.lastStep or "profile",
                isCompleted=new_status.completed,
                startedAt="2023-01-01T00:00:00Z",
                completedAt=None,
                status=new_status,
            )

        repository.update_onboarding_status.side_effect = update_status

        result = await service.update_onboarding_progress(mock_principal, submitted_status)

        repository.get_or_create_onboarding_session.assert_awaited_once_with(mock_principal.id)
        repository.update_onboarding_status.assert_awaited()
        persisted_status = repository.update_onboarding_status.call_args.args[1]
        assert persisted_status.revision
        assert persisted_status.revision != submitted_status.revision
        assert isinstance(result, OnboardingSession)
        assert result.status.revision == persisted_status.revision

    async def test_update_onboarding_progress_conflict(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)
        repository.get_user.return_value = MagicMock()

        repository.get_or_create_onboarding_session.return_value = self._session(
            mock_principal.id,
            revision="rev-current",
        )

        submitted_status = StoredOnboardingStatus(
            revision="rev-stale",
            completedSteps=["profile"],
            skippedSteps=[],
            lastStep="profile",
        )

        with pytest.raises(OnboardingRevisionConflict):
            await service.update_onboarding_progress(mock_principal, submitted_status)

        repository.update_onboarding_status.assert_not_awaited()

    async def test_complete_onboarding_success(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)
        repository.get_user.return_value = MagicMock()

        repository.get_or_create_onboarding_session.return_value = self._session(
            mock_principal.id,
            revision="rev-one",
        )

        submitted_status = StoredOnboardingStatus(
            revision="rev-one",
            completedSteps=["profile", "work-profile"],
            skippedSteps=[],
            lastStep="workspace-hub",
            completed=True,
        )

        async def complete_status(_: str, new_status: StoredOnboardingStatus, answers):
            return OnboardingSession(
                id="session-3",
                userId=mock_principal.id,
                currentStep=new_status.lastStep or "workspace-hub",
                isCompleted=True,
                startedAt="2023-01-01T00:00:00Z",
                completedAt="2023-01-01T00:10:00Z",
                status=new_status,
            )

        repository.complete_onboarding.side_effect = complete_status

        result = await service.complete_onboarding(mock_principal, submitted_status, answers={})

        repository.get_or_create_onboarding_session.assert_awaited_once_with(mock_principal.id)
        repository.complete_onboarding.assert_awaited()
        persisted_status = repository.complete_onboarding.call_args.args[1]
        assert persisted_status.revision
        assert persisted_status.revision != submitted_status.revision
        assert isinstance(result, OnboardingCompletionResponse)
        assert result.session.status.revision == persisted_status.revision

    async def test_complete_onboarding_conflict(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)
        repository.get_user.return_value = MagicMock()

        repository.get_or_create_onboarding_session.return_value = self._session(
            mock_principal.id,
            revision="rev-live",
        )

        submitted_status = StoredOnboardingStatus(
            revision="rev-old",
            completedSteps=["profile"],
            skippedSteps=[],
            lastStep="workspace-hub",
            completed=False,
        )

        with pytest.raises(OnboardingRevisionConflict):
            await service.complete_onboarding(mock_principal, submitted_status, answers={})

        repository.complete_onboarding.assert_not_awaited()

    async def test_complete_onboarding_validation_error(self, mock_principal):
        repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=repository)
        repository.get_user.return_value = MagicMock()
        repository.get_or_create_onboarding_session.return_value = self._session(
            mock_principal.id,
            revision="rev-live",
        )

        invalid_status = StoredOnboardingStatus(
            revision="rev-live",
            completedSteps=["profile"],
            skippedSteps=[],
            lastStep="workspace-hub",
            completed=False,
        )

        with pytest.raises(OnboardingValidationError):
            await service.complete_onboarding(mock_principal, invalid_status, answers={})

        repository.complete_onboarding.assert_not_awaited()
