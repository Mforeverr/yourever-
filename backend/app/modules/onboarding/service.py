"""Services for onboarding manifest delivery."""

from __future__ import annotations

from typing import Optional

from .manifest import (
    DEFAULT_ONBOARDING_MANIFEST,
    OnboardingManifestDocument,
    OnboardingManifestProvider,
    StaticOnboardingManifestProvider,
)


class OnboardingManifestService:
    """Business logic wrapper around the manifest provider."""

    def __init__(
        self,
        provider: Optional[OnboardingManifestProvider] = None,
    ) -> None:
        self._provider = provider or StaticOnboardingManifestProvider(DEFAULT_ONBOARDING_MANIFEST)

    async def get_manifest(self) -> OnboardingManifestDocument:
        """Return the manifest document to be served to clients."""

        return await self._provider.get_manifest()
