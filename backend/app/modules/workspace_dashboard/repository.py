"""Data access layer for the workspace dashboard."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import json

from sqlalchemy import CursorResult, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..workspace.schemas import WorkspaceActivity, WorkspaceDoc, WorkspaceProject
from .schemas import DashboardKpi, DashboardPresenceMember, DashboardSummary


class DashboardRepository:
    """Executes raw SQL queries for dashboard aggregates."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def fetch_summary(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> DashboardSummary:
        totals = await self._load_kpis(org_id=org_id, division_id=division_id, include_templates=include_templates)
        projects = await self._load_projects(org_id=org_id, division_id=division_id, include_templates=include_templates)
        docs = await self._load_docs(org_id=org_id, division_id=division_id, include_templates=include_templates)
        activity = await self._load_activity(org_id=org_id, division_id=division_id, include_templates=include_templates)
        presence = await self._load_presence(org_id=org_id)

        has_templates = any(item.is_template for item in (*projects, *docs, *activity))

        return DashboardSummary(
            orgId=org_id,
            divisionId=division_id,
            generatedAt=datetime.now(timezone.utc),
            kpis=totals,
            projects=projects,
            docs=docs,
            activity=activity,
            presence=presence,
            hasTemplates=has_templates,
        )

    async def _load_kpis(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> list[DashboardKpi]:
        stmt = text(
            """
            WITH scoped_tasks AS (
                SELECT *
                  FROM public.workspace_tasks
                 WHERE org_id = :org_id
                   AND archived_at IS NULL
                   AND (:division_id IS NULL OR division_id IS NULL OR division_id = :division_id)
                   AND (:include_templates OR is_template = FALSE)
            )
            SELECT
                COUNT(*)::INT AS total_tasks,
                COUNT(*) FILTER (
                    WHERE due_at IS NOT NULL AND due_at < NOW()
                )::INT AS overdue_tasks,
                COUNT(*) FILTER (
                    WHERE (due_at IS NOT NULL AND due_at >= NOW() AND due_at < NOW() + INTERVAL '2 days')
                       OR (due_at IS NULL AND priority IN ('High', 'Urgent'))
                )::INT AS stuck_tasks
            FROM scoped_tasks
            """
        )
        result: CursorResult = await self._session.execute(
            stmt,
            {"org_id": org_id, "division_id": division_id, "include_templates": include_templates},
        )
        row = result.mappings().first() or {"total_tasks": 0, "overdue_tasks": 0, "stuck_tasks": 0}
        total = int(row["total_tasks"]) if row["total_tasks"] is not None else 0
        overdue = int(row["overdue_tasks"]) if row["overdue_tasks"] is not None else 0
        stuck = int(row["stuck_tasks"]) if row["stuck_tasks"] is not None else 0
        on_track = max(total - overdue - stuck, 0)

        return [
            DashboardKpi(id="onTrack", label="On Track", count=on_track, deltaDirection="flat"),
            DashboardKpi(id="stuck", label="At Risk", count=stuck, deltaDirection="flat"),
            DashboardKpi(id="overdue", label="Overdue", count=overdue, deltaDirection="flat"),
        ]

    async def _load_projects(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int = 6,
    ) -> list[WorkspaceProject]:
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   name,
                   description,
                   badge_count,
                   dot_color,
                   status,
                   default_view,
                   is_template,
                   updated_at
              FROM public.workspace_projects
             WHERE org_id = :org_id
               AND archived_at IS NULL
               AND (:division_id IS NULL OR division_id IS NULL OR division_id = :division_id)
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, updated_at DESC
             LIMIT :limit
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
                "limit": limit,
            },
        )
        rows = result.mappings().all()
        return [
            WorkspaceProject(
                id=str(row["id"]),
                orgId=str(row["org_id"]),
                divisionId=str(row["division_id"]) if row["division_id"] else None,
                name=row["name"],
                description=row["description"],
                badgeCount=row["badge_count"] or 0,
                dotColor=row["dot_color"],
                status=row["status"],
                defaultView=row["default_view"],
                isTemplate=row["is_template"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    async def _load_docs(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int = 6,
    ) -> list[WorkspaceDoc]:
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   name,
                   url,
                   summary,
                   is_template,
                   updated_at
              FROM public.workspace_docs
             WHERE org_id = :org_id
               AND archived_at IS NULL
               AND (:division_id IS NULL OR division_id IS NULL OR division_id = :division_id)
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, updated_at DESC
             LIMIT :limit
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
                "limit": limit,
            },
        )
        rows = result.mappings().all()
        return [
            WorkspaceDoc(
                id=str(row["id"]),
                orgId=str(row["org_id"]),
                divisionId=str(row["division_id"]) if row["division_id"] else None,
                name=row["name"],
                url=row["url"],
                summary=row["summary"],
                isTemplate=row["is_template"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    async def _load_activity(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int = 10,
    ) -> list[WorkspaceActivity]:
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   actor_id,
                   actor_name,
                   actor_role,
                   activity_type,
                   content,
                   metadata,
                   occurred_at,
                   is_template
              FROM public.workspace_activities
             WHERE org_id = :org_id
               AND (:division_id IS NULL OR division_id IS NULL OR division_id = :division_id)
               AND (:include_templates OR is_template = FALSE)
             ORDER BY occurred_at DESC
             LIMIT :limit
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "org_id": org_id,
                "division_id": division_id,
                "include_templates": include_templates,
                "limit": limit,
            },
        )
        rows = result.mappings().all()
        activities: list[WorkspaceActivity] = []
        for row in rows:
            metadata_value = row["metadata"]
            if isinstance(metadata_value, str):
                try:
                    metadata = json.loads(metadata_value)
                except json.JSONDecodeError:
                    metadata = None
            elif isinstance(metadata_value, dict):
                metadata = metadata_value
            else:
                metadata = None
            activities.append(
                WorkspaceActivity(
                    id=str(row["id"]),
                    orgId=str(row["org_id"]),
                    divisionId=str(row["division_id"]) if row["division_id"] else None,
                    activityType=row["activity_type"],
                    content=row["content"],
                    metadata=metadata,
                    occurredAt=row["occurred_at"],
                    isTemplate=row["is_template"],
                    author={
                        "id": str(row["actor_id"]) if row["actor_id"] else None,
                        "name": row["actor_name"] or "System",
                        "role": row["actor_role"],
                        "avatar": None,
                    },
                )
            )
        return activities

    async def _load_presence(self, *, org_id: str, limit: int = 12) -> list[DashboardPresenceMember]:
        stmt = text(
            """
            SELECT om.user_id,
                   COALESCE(u.display_name, u.full_name, u.name, u.email) AS display_name,
                   u.avatar_url,
                   om.role,
                   om.joined_at
              FROM public.org_memberships AS om
              LEFT JOIN public.users AS u ON u.id = om.user_id
             WHERE om.org_id = :org_id
             ORDER BY om.joined_at NULLS LAST
             LIMIT :limit
            """
        )
        result = await self._session.execute(stmt, {"org_id": org_id, "limit": limit})
        rows = result.mappings().all()
        presence: list[DashboardPresenceMember] = []
        statuses = ("online", "away", "offline")
        for index, row in enumerate(rows):
            member_id = row["user_id"]
            presence.append(
                DashboardPresenceMember(
                    id=str(member_id) if member_id else f"anonymous-{index}",
                    name=row["display_name"] or "Unknown member",
                    avatar=row["avatar_url"],
                    role=row["role"],
                    status=statuses[index % len(statuses)],
                )
            )
        return presence
