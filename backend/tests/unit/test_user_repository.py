"""
Unit tests for UserRepository.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.constants import (
    CURRENT_ONBOARDING_STATUS_VERSION,
    LEGACY_ONBOARDING_STATUS_VERSION,
)
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    StoredOnboardingStatus,
    WorkspaceDivision,
    WorkspaceOrganization,
    WorkspaceUser,
)


@pytest.mark.unit
class TestUserRepository:
    """Test cases for UserRepository."""

    async def test_get_user_not_found(self, test_db_session: AsyncSession):
        """Test getting a non-existent user returns None."""
        repository = UserRepository(test_db_session)

        result = await repository.get_user("00000000-0000-0000-0000-000000000000")

        assert result is None

    async def test_get_user_found(self, test_db_session: AsyncSession):
        """Test getting an existing user returns user data."""
        repository = UserRepository(test_db_session)

        # Create a test user
        user_id = "12345678-1234-1234-1234-123456789abc"
        user_email = "test@example.com"

        # Insert test user data directly
        insert_query = text("""
            INSERT INTO public.users (id, email, name, display_name, full_name, avatar_url, timezone, role, created_at, updated_at)
            VALUES (:user_id, :email, :name, :display_name, :full_name, :avatar_url, :timezone, :role, NOW(), NOW())
            RETURNING id, email, name, display_name, full_name, avatar_url, timezone, role, created_at, updated_at
        """)

        await test_db_session.execute(insert_query, {
            "user_id": user_id,
            "email": user_email,
            "name": "Test User",
            "display_name": "Test User",
            "full_name": "Test User",
            "avatar_url": None,
            "timezone": "UTC",
            "role": "user",
        })
        await test_db_session.commit()

        # Test the repository method
        result = await repository.get_user(user_id)

        assert result is not None
        assert result.id == user_id
        assert result.email == user_email
        assert result.firstName == "Test"
        assert result.lastName == "User"
        assert result.displayName == "Test User"
        assert result.role == "user"

    def test_split_name(self):
        """Test name splitting functionality."""
        repository = UserRepository(None)  # None for pure function testing

        # Test full name with first and last name
        result = repository._split_name("John Doe")
        assert result["first_name"] == "John"
        assert result["last_name"] == "Doe"
        assert result["full_name"] == "John Doe"
        assert result["display_name"] == "John Doe"

        # Test single name
        result = repository._split_name("John")
        assert result["first_name"] == "John"
        assert result["last_name"] == ""
        assert result["full_name"] == "John"
        assert result["display_name"] == "John"

        # Test empty name
        result = repository._split_name("")
        assert result["first_name"] == ""
        assert result["last_name"] == ""
        assert result["full_name"] == ""
        assert result["display_name"] == ""

    async def test_get_or_create_onboarding_session_new(self, test_db_session: AsyncSession):
        """Test creating a new onboarding session."""
        repository = UserRepository(test_db_session)
        user_id = "45678901-1234-1234-1234-123456789abc"

        result = await repository.get_or_create_onboarding_session(user_id)

        assert result is not None
        assert result.userId == user_id
        assert result.currentStep in ["profile", "work-profile"]  # Default steps
        assert result.isCompleted is False
        assert result.startedAt is not None
        assert result.completedAt is None
        assert result.status is not None
        assert isinstance(result.status, StoredOnboardingStatus)
        assert result.status.version == CURRENT_ONBOARDING_STATUS_VERSION

    async def test_get_or_create_onboarding_session_existing(self, test_db_session: AsyncSession):
        """Test getting an existing onboarding session."""
        repository = UserRepository(test_db_session)
        user_id = "78901234-1234-1234-1234-123456789abc"

        # Create an existing session
        first_result = await repository.get_or_create_onboarding_session(user_id)

        # Get the same session again
        second_result = await repository.get_or_create_onboarding_session(user_id)

        assert second_result is not None
        assert second_result.id == first_result.id
        assert second_result.userId == user_id

    async def test_update_onboarding_status(self, test_db_session: AsyncSession):
        """Test updating onboarding status."""
        repository = UserRepository(test_db_session)
        user_id = "99901234-1234-1234-1234-123456789abc"

        # Create initial session
        initial_session = await repository.get_or_create_onboarding_session(user_id)

        # Create new status
        new_status = StoredOnboardingStatus(
            completedSteps=["profile", "work-profile"],
            skippedSteps=[],
            lastStep="preferences",
            completed=False
        )

        # Update the session
        updated_session = await repository.update_onboarding_status(user_id, new_status)

        assert updated_session is not None
        assert updated_session.id == initial_session.id
        assert updated_session.userId == user_id
        assert updated_session.currentStep == "preferences"
        assert updated_session.status.completedSteps == ["profile", "work-profile"]
        assert updated_session.status.lastStep == "preferences"
        assert updated_session.status.version == CURRENT_ONBOARDING_STATUS_VERSION

    async def test_complete_onboarding(self, test_db_session: AsyncSession):
        """Test marking onboarding as complete persists answers and status."""
        repository = UserRepository(test_db_session)
        user_id = "88801234-1234-1234-1234-123456789abc"

        await repository.get_or_create_onboarding_session(user_id)

        status = StoredOnboardingStatus(
            completedSteps=["profile", "work-profile", "preferences", "workspace-hub"],
            skippedSteps=["tools"],
            lastStep="workspace-hub",
            completed=False,
            data={
                "profile": {"firstName": "Ada", "lastName": "Lovelace", "role": "Founder"},
            },
        )

        answers = {
            "profile": {"firstName": "Ada"},
            "workspaceHub": {"choice": "create-new"},
        }

        completed_session = await repository.complete_onboarding(user_id, status, answers)

        assert completed_session.isCompleted is True
        assert completed_session.status.completed is True
        assert completed_session.status.lastStep == "workspace-hub"
        assert completed_session.status.version == CURRENT_ONBOARDING_STATUS_VERSION

    def test_normalize_status_payload(self):
        """Test status payload normalization."""
        repository = UserRepository(None)  # None for pure function testing

        # Test snake_case to camelCase conversion
        snake_case_payload = {
            "completed_steps": ["profile"],
            "skipped_steps": [],
            "last_step": "work-profile",
        }

        normalized = repository._normalize_status_payload(snake_case_payload)

        assert "completedSteps" in normalized
        assert "skippedSteps" in normalized
        assert "lastStep" in normalized
        assert normalized["completedSteps"] == ["profile"]
        assert normalized["skippedSteps"] == []
        assert normalized["lastStep"] == "work-profile"
        assert normalized["version"] == LEGACY_ONBOARDING_STATUS_VERSION

    def test_merge_divisions(self):
        """Test merging division lists."""
        repository = UserRepository(None)  # None for pure function testing

        # Create base divisions
        base_divisions = [
            WorkspaceDivision(
                id="div-1",
                name="Engineering",
                key="engineering",
                description="Engineering team",
                orgId="org-1"
            ),
            WorkspaceDivision(
                id="div-2",
                name="Marketing",
                key="marketing",
                description="Marketing team",
                orgId="org-1"
            )
        ]

        # Create membership divisions with user roles
        membership_divisions = [
            WorkspaceDivision(
                id="div-1",
                name="Engineering",
                key="engineering",
                description="Engineering team",
                orgId="org-1",
                userRole="lead"
            ),
            WorkspaceDivision(
                id="div-3",
                name="Sales",
                key="sales",
                description="Sales team",
                orgId="org-1",
                userRole="member"
            )
        ]

        # Test merging
        merged = repository._merge_divisions(base_divisions, membership_divisions)

        # Should have all three divisions
        assert len(merged) == 3

        # Engineering should have userRole from membership
        engineering = next(d for d in merged if d.id == "div-1")
        assert engineering.userRole == "lead"

        # Marketing should keep original userRole (None)
        marketing = next(d for d in merged if d.id == "div-2")
        assert marketing.userRole is None

        # Sales should have userRole from membership
        sales = next(d for d in merged if d.id == "div-3")
        assert sales.userRole == "member"