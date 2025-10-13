"""Schemas for onboarding endpoints."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..users.schemas import OnboardingSessionResponse, StoredOnboardingStatus


class OnboardingManifestStep(BaseModel):
    """Manifest representation of a single onboarding step."""

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Unique identifier for the onboarding step.")
    title: str = Field(..., description="Human-friendly name of the step.")
    description: str = Field(..., description="Short description shown to users.")
    path: str = Field(..., description="Relative URL path the client should navigate to.")
    required: bool = Field(..., description="Indicates whether the step must be completed.")
    canSkip: bool = Field(..., description="Whether the step may be skipped by the user.")


class OnboardingManifestResponse(BaseModel):
    """Response envelope for the server-driven onboarding manifest."""

    version: str = Field(..., description="Semantic version of the manifest configuration.")
    variant: Optional[str] = Field(
        default=None,
        description="Optional variant identifier for experimentation or personalization.",
    )
    updatedAt: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the manifest was last updated on the server.",
    )
    steps: List[OnboardingManifestStep] = Field(
        default_factory=list,
        description="Ordered list of onboarding steps to render on the client.",
    )


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
