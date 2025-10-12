"""Server-side validation helpers for onboarding completion."""

from __future__ import annotations

from typing import Any, Dict, Iterable

from ..users.schemas import StoredOnboardingStatus
from .schemas import OnboardingValidationIssue, OnboardingValidationSummary

_STEP_KEY_ALIASES: Dict[str, Iterable[str]] = {
    "profile": ("profile",),
    "work-profile": ("work-profile", "workProfile"),
    "tools": ("tools",),
    "invite": ("invite",),
    "preferences": ("preferences",),
    "workspace-hub": ("workspace-hub", "workspaceHub"),
}

_REQUIRED_STEPS = ("profile", "work-profile", "preferences", "workspace-hub")


def _extract_step_payload(answers: Dict[str, Any] | None, step_id: str) -> Dict[str, Any]:
    """Retrieve the payload for the requested step, accounting for camelCase keys."""

    if not answers or not isinstance(answers, dict):
        return {}

    for candidate_key in _STEP_KEY_ALIASES.get(step_id, (step_id,)):
        payload = answers.get(candidate_key)
        if isinstance(payload, dict):
            return payload
    return {}


def evaluate_completion_validation(
    status: StoredOnboardingStatus, answers: Dict[str, Any] | None
) -> OnboardingValidationSummary:
    """Validate completion payloads and surface structured metadata."""

    summary = OnboardingValidationSummary()
    completed_steps = set(status.completedSteps or [])

    for required_step in _REQUIRED_STEPS:
        if required_step not in completed_steps:
            summary.issues.append(
                OnboardingValidationIssue(
                    stepId=required_step,
                    message="Please complete this step before finishing onboarding.",
                    code="step_incomplete",
                )
            )

    workspace_payload = _extract_step_payload(answers, "workspace-hub")
    if workspace_payload:
        choice = str(workspace_payload.get("choice") or "").strip().lower()
        if choice == "create-new":
            organization_name = str(workspace_payload.get("organizationName") or "").strip()
            if not organization_name:
                summary.issues.append(
                    OnboardingValidationIssue(
                        stepId="workspace-hub",
                        field="organizationName",
                        message="Organization name is required to create a workspace.",
                        code="organization_name_required",
                    )
                )

    if summary.issues:
        if summary.blockingStepId is None and summary.issues:
            summary.blockingStepId = summary.issues[0].stepId
        summary.hasBlockingIssue = True

    return summary
