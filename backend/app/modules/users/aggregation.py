"""Onboarding answer aggregation worker and snapshot persistence."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Iterable
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Mapping, Sequence, Tuple
from typing import Literal

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from .constants import (
    CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION,
    CURRENT_ONBOARDING_STATUS_VERSION,
    coerce_onboarding_answer_schema_version,
)

logger = logging.getLogger(__name__)


CANONICAL_STEP_ALIASES = {
    "profile": "profile",
    "work-profile": "work-profile",
    "work_profile": "work-profile",
    "workProfile": "work-profile",
    "tools": "tools",
    "invite": "invite",
    "preferences": "preferences",
    "workspace-hub": "workspace-hub",
    "workspace_hub": "workspace-hub",
    "workspaceHub": "workspace-hub",
}


@dataclass(slots=True)
class OnboardingAnswerSnapshot:
    """Normalized snapshot destined for the analytics surface."""

    session_id: str
    user_id: str
    submitted_at: datetime
    answer_groups: Dict[str, Any]
    flat_answers: Dict[str, Sequence[str]]
    workspace_id: str | None = None
    answer_schema_version: int = CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION

    def as_sql_params(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "submitted_at": self.submitted_at,
            "answer_groups": json.dumps(self.answer_groups, sort_keys=True),
            "flat_answers": json.dumps(self.flat_answers, sort_keys=True),
            "answer_schema_version": self.answer_schema_version,
        }


class OnboardingAnswerSnapshotRepository:
    """Persist onboarding answer snapshots and maintain derived totals."""

    SNAPSHOT_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS public.onboarding_answer_snapshots (
        session_id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        workspace_id UUID NULL,
        submitted_at TIMESTAMPTZ NOT NULL,
        answer_groups JSONB NOT NULL,
        flat_answers JSONB NOT NULL,
        answer_schema_version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """

    SNAPSHOT_INDEX_SQL = """
    CREATE INDEX IF NOT EXISTS idx_onboarding_answer_snapshots_user
        ON public.onboarding_answer_snapshots (user_id);
    """

    SNAPSHOT_SUBMITTED_AT_INDEX_SQL = """
    CREATE INDEX IF NOT EXISTS idx_onboarding_answer_snapshots_submitted
        ON public.onboarding_answer_snapshots (submitted_at DESC);
    """

    TOTALS_TABLE_SQL = """
    CREATE TABLE IF NOT EXISTS public.onboarding_answer_group_totals (
        answer_key TEXT NOT NULL,
        answer_value TEXT NOT NULL,
        total BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (answer_key, answer_value)
    )
    """

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(text(self.SNAPSHOT_TABLE_SQL))
            await conn.execute(text(self.SNAPSHOT_INDEX_SQL))
            await conn.execute(text(self.SNAPSHOT_SUBMITTED_AT_INDEX_SQL))
            await conn.execute(text(self.TOTALS_TABLE_SQL))

    async def upsert_snapshot(self, snapshot: OnboardingAnswerSnapshot) -> None:
        """Persist a snapshot and update aggregate totals idempotently."""

        async with self._engine.begin() as conn:
            existing_flat = await self._fetch_existing_flat_answers(conn, snapshot.session_id)
            await conn.execute(
                text(
                    """
                    INSERT INTO public.onboarding_answer_snapshots (
                        session_id,
                        user_id,
                        workspace_id,
                        submitted_at,
                        answer_groups,
                        flat_answers,
                        answer_schema_version,
                        created_at,
                        updated_at
                    ) VALUES (
                        :session_id,
                        :user_id,
                        :workspace_id,
                        :submitted_at,
                        :answer_groups::jsonb,
                        :flat_answers::jsonb,
                        :answer_schema_version,
                        NOW(),
                        NOW()
                    )
                    ON CONFLICT (session_id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        workspace_id = EXCLUDED.workspace_id,
                        submitted_at = EXCLUDED.submitted_at,
                        answer_groups = EXCLUDED.answer_groups,
                        flat_answers = EXCLUDED.flat_answers,
                        answer_schema_version = EXCLUDED.answer_schema_version,
                        updated_at = NOW()
                    """
                ),
                snapshot.as_sql_params(),
            )

            if existing_flat:
                await self._apply_totals_delta(conn, existing_flat, decrement=True)
            await self._apply_totals_delta(conn, snapshot.flat_answers, decrement=False)

    async def _fetch_existing_flat_answers(
        self, conn: AsyncConnection, session_id: str
    ) -> Dict[str, Sequence[str]] | None:
        result = await conn.execute(
            text(
                """
                SELECT flat_answers
                FROM public.onboarding_answer_snapshots
                WHERE session_id = :session_id
                """
            ),
            {"session_id": session_id},
        )
        row = result.mappings().first()
        if not row:
            return None
        stored = row.get("flat_answers")
        if isinstance(stored, str):
            try:
                stored = json.loads(stored)
            except json.JSONDecodeError:
                return None
        if isinstance(stored, Mapping):
            return {
                str(key): list(value) if isinstance(value, list) else [str(value)]
                for key, value in stored.items()
            }
        return None

    async def _apply_totals_delta(
        self,
        conn: AsyncConnection,
        flat_answers: Mapping[str, Sequence[str]],
        *,
        decrement: bool,
    ) -> None:
        if not flat_answers:
            return

        delta = -1 if decrement else 1
        statement = text(
            """
            INSERT INTO public.onboarding_answer_group_totals (
                answer_key,
                answer_value,
                total,
                updated_at
            ) VALUES (
                :answer_key,
                :answer_value,
                :initial_total,
                NOW()
            )
            ON CONFLICT (answer_key, answer_value) DO UPDATE SET
                total = GREATEST(public.onboarding_answer_group_totals.total + :delta, 0),
                updated_at = NOW()
            """
        )

        for answer_key, values in flat_answers.items():
            for raw_value in values:
                answer_value = str(raw_value)
                await conn.execute(
                    statement,
                    {
                        "answer_key": answer_key,
                        "answer_value": answer_value,
                        "initial_total": max(delta, 0),
                        "delta": delta,
                    },
                )

    async def list_snapshots(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        order: Literal["asc", "desc"] = "desc",
        role: str | None = None,
        workspace_id: str | None = None,
        submitted_from: datetime | None = None,
        submitted_to: datetime | None = None,
    ) -> Tuple[list[OnboardingAnswerSnapshot], int]:
        """Return paginated snapshots matching the provided filters."""

        limit = max(1, min(limit, 500))
        offset = max(0, offset)
        where_clauses: list[str] = ["TRUE"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}

        if workspace_id:
            where_clauses.append("workspace_id = :workspace_id")
            params["workspace_id"] = workspace_id
        if submitted_from:
            where_clauses.append("submitted_at >= :submitted_from")
            params["submitted_from"] = submitted_from
        if submitted_to:
            where_clauses.append("submitted_at <= :submitted_to")
            params["submitted_to"] = submitted_to
        if role:
            where_clauses.append(
                """
                EXISTS (
                    SELECT 1
                    FROM json_array_elements_text(COALESCE(flat_answers->'profile.role', '[]'::jsonb)) AS role_value
                    WHERE role_value = :role
                )
                """
            )
            params["role"] = role

        where_sql = " AND ".join(where_clauses)
        order_sql = "ASC" if order == "asc" else "DESC"

        async with self._engine.connect() as conn:
            count_stmt = text(
                f"""
                SELECT COUNT(1) AS total
                FROM public.onboarding_answer_snapshots
                WHERE {where_sql}
                """
            )
            total_result = await conn.execute(count_stmt, params)
            total_row = total_result.mappings().first()
            total = int(total_row["total"]) if total_row else 0

            query_stmt = text(
                f"""
                SELECT
                    session_id,
                    user_id,
                    workspace_id,
                    submitted_at,
                    answer_groups,
                    flat_answers,
                    answer_schema_version
                FROM public.onboarding_answer_snapshots
                WHERE {where_sql}
                ORDER BY submitted_at {order_sql}, session_id {order_sql}
                LIMIT :limit OFFSET :offset
                """
            )
            result = await conn.execute(query_stmt, params)
            records = [self._row_to_snapshot(row) for row in result.mappings().all()]

        return records, total

    async def list_snapshots_for_user(
        self,
        user_id: str,
        *,
        order: Literal["asc", "desc"] = "desc",
    ) -> list[OnboardingAnswerSnapshot]:
        """Return all onboarding completions for a specific user."""

        order_sql = "ASC" if order == "asc" else "DESC"
        stmt = text(
            f"""
            SELECT
                session_id,
                user_id,
                workspace_id,
                submitted_at,
                answer_groups,
                flat_answers,
                answer_schema_version
            FROM public.onboarding_answer_snapshots
            WHERE user_id = :user_id
            ORDER BY submitted_at {order_sql}, session_id {order_sql}
            """
        )

        async with self._engine.connect() as conn:
            result = await conn.execute(stmt, {"user_id": user_id})
            return [self._row_to_snapshot(row) for row in result.mappings().all()]

    async def iter_all_snapshots(
        self,
        *,
        batch_size: int = 500,
        order: Literal["asc", "desc"] = "asc",
    ) -> AsyncIterator[list[OnboardingAnswerSnapshot]]:
        """Yield every snapshot in deterministic batches for warehouse exports."""

        batch_size = max(1, min(batch_size, 1000))
        order_sql = "ASC" if order == "asc" else "DESC"
        stmt = text(
            f"""
            SELECT
                session_id,
                user_id,
                workspace_id,
                submitted_at,
                answer_groups,
                flat_answers,
                answer_schema_version
            FROM public.onboarding_answer_snapshots
            ORDER BY submitted_at {order_sql}, session_id {order_sql}
            LIMIT :limit OFFSET :offset
            """
        )

        async with self._engine.connect() as conn:
            offset = 0
            while True:
                result = await conn.execute(stmt, {"limit": batch_size, "offset": offset})
                rows = result.mappings().all()
                batch = [self._row_to_snapshot(row) for row in rows]
                if not batch:
                    break
                yield batch
                offset += len(batch)

    def _row_to_snapshot(self, row: Mapping[str, Any]) -> OnboardingAnswerSnapshot:
        answer_groups = self._ensure_mapping(row.get("answer_groups"))
        flat_answers = self._normalize_flat_answers(row.get("flat_answers"))
        submitted_at = row.get("submitted_at")
        if isinstance(submitted_at, str):
            submitted_at = datetime.fromisoformat(submitted_at)

        return OnboardingAnswerSnapshot(
            session_id=str(row.get("session_id")),
            user_id=str(row.get("user_id")),
            workspace_id=(str(row.get("workspace_id")) if row.get("workspace_id") else None),
            submitted_at=submitted_at,
            answer_groups=answer_groups,
            flat_answers=flat_answers,
            answer_schema_version=coerce_onboarding_answer_schema_version(
                row.get("answer_schema_version")
            ),
        )

    @staticmethod
    def _ensure_mapping(value: Any) -> Dict[str, Any]:
        if isinstance(value, Mapping):
            return dict(value)
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return {}
            if isinstance(parsed, Mapping):
                return dict(parsed)
        return {}

    @staticmethod
    def _normalize_flat_answers(value: Any) -> Dict[str, Sequence[str]]:
        if isinstance(value, Mapping):
            prepared: Dict[str, Sequence[str]] = {}
            for key, raw in value.items():
                if isinstance(raw, Sequence) and not isinstance(raw, (str, bytes)):
                    prepared[str(key)] = tuple(str(item) for item in raw)
                else:
                    prepared[str(key)] = (str(raw),)
            return prepared
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                return {}
            if isinstance(parsed, Mapping):
                return OnboardingAnswerSnapshotRepository._normalize_flat_answers(parsed)
        return {}


