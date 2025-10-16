"""Data access helpers for resolving shortlinks."""

from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ShortlinkRepository:
    """Repository responsible for looking up canonical scopes for entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def fetch_project_scope(self, project_id: str) -> Optional[Tuple[str, Optional[str]]]:
        """Return organization slug and division key for a project."""

        query = text(
            """
            SELECT
                o.slug AS org_slug,
                d.key AS division_key
            FROM public.projects p
            JOIN public.organizations o ON o.id = p.org_id
            LEFT JOIN public.divisions d ON d.id = p.division_id
            WHERE p.id = :project_id
              AND p.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND (p.division_id IS NULL OR d.deleted_at IS NULL)
            LIMIT 1
            """
        )
        result = await self._session.execute(query, {"project_id": project_id})
        record = result.mappings().one_or_none()
        if not record:
            return None
        return record["org_slug"], record.get("division_key")

    async def fetch_task_scope(self, task_id: str) -> Optional[Tuple[str, Optional[str]]]:
        """Return organization slug and division key for a task."""

        query = text(
            """
            SELECT
                o.slug AS org_slug,
                COALESCE(task_div.key, project_div.key) AS division_key
            FROM public.tasks t
            JOIN public.organizations o ON o.id = t.org_id
            LEFT JOIN public.divisions task_div ON task_div.id = t.division_id
            LEFT JOIN public.projects p ON p.id = t.project_id
            LEFT JOIN public.divisions project_div ON project_div.id = p.division_id
            WHERE t.id = :task_id
              AND t.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND (t.division_id IS NULL OR task_div.deleted_at IS NULL)
              AND (t.project_id IS NULL OR p.deleted_at IS NULL)
              AND (p.division_id IS NULL OR project_div.deleted_at IS NULL)
            LIMIT 1
            """
        )
        result = await self._session.execute(query, {"task_id": task_id})
        record = result.mappings().one_or_none()
        if not record:
            return None
        return record["org_slug"], record.get("division_key")

    async def fetch_channel_scope(self, channel_id: str) -> Optional[Tuple[str, Optional[str]]]:
        """Return organization slug and division key for a channel."""

        query = text(
            """
            SELECT
                o.slug AS org_slug,
                d.key AS division_key
            FROM public.channels c
            JOIN public.organizations o ON o.id = c.org_id
            LEFT JOIN public.divisions d ON d.id = c.division_id
            WHERE c.id = :channel_id
              AND c.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND (c.division_id IS NULL OR d.deleted_at IS NULL)
            LIMIT 1
            """
        )
        result = await self._session.execute(query, {"channel_id": channel_id})
        record = result.mappings().one_or_none()
        if not record:
            return None
        return record["org_slug"], record.get("division_key")
