"""Server-driven onboarding manifest definitions and providers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol, Sequence


@dataclass(frozen=True)
class OnboardingStepDefinition:
    """Static definition for an onboarding step."""

    id: str
    title: str
    description: str
    path: str
    required: bool
    can_skip: bool


@dataclass(frozen=True)
class OnboardingManifestDocument:
    """Manifest document exposed to clients."""

    version: str
    steps: Sequence[OnboardingStepDefinition]
    variant: str = "default"
    updated_at: datetime | None = None


class OnboardingManifestProvider(Protocol):
    """Contract for retrieving onboarding manifest definitions."""

    async def get_manifest(self) -> OnboardingManifestDocument:  # pragma: no cover - interface only
        """Return the manifest that should be served to clients."""


class StaticOnboardingManifestProvider:
    """Simple provider backed by a static manifest document."""

    def __init__(self, manifest: OnboardingManifestDocument):
        self._manifest = manifest

    async def get_manifest(self) -> OnboardingManifestDocument:
        return self._manifest


DEFAULT_ONBOARDING_MANIFEST = OnboardingManifestDocument(
    version="2024-10-11",
    variant="default",
    updated_at=datetime(2024, 10, 11, tzinfo=timezone.utc),
    steps=(
        OnboardingStepDefinition(
            id="profile",
            title="Set up your profile",
            description="Tell us who you are so teammates know who just joined.",
            path="/o/profile",
            required=True,
            can_skip=False,
        ),
        OnboardingStepDefinition(
            id="work-profile",
            title="Your work profile",
            description="Share how you work so we can tailor the workspace.",
            path="/o/work-profile",
            required=True,
            can_skip=False,
        ),
        OnboardingStepDefinition(
            id="tools",
            title="Tools you rely on",
            description="Select the tools your team already uses.",
            path="/o/tools",
            required=False,
            can_skip=True,
        ),
        OnboardingStepDefinition(
            id="invite",
            title="Invite teammates",
            description="Bring collaborators in now or skip and invite later.",
            path="/o/invite",
            required=False,
            can_skip=True,
        ),
        OnboardingStepDefinition(
            id="preferences",
            title="Workspace preferences",
            description="Choose the preferences that fit how you like to work.",
            path="/o/preferences",
            required=True,
            can_skip=False,
        ),
        OnboardingStepDefinition(
            id="workspace-hub",
            title="Workspace hub",
            description="Create or join a workspace to finish onboarding.",
            path="/o/workspace-hub",
            required=True,
            can_skip=False,
        ),
    ),
)
