"""
Unit tests for UserService.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService
from app.modules.users.schemas import (
    OnboardingSession,
    StoredOnboardingStatus,
    UserProfileResponse,
)


@pytest.mark.unit
class TestUserService:
    """Test cases for UserService."""

    async def test_get_current_user_success(self, mock_principal):
        """Test getting current user successfully."""
        # Arrange
        mock_repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=mock_repository)

        expected_user = MagicMock()
        mock_repository.get_user.return_value = expected_user

        # Act
        result = await service.get_current_user(mock_principal)

        # Assert
        assert result == expected_user
        mock_repository.get_user.assert_called_once_with(mock_principal.id)

    async def test_get_current_user_not_found(self, mock_principal):
        """Test getting current user when user doesn't exist."""
        # Arrange
        mock_repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=mock_repository)

        mock_repository.get_user.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="User not found"):
            await service.get_current_user(mock_principal)

        mock_repository.get_user.assert_called_once_with(mock_principal.id)

    async def test_get_onboarding_session_success(self, mock_principal):
        """Test getting onboarding session successfully."""
        # Arrange
        mock_repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=mock_repository)

        expected_session = OnboardingSession(
            id="session-123",
            userId=mock_principal.id,
            currentStep="profile",
            isCompleted=False,
            startedAt="2023-01-01T00:00:00Z",
            completedAt=None,
            status=StoredOnboardingStatus()
        )
        mock_repository.get_or_create_onboarding_session.return_value = expected_session

        # Act
        result = await service.get_onboarding_session(mock_principal)

        # Assert
        assert result == expected_session
        mock_repository.get_or_create_onboarding_session.assert_called_once_with(mock_principal)

    async def test_update_onboarding_progress(self, mock_principal):
        """Test updating onboarding progress."""
        # Arrange
        mock_repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=mock_repository)

        status = StoredOnboardingStatus(
            completedSteps=["profile"],
            skippedSteps=[],
            lastStep="work-profile",
            completed=False
        )

        expected_session = OnboardingSession(
            id="session-456",
            userId=mock_principal.id,
            currentStep="work-profile",
            isCompleted=False,
            startedAt="2023-01-01T00:00:00Z",
            completedAt=None,
            status=status
        )
        mock_repository.update_onboarding_status.return_value = expected_session

        # Act
        result = await service.update_onboarding_progress(mock_principal, status)

        # Assert
        assert result == expected_session
        mock_repository.update_onboarding_status.assert_called_once_with(mock_principal.id, status)

    async def test_update_onboarding_progress_user_not_found(self, mock_principal):
        """Test updating onboarding progress when user doesn't exist."""
        # Arrange
        mock_repository = AsyncMock(spec=UserRepository)
        service = UserService(repository=mock_repository)

        status = StoredOnboardingStatus()

        # Mock update to return None (user not found, so create new session)
        mock_repository.update_onboarding_status.return_value = None

        # Act
        result = await service.update_onboarding_progress(mock_principal, status)

        # Assert
        assert result is not None  # Should create new session
        mock_repository.update_onboarding_status.assert_called_once_with(mock_principal.id, status)
        mock_repository.get_or_create_onboarding_session.assert_called_once_with(mock_principal.id)