from __future__ import annotations

import asyncio
import logging
import os

from backend.app.db.session import get_engine
from backend.app.modules.users.aggregation import (
    OnboardingAnswerSnapshotRepository,
    drain_backlog,
    iter_completed_onboarding_sessions,
)

DEFAULT_BATCH_SIZE = 500


async def _run() -> None:
    engine = get_engine()
    repository = OnboardingAnswerSnapshotRepository(engine)
    await repository.ensure_schema()

    raw_batch_size = os.getenv("ONBOARDING_ANSWER_BACKFILL_BATCH_SIZE")
    try:
        configured_batch = int(raw_batch_size) if raw_batch_size else DEFAULT_BATCH_SIZE
    except (TypeError, ValueError):
        configured_batch = DEFAULT_BATCH_SIZE

    batch_size = max(1, min(configured_batch, 1000))

    processed = 0
    async for batch in iter_completed_onboarding_sessions(engine, batch_size=batch_size):
        processed += await drain_backlog(
            engine,
            batch,
            repository=repository,
            ensure_schema=False,
        )

    logging.getLogger(__name__).info(
        "onboarding.answers.backfill.completed",
        extra={"processed": processed, "batch_size": batch_size},
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(_run())


if __name__ == "__main__":
    main()