class OnboardingAnswerAggregationWorker:
    """Background listener that groups onboarding answers for analytics."""

    def __init__(
        self,
        engine: AsyncEngine,
        *,
        channel: str = "onboarding_answers_completed",
        poll_timeout: float = 60.0,
    ) -> None:
        self._engine = engine
        self._channel = channel
        self._poll_timeout = poll_timeout
        self._repository = OnboardingAnswerSnapshotRepository(engine)

    async def run_forever(self) -> None:
        await self._repository.ensure_schema()
        async with self._engine.connect() as listener:
            await listener.execute(text(f"LISTEN {self._channel}"))
            await listener.commit()
            raw_connection = await listener.get_raw_connection()
            logger.info("onboarding.answers.worker.listening", extra={"channel": self._channel})
            while True:
                try:
                    notify = await asyncio.wait_for(
                        raw_connection.connection.notifies.get(),
                        timeout=self._poll_timeout,
                    )
                except asyncio.TimeoutError:
                    continue
                await self._handle_notification(notify.payload)

    async def _handle_notification(self, payload: str) -> None:
        try:
            message = json.loads(payload)
        except json.JSONDecodeError:
            logger.exception(
                "onboarding.answers.worker.invalid_payload",
                extra={"payload": payload},
            )
            return

        snapshot = build_snapshot_from_message(message)
        if not snapshot:
            return

        try:
            await self._repository.upsert_snapshot(snapshot)
        except Exception:
            logger.exception(
                "onboarding.answers.worker.persist_failed",
                extra={"session_id": snapshot.session_id, "user_id": snapshot.user_id},
            )


