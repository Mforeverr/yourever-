"""Schemas for onboarding completion endpoints."""

from typing import Any, Dict

from pydantic import BaseModel, Field

from ..users.schemas import OnboardingSessionResponse, StoredOnboardingStatus


class OnboardingCompletionPayload(BaseModel):
    """Combined onboarding answers submitted when the flow finishes."""

    status: StoredOnboardingStatus
    answers: Dict[str, Any] = Field(default_factory=dict)


class OnboardingCompletionResponse(OnboardingSessionResponse):
    """Alias response model for clarity."""

    pass
