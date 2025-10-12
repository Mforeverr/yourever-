"""Schemas for onboarding completion endpoints."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from ..users.schemas import OnboardingSessionResponse, StoredOnboardingStatus


class OnboardingCompletionPayload(BaseModel):
    """Combined onboarding answers submitted when the flow finishes."""

    status: StoredOnboardingStatus
    answers: Dict[str, Any] = Field(default_factory=dict)


class OnboardingValidationIssue(BaseModel):
    """Individual validation issue surfaced during completion."""

    stepId: str = Field(..., description="Identifier for the onboarding step that needs attention.")
    message: str = Field(..., description="Human-friendly description of the issue.")
    field: Optional[str] = Field(
        default=None, description="Optional field key within the step payload that is invalid."
    )
    code: Optional[str] = Field(
        default=None, description="Optional machine-readable error code for the issue."
    )


class OnboardingValidationSummary(BaseModel):
    """Structured validation metadata returned alongside completion attempts."""

    hasBlockingIssue: bool = Field(
        default=False,
        description="Indicates whether any issues prevent onboarding from completing.",
    )
    blockingStepId: Optional[str] = Field(
        default=None,
        description="Primary step that should be shown to the user to resolve outstanding issues.",
    )
    issues: List[OnboardingValidationIssue] = Field(
        default_factory=list,
        description="Collection of validation issues discovered during completion.",
    )


class OnboardingCompletionResponse(OnboardingSessionResponse):
    """Completion response enriched with validation metadata."""

    validation: OnboardingValidationSummary = Field(
        default_factory=OnboardingValidationSummary,
        description="Validation metadata that callers can use to direct users back to specific steps.",
    )
