# Author: Eldrie (CTO Dev)
# Date: 2025-10-11
# Role: Backend

"""Publish onboarding completion payloads to downstream aggregators."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from .constants import CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class OnboardingAnswerMessage:
    """Normalized payload sent to the aggregation worker."""

    user_id: str
    session_id: str
    completed_at: datetime
    answers: dict[str, Any] | None
    answer_schema_version: int = CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION

    def as_json(self) -> str:
        """Return a compact JSON representation for queue transport."""

        payload = {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "completed_at": self.completed_at.isoformat(),
            "answers": self.answers or {},
            "answer_schema_version": self.answer_schema_version,
        }
        return json.dumps(payload, separators=(",", ":"))


class OnboardingAnswerPublisher(Protocol):
    """Contract for broadcasting onboarding completion payloads."""

    async def publish(self, message: OnboardingAnswerMessage) -> None:
        """Dispatch the message to a downstream consumer."""


class NullOnboardingAnswerPublisher:
    """No-op publisher used when aggregation is disabled."""

    async def publish(self, message: OnboardingAnswerMessage) -> None:  # pragma: no cover - trivial
        logger.debug(
            "onboarding.answers.publisher.skipped",
            extra={"session_id": message.session_id, "user_id": message.user_id},
        )


class PostgresNotifyOnboardingAnswerPublisher:
    """Publish onboarding completions using PostgreSQL LISTEN/NOTIFY."""

    def __init__(self, engine: AsyncEngine, channel: str = "onboarding_answers_completed") -> None:
        self._engine = engine
        self._channel = channel

    async def publish(self, message: OnboardingAnswerMessage) -> None:
        payload = message.as_json()
        stmt = text("SELECT pg_notify(:channel, :payload)")

        try:
            async with self._engine.begin() as connection:
                await connection.execute(stmt, {"channel": self._channel, "payload": payload})
        except Exception:
            logger.exception(
                "onboarding.answers.publisher.failed",
                extra={"channel": self._channel, "session_id": message.session_id, "user_id": message.user_id},
            )
            raise
        else:
            logger.info(
                "onboarding.answers.publisher.pg_notify",
                extra={"channel": self._channel, "session_id": message.session_id, "user_id": message.user_id},
            )