def build_snapshot_from_message(payload: Mapping[str, Any]) -> OnboardingAnswerSnapshot | None:
    """Parse a NOTIFY payload into a normalized snapshot."""

    try:
        session_id = str(payload["session_id"]).strip()
        user_id = str(payload["user_id"]).strip()
        completed_at_raw = payload["completed_at"]
        answers = payload.get("answers") or {}
    except KeyError:
        logger.error("onboarding.answers.worker.payload_missing_keys", extra={"payload": payload})
        return None

    if not session_id or not user_id:
        logger.error(
            "onboarding.answers.worker.payload_invalid_ids",
            extra={"payload": payload},
        )
        return None

    submitted_at = _parse_completed_at(completed_at_raw)
    if submitted_at is None:
        logger.error(
            "onboarding.answers.worker.invalid_timestamp",
            extra={"payload": payload},
        )
        return None

    schema_version = coerce_onboarding_answer_schema_version(
        payload.get("answer_schema_version") or payload.get("answerSchemaVersion")
    )
    grouped = normalize_answer_groups(answers)
    flattened = flatten_answer_groups(grouped)
    workspace_id = extract_workspace_id(grouped)

    return OnboardingAnswerSnapshot(
        session_id=session_id,
        user_id=user_id,
        submitted_at=submitted_at,
        answer_groups=grouped,
        flat_answers=flattened,
        workspace_id=workspace_id,
        answer_schema_version=schema_version,
    )


