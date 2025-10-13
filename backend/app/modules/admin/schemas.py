"""Pydantic schemas for admin onboarding answer surfaces."""

from __future__ import annotations

from datetime import datetime
from math import ceil
from typing import Any, Dict, Sequence

from pydantic import BaseModel, Field

from ..users.aggregation import OnboardingAnswerSnapshot


class PaginationMeta(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class OnboardingAnswerSnapshotPayload(BaseModel):
    session_id: str
    user_id: str
    workspace_id: str | None = None
    submitted_at: datetime
    answer_groups: Dict[str, Any]
    flat_answers: Dict[str, Sequence[str]]
    answer_schema_version: int

    @classmethod
    def from_snapshot(cls, snapshot: OnboardingAnswerSnapshot) -> "OnboardingAnswerSnapshotPayload":
        return cls(
            session_id=snapshot.session_id,
            user_id=snapshot.user_id,
            workspace_id=snapshot.workspace_id,
            submitted_at=snapshot.submitted_at,
            answer_groups=dict(snapshot.answer_groups),
            flat_answers={key: list(values) for key, values in snapshot.flat_answers.items()},
            answer_schema_version=snapshot.answer_schema_version,
        )


class OnboardingAnswerListResponse(BaseModel):
    items: list[OnboardingAnswerSnapshotPayload]
    pagination: PaginationMeta

    @classmethod
    def build(
        cls,
        *,
        items: Sequence[OnboardingAnswerSnapshot],
        page: int,
        page_size: int,
        total: int,
    ) -> "OnboardingAnswerListResponse":
        total_pages = ceil(total / page_size) if total and page_size else 0
        return cls(
            items=[OnboardingAnswerSnapshotPayload.from_snapshot(item) for item in items],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                total_pages=total_pages,
            ),
        )


class OnboardingAnswerUserResponse(BaseModel):
    user_id: str
    total: int
    sessions: list[OnboardingAnswerSnapshotPayload]

    @classmethod
    def build(
        cls, *, user_id: str, items: Sequence[OnboardingAnswerSnapshot]
    ) -> "OnboardingAnswerUserResponse":
        return cls(
            user_id=user_id,
            total=len(items),
            sessions=[OnboardingAnswerSnapshotPayload.from_snapshot(item) for item in items],
        )
