"""Background workers for organization invitations."""

from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from typing import Optional

from ...core import get_settings
from ...db.session import get_session_factory
from .repository import OrganizationRepository

logger = logging.getLogger(__name__)


class InvitationExpiryScheduler:
    """Periodically expires invitations that have passed their deadline."""

    def __init__(self, interval_seconds: Optional[int] = None) -> None:
        settings = get_settings()
        self._interval = interval_seconds or settings.invitation_expiry_interval_seconds
        self._stop = asyncio.Event()
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._run(), name="invitation-expiry-scheduler")

    async def shutdown(self) -> None:
        if self._task is None:
            return
        self._stop.set()
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run(self) -> None:
        session_factory = get_session_factory()
        while not self._stop.is_set():
            try:
                async with session_factory() as session:
                    repository = OrganizationRepository(session)
                    expired = await repository.expire_stale_invitations()
                    if expired:
                        logger.info("scheduler.invitation.expired", extra={"count": expired})
            except Exception as error:  # pragma: no cover - defensive guard
                logger.error("scheduler.invitation.failed", exc_info=error)

            try:
                await asyncio.wait_for(self._stop.wait(), timeout=self._interval)
            except asyncio.TimeoutError:
                continue
