"""Warehouse export utilities for onboarding answer snapshots."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Protocol

from .aggregation import OnboardingAnswerSnapshot, OnboardingAnswerSnapshotRepository

logger = logging.getLogger(__name__)


class SnapshotBatchWriter(Protocol):
    async def write_batch(self, records: Iterable[OnboardingAnswerSnapshot]) -> None:
        """Persist a batch of snapshots to the downstream warehouse."""

    async def finalize(self) -> None:
        """Flush and close any underlying resources."""


class JsonLinesWarehouseWriter:
    """Write onboarding snapshots to an ndjson file for warehouse ingestion."""

    def __init__(self, path: Path) -> None:
        self._path = path
        parent = self._path.parent
        if parent and not parent.exists():
            parent.mkdir(parents=True, exist_ok=True)
        self._file = path.open("w", encoding="utf-8")

    async def write_batch(self, records: Iterable[OnboardingAnswerSnapshot]) -> None:
        lines: list[str] = []
        for record in records:
            payload = _snapshot_to_json(record)
            lines.append(json.dumps(payload, separators=(",", ":")))
        if not lines:
            return
        data = "\n".join(lines) + "\n"
        await asyncio.to_thread(self._file.write, data)

    async def finalize(self) -> None:
        await asyncio.to_thread(self._file.flush)
        await asyncio.to_thread(self._file.close)


@dataclass(slots=True)
class ExportStats:
    total_snapshots: int


class OnboardingAnswerWarehouseExporter:
    """Stream onboarding answer snapshots into a warehouse-friendly sink."""

    def __init__(self, repository: OnboardingAnswerSnapshotRepository, *, batch_size: int = 500) -> None:
        self._repository = repository
        self._batch_size = batch_size

    async def export_all(self, writer: SnapshotBatchWriter) -> ExportStats:
        await self._repository.ensure_schema()
        total_written = 0
        async for batch in self._repository.iter_all_snapshots(batch_size=self._batch_size):
            await writer.write_batch(batch)
            total_written += len(batch)
        await writer.finalize()
        logger.info(
            "onboarding.answers.export.completed",
            extra={"total_snapshots": total_written},
        )
        return ExportStats(total_snapshots=total_written)


def _snapshot_to_json(snapshot: OnboardingAnswerSnapshot) -> dict:
    return {
        "session_id": snapshot.session_id,
        "user_id": snapshot.user_id,
        "workspace_id": snapshot.workspace_id,
        "submitted_at": _format_datetime(snapshot.submitted_at),
        "answer_groups": snapshot.answer_groups,
        "flat_answers": {key: list(values) for key, values in snapshot.flat_answers.items()},
        "answer_schema_version": snapshot.answer_schema_version,
    }


def _format_datetime(value: datetime) -> str:
    if value.tzinfo is None:
        return value.isoformat() + "Z"
    return value.isoformat()
