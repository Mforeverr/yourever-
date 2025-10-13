"""Dependency wiring for onboarding manifest services."""

from __future__ import annotations

from functools import lru_cache

from .service import OnboardingManifestService


@lru_cache()
def get_onboarding_manifest_service() -> OnboardingManifestService:
    """Resolve the onboarding manifest service singleton."""

    return OnboardingManifestService()
