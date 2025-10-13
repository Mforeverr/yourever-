# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
User service orchestrating repository access.
"""

import logging
from typing import Any, Dict, List, Mapping, Optional

from ...dependencies import CurrentPrincipal
from .checksums import compute_status_checksum
from .repository import UserRepository
from .schemas import (
    OnboardingSession,
    StoredOnboardingStatus,
    WorkspaceUser,
    new_onboarding_revision,
)
from ..onboarding.errors import OnboardingRevisionConflict, OnboardingValidationError
from ..onboarding.schemas import OnboardingCompletionResponse
from ..onboarding.validation import evaluate_completion_validation


logger = logging.getLogger(__name__)


def _status_metrics(status: StoredOnboardingStatus) -> Dict[str, Any]:
    return {
        "status_version": status.version,
        "status_completed": bool(status.completed),
        "status_completed_steps": len(status.completedSteps),
        "status_skipped_steps": len(status.skippedSteps),
        "status_last_step": status.lastStep or None,
    }


def _as_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, Mapping):
        return dict(value)
    return {}


def _collect_changed_fields(
    persisted: Dict[str, Any], submitted: Dict[str, Any], prefix: str = ""
) -> List[str]:
    changed: List[str] = []
    keys = {str(key) for key in persisted.keys()} | {str(key) for key in submitted.keys()}

    for key in sorted(keys):
        path = f"{prefix}.{key}" if prefix else key
        persisted_value = persisted.get(key)
        submitted_value = submitted.get(key)

        persisted_mapping = _as_dict(persisted_value)
        submitted_mapping = _as_dict(submitted_value)

        if persisted_mapping or submitted_mapping:
            if persisted_mapping and submitted_mapping:
                changed.extend(_collect_changed_fields(persisted_mapping, submitted_mapping, path))
            else:
                changed.append(path)
            continue

        if persisted_value != submitted_value:
            changed.append(path)

    return changed


class UserService:
    def __init__(self, repository: UserRepository) -> None:
        self._repository = repository

    async def _ensure_user(self, principal: CurrentPrincipal) -> WorkspaceUser:
        user = await self._repository.get_user(principal.id)
        if user:
            return user
        return await self._repository.create_user(principal)

    async def get_current_user(self, principal: CurrentPrincipal) -> WorkspaceUser:
        return await self._ensure_user(principal)

    async def get_onboarding_session(self, principal: CurrentPrincipal) -> OnboardingSession:
        await self._ensure_user(principal)
        session = await self._repository.get_or_create_onboarding_session(principal.id)
        logger.info(
            "onboarding.session.resumed",
            extra={
                "user_id": principal.id,
                "session_id": session.id,
                "current_step": session.currentStep,
                "session_completed": bool(session.isCompleted),
                "session_started_at": session.startedAt,
                "session_completed_at": session.completedAt,
                **_status_metrics(session.status),
            },
        )
        return session

    @staticmethod
    def _ensure_revision_is_current(
        persisted: StoredOnboardingStatus, submitted: StoredOnboardingStatus
    ) -> None:
        persisted_revision = (persisted.revision or "").strip() or None
        submitted_revision = (submitted.revision or "").strip() or None

        persisted_data = _as_dict(persisted.data)
        submitted_data = _as_dict(submitted.data)
        persisted_checksum = persisted.checksum or compute_status_checksum(persisted_data)
        submitted_checksum = submitted.checksum or compute_status_checksum(submitted_data)
        changed_fields = _collect_changed_fields(persisted_data, submitted_data)

        if persisted_revision and not submitted_revision:
            raise OnboardingRevisionConflict(
                persisted_revision,
                submitted_revision,
                current_checksum=persisted_checksum,
                submitted_checksum=submitted_checksum,
                changed_fields=changed_fields or None,
            )

        if (
            persisted_revision
            and submitted_revision
            and persisted_revision != submitted_revision
        ):
            raise OnboardingRevisionConflict(
                persisted_revision,
                submitted_revision,
                current_checksum=persisted_checksum,
                submitted_checksum=submitted_checksum,
                changed_fields=changed_fields or None,
            )

    @staticmethod
    def _with_next_revision(status: StoredOnboardingStatus) -> StoredOnboardingStatus:
        return status.model_copy(update={"revision": new_onboarding_revision(), "checksum": None})

    async def update_onboarding_progress(
        self,
        principal: CurrentPrincipal,
        status: StoredOnboardingStatus,
    ) -> OnboardingSession:
        await self._ensure_user(principal)
        current_session = await self._repository.get_or_create_onboarding_session(principal.id)
        self._ensure_revision_is_current(current_session.status, status)
        next_status = self._with_next_revision(status)
        submitted_metrics = {
            f"submitted_{key}": value for key, value in _status_metrics(status).items()
        }
        session = await self._repository.update_onboarding_status(principal.id, next_status)
        persisted_metrics = {f"persisted_{key}": value for key, value in _status_metrics(session.status).items()}
        logger.info(
            "onboarding.progress_saved",
            extra={
                "user_id": principal.id,
                "session_id": session.id,
                "current_step": session.currentStep,
                "session_completed": bool(session.isCompleted),
                "session_started_at": session.startedAt,
                "session_completed_at": session.completedAt,
                **submitted_metrics,
                **persisted_metrics,
            },
        )
        return session

    async def complete_onboarding(
        self,
        principal: CurrentPrincipal,
        status: StoredOnboardingStatus,
        answers: Optional[Dict[str, Any]] = None,
    ) -> OnboardingCompletionResponse:
        await self._ensure_user(principal)
        validation = evaluate_completion_validation(status, answers)
        if validation.hasBlockingIssue:
            raise OnboardingValidationError(validation)

        current_session = await self._repository.get_or_create_onboarding_session(principal.id)
        self._ensure_revision_is_current(current_session.status, status)
        next_status = self._with_next_revision(status)
        session = await self._repository.complete_onboarding(principal.id, next_status, answers)
        submitted_metrics = {f"submitted_{key}": value for key, value in _status_metrics(status).items()}
        persisted_metrics = {f"persisted_{key}": value for key, value in _status_metrics(session.status).items()}
        logger.info(
            "onboarding.completion_succeeded",
            extra={
                "user_id": principal.id,
                "session_id": session.id,
                "current_step": session.currentStep,
                "session_completed": bool(session.isCompleted),
                "session_started_at": session.startedAt,
                "session_completed_at": session.completedAt,
                **submitted_metrics,
                **persisted_metrics,
            },
        )
        return OnboardingCompletionResponse(session=session, validation=validation)
