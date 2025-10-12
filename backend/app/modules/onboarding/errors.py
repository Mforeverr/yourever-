"""Custom exceptions for onboarding flows."""

from __future__ import annotations

from dataclasses import dataclass

from .schemas import OnboardingValidationSummary


@dataclass(slots=True)
class OnboardingValidationError(Exception):
    """Raised when onboarding completion fails server-side validation."""

    validation: OnboardingValidationSummary
    detail: str = "Onboarding validation failed"

    def __post_init__(self) -> None:
        super().__init__(self.detail)
