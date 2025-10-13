"""Services powering admin onboarding answer endpoints."""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime

from ..users.aggregation import OnboardingAnswerSnapshot, OnboardingAnswerSnapshotRepository


class AdminOnboardingAnswersService:
    """Expose read APIs on top of the onboarding answer snapshot store."""

    def __init__(self, repository: OnboardingAnswerSnapshotRepository) -> None:
        self._repository = repository

    async def list_answers(
        self,
        *,
        page: int,
        page_size: int,
        role: str | None,
        workspace_id: str | None,
        completed_from: datetime | None,
        completed_to: datetime | None,
    ) -> tuple[list[OnboardingAnswerSnapshot], int]:
        await self._repository.ensure_schema()
        offset = (page - 1) * page_size
        return await self._repository.list_snapshots(
            offset=offset,
            limit=page_size,
            role=role,
            workspace_id=workspace_id,
            submitted_from=completed_from,
            submitted_to=completed_to,
        )

    async def list_user_answers(
        self,
        user_id: str,
    ) -> list[OnboardingAnswerSnapshot]:
        await self._repository.ensure_schema()
        return await self._repository.list_snapshots_for_user(user_id)

    async def stream_all_snapshots(
        self,
        *,
        batch_size: int = 500,
    ) -> AsyncIterator[OnboardingAnswerSnapshot]:
        await self._repository.ensure_schema()
        async for batch in self._repository.iter_all_snapshots(batch_size=batch_size):
            for snapshot in batch:
                yield snapshot
