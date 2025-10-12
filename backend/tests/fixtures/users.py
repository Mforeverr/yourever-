"""
Test fixtures for user-related tests.
"""

import factory
from factory.alchemy import SqlAlchemyModelFactory

from app.modules.users.constants import CURRENT_ONBOARDING_STATUS_VERSION
from app.modules.users.schemas import (
    StoredOnboardingStatus,
    WorkspaceDivision,
    WorkspaceOrganization,
    WorkspaceUser,
)


class WorkspaceUserFactory(SqlAlchemyModelFactory):
    """Factory for creating WorkspaceUser instances."""

    class Meta:
        model = WorkspaceUser
        sqlalchemy_session_persistence = "flush"

    id = factory.Faker("uuid4")
    email = factory.Faker("email")
    firstName = factory.Faker("first_name")
    lastName = factory.Faker("last_name")
    fullName = factory.Lazy(lambda obj: f"{obj.firstName} {obj.lastName}")
    displayName = factory.Lazy(lambda obj: obj.firstName)
    avatar = factory.Faker("url")
    avatarUrl = factory.Lazy(lambda obj: obj.avatar)
    role = factory.Iterator(["user", "admin"])
    timezone = "UTC"
    organizations = factory.List([])


class WorkspaceOrganizationFactory(SqlAlchemyModelFactory):
    """Factory for creating WorkspaceOrganization instances."""

    class Meta:
        model = WorkspaceOrganization
        sqlalchemy_session_persistence = "flush"

    id = factory.Faker("uuid4")
    name = factory.Faker("company")
    slug = factory.Faker("slug")
    description = factory.Faker("paragraph", nb_sentences=3)
    divisions = factory.List([])
    userRole = factory.Iterator(["user", "admin", "owner"])


class WorkspaceDivisionFactory(SqlAlchemyModelFactory):
    """Factory for creating WorkspaceDivision instances."""

    class Meta:
        model = WorkspaceDivision
        sqlalchemy_session_persistence = "flush"

    id = factory.Faker("uuid4")
    name = factory.Faker("catch_phrase")
    key = factory.Faker("slug")
    description = factory.Faker("paragraph", nb_sentences=2)
    orgId = factory.Faker("uuid4")
    userRole = None


class StoredOnboardingStatusFactory(factory.Factory):
    """Factory for creating StoredOnboardingStatus instances."""

    class Meta:
        model = StoredOnboardingStatus

    version = CURRENT_ONBOARDING_STATUS_VERSION
    completedSteps = factory.List([lambda: factory.Faker("word") for _ in range(3)])
    skippedSteps = factory.List([lambda: factory.Faker("word") for _ in range(1)])
    lastStep = factory.Faker("word")
    completed = False


class OnboardingSessionFactory(factory.Factory):
    """Factory for creating OnboardingSession instances."""

    class Meta:
        model = "app.modules.users.schemas.OnboardingSession"

    id = factory.Faker("uuid4")
    userId = factory.Faker("uuid4")
    currentStep = factory.Faker("word")
    isCompleted = factory.Faker("boolean")
    startedAt = factory.Faker("date_time_this_year")
    completedAt = None
    status = factory.SubFactory(StoredOnboardingStatusFactory)