"""Nightly export script for onboarding answer snapshots."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from backend.app.db.session import get_engine
from backend.app.modules.users.aggregation import OnboardingAnswerSnapshotRepository
from backend.app.modules.users.exporter import (
    JsonLinesWarehouseWriter,
    OnboardingAnswerWarehouseExporter,
)

DEFAULT_EXPORT_PATH = Path("exports/onboarding_answer_snapshots.ndjson")


async def _run() -> None:
    engine = get_engine()
    repository = OnboardingAnswerSnapshotRepository(engine)
    exporter = OnboardingAnswerWarehouseExporter(repository)

    export_path = Path(os.getenv("ONBOARDING_ANSWERS_EXPORT_PATH", DEFAULT_EXPORT_PATH))
    writer = JsonLinesWarehouseWriter(export_path)

    stats = await exporter.export_all(writer)
    logging.getLogger(__name__).info(
        "onboarding.answers.export.script_completed",
        extra={"path": str(export_path), "total_snapshots": stats.total_snapshots},
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    asyncio.run(_run())


if __name__ == "__main__":
    main()
