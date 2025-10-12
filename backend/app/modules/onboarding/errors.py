"""Custom exceptions for onboarding flows."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .schemas import OnboardingValidationSummary


@dataclass(slots=True)
class OnboardingValidationError(Exception):
    """Raised when onboarding completion fails server-side validation."""

    validation: OnboardingValidationSummary
    detail: str = "Onboarding validation failed"

    def __post_init__(self) -> None:
        super().__init__(self.detail)


@dataclass(slots=True)
class OnboardingRevisionConflict(Exception):
    """Raised when onboarding progress updates submit a stale revision token."""

    current_revision: Optional[str]
    submitted_revision: Optional[str]
    detail: str = "Onboarding progress is out of date. Please refresh and try again."

    def __post_init__(self) -> None:
        super().__init__(self.detail)

    @property
    def context(self) -> Dict[str, Optional[str]]:
        return {
            "currentRevision": self.current_revision,
            "submittedRevision": self.submitted_revision,
        }
