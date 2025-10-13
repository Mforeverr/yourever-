"""Dependency providers for admin onboarding analytics."""

from __future__ import annotations

from fastapi import Depends

from ...db.session import get_engine
from ..users.aggregation import OnboardingAnswerSnapshotRepository
from .service import AdminOnboardingAnswersService


async def get_onboarding_snapshot_repository() -> OnboardingAnswerSnapshotRepository:
    engine = get_engine()
    return OnboardingAnswerSnapshotRepository(engine)


async def get_admin_onboarding_answers_service(
    repository: OnboardingAnswerSnapshotRepository = Depends(get_onboarding_snapshot_repository),
) -> AdminOnboardingAnswersService:
    return AdminOnboardingAnswersService(repository)
