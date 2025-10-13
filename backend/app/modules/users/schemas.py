# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Pydantic schemas for user profile and onboarding endpoints.
"""

from typing import List, Optional

from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from ...core.config import Settings
from .constants import CURRENT_ONBOARDING_STATUS_VERSION


class WorkspaceDivision(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    key: Optional[str] = None
    description: Optional[str] = None
    orgId: Optional[str] = None
    userRole: Optional[str] = None


class WorkspaceOrganization(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    divisions: List[WorkspaceDivision]
    userRole: Optional[str] = None


class WorkspaceUser(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    fullName: str
    displayName: str
    avatar: Optional[str] = None
    avatarUrl: Optional[str] = None
    role: Optional[str] = None
    timezone: Optional[str] = None
    organizations: List[WorkspaceOrganization]
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class UserProfileResponse(BaseModel):
    user: WorkspaceUser


def new_onboarding_revision() -> str:
    return uuid4().hex


class StoredOnboardingStatus(BaseModel):
    version: int = Field(default=CURRENT_ONBOARDING_STATUS_VERSION)
    completed: bool = False
    completedSteps: List[str] = Field(default_factory=list)
    skippedSteps: List[str] = Field(default_factory=list)
    data: dict = Field(default_factory=dict)
    lastStep: Optional[str] = None
    revision: Optional[str] = None
    checksum: Optional[str] = None


class OnboardingSession(BaseModel):
    id: str
    userId: str
    currentStep: str
    isCompleted: bool
    startedAt: Optional[str]
    completedAt: Optional[str]
    status: StoredOnboardingStatus


class OnboardingSessionResponse(BaseModel):
    session: OnboardingSession


class OnboardingProgressUpdate(BaseModel):
    status: StoredOnboardingStatus