def _parse_completed_at(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


def normalize_answer_groups(answers: Mapping[str, Any] | Any) -> Dict[str, Any]:
    """Return a deterministic mapping of step key -> payload."""

    normalized: Dict[str, Any] = {}
    if not isinstance(answers, Mapping):
        return normalized

    for raw_key in sorted(answers.keys(), key=lambda value: str(value)):
        raw_payload = answers[raw_key]
        canonical_key = CANONICAL_STEP_ALIASES.get(str(raw_key), str(raw_key))
        normalized_payload = _sanitize_group_payload(raw_payload)
        normalized[canonical_key] = normalized_payload
    return normalized


def _sanitize_group_payload(payload: Any) -> Any:
    if isinstance(payload, Mapping):
        return {
            str(key): _sanitize_group_payload(value) for key, value in sorted(payload.items(), key=lambda item: str(item[0]))
        }
    if isinstance(payload, list):
        return [_sanitize_group_payload(item) for item in payload]
    return payload


def flatten_answer_groups(groups: Mapping[str, Any]) -> Dict[str, Sequence[str]]:
    """Flatten grouped answers into simple key/value collections."""

    flattened: Dict[str, list[str]] = {}

    def _visit(path: Iterable[str], value: Any) -> None:
        key = ".".join(path)
        if isinstance(value, Mapping):
            for child_key, child_value in value.items():
                _visit([*path, str(child_key)], child_value)
            return
        if isinstance(value, list):
            collected: list[str] = []
            for item in value:
                if isinstance(item, Mapping):
                    collected.append(json.dumps(_sanitize_group_payload(item), sort_keys=True))
                elif isinstance(item, list):
                    collected.append(json.dumps(_sanitize_group_payload(item), sort_keys=True))
                else:
                    collected.append(_stringify_value(item))
            if collected:
                flattened.setdefault(key, []).extend(collected)
            return

        flattened.setdefault(key, []).append(_stringify_value(value))

    for group_key, payload in groups.items():
        _visit([group_key], payload)

    return {key: tuple(values) for key, values in flattened.items()}


def _stringify_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def extract_workspace_id(groups: Mapping[str, Any]) -> str | None:
    payload = groups.get("workspace-hub")
    if isinstance(payload, Mapping):
        workspace_id = payload.get("workspaceId") or payload.get("workspace_id")
        if workspace_id:
            return str(workspace_id)
    return None


async def drain_backlog(
    engine: AsyncEngine,
    records: Sequence[Mapping[str, Any]],
    *,
    repository: OnboardingAnswerSnapshotRepository | None = None,
    ensure_schema: bool = True,
) -> int:
    """Replay historical onboarding payloads into the snapshot store.

    Returns the total number of snapshots persisted.
    """

    repository = repository or OnboardingAnswerSnapshotRepository(engine)
    if ensure_schema:
        await repository.ensure_schema()

    processed = 0
    for record in records:
        snapshot = build_snapshot_from_message(record)
        if not snapshot:
            continue
        await repository.upsert_snapshot(snapshot)
        processed += 1
    return processed


async def iter_completed_onboarding_sessions(
    engine: AsyncEngine,
    *,
    batch_size: int = 500,
) -> AsyncIterator[list[Mapping[str, Any]]]:
    """Yield batches of completed onboarding payloads from legacy storage."""

    batch_size = max(1, min(batch_size, 1000))
    stmt = text(
        """
        SELECT
            id AS session_id,
            user_id,
            completed_at,
            data
        FROM public.onboarding_sessions
        WHERE is_completed = TRUE
          AND completed_at IS NOT NULL
        ORDER BY completed_at ASC, id ASC
        LIMIT :limit OFFSET :offset
        """
    )

    offset = 0
    while True:
        async with engine.connect() as conn:
            result = await conn.execute(stmt, {"limit": batch_size, "offset": offset})
            rows = result.mappings().all()
        if not rows:
            break

        batch: list[Mapping[str, Any]] = []
        for row in rows:
            completed_at = row.get("completed_at")
            if not completed_at:
                continue
            answers, schema_version = _extract_answers_and_version(row.get("data"))
            record: Dict[str, Any] = {
                "session_id": str(row.get("session_id")),
                "user_id": str(row.get("user_id")),
                "completed_at": completed_at.isoformat(),
                "answers": answers,
            }
            if schema_version is not None:
                record["answer_schema_version"] = schema_version
            batch.append(record)

        if batch:
            yield batch
        offset += len(rows)


def _extract_answers_and_version(data: Any) -> tuple[dict[str, Any], int | None]:
    """Return answers and optional schema version from stored onboarding payloads."""

    answers: dict[str, Any] = {}
    schema_version: int | None = None

    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            data = {}

    if isinstance(data, Mapping):
        raw_answers = data.get("answers")
        if isinstance(raw_answers, Mapping):
            answers = dict(raw_answers)
        schema_version_value = (
            data.get("answer_schema_version")
            or data.get("answerSchemaVersion")
        )
        if schema_version_value is not None:
            schema_version = coerce_onboarding_answer_schema_version(schema_version_value)

    return answers, schema_version
