"""Persistence layer for workspace data."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import CursorResult, text
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .schemas import (
    ActivityFeedResponse,
    ChannelCreatePayload,
    ChannelListResponse,
    ChannelUpdatePayload,
    ProjectCreatePayload,
    ProjectUpdatePayload,
    WorkspaceActivity,
    WorkspaceChannel,
    WorkspaceDoc,
    WorkspaceOverview,
    WorkspaceProject,
    WorkspaceTask,
)


class WorkspaceRepository:
    """Repository encapsulating SQL for workspace resources."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def fetch_overview(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> WorkspaceOverview:
        projects = await self._fetch_projects(org_id=org_id, division_id=division_id, include_templates=include_templates)
        tasks = await self._fetch_tasks(org_id=org_id, division_id=division_id, include_templates=include_templates)
        docs = await self._fetch_docs(org_id=org_id, division_id=division_id, include_templates=include_templates)
        channels = await self._fetch_channels(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            page=1,
            page_size=50,
        )
        has_templates = any(item.is_template for item in (*projects, *tasks, *docs, *channels.items))
        return WorkspaceOverview(
            orgId=org_id,
            divisionId=division_id,
            projects=projects,
            tasks=tasks,
            docs=docs,
            channels=channels.items,
            hasTemplates=has_templates,
        )

    async def _fetch_projects(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
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
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, updated_at DESC
            """
        )
        result: CursorResult = await self._session.execute(
            stmt,
            {"org_id": org_id, "division_id": division_id, "include_templates": include_templates},
        )
        rows = result.mappings().all()
        return [
            WorkspaceProject(
                id=row["id"],
                orgId=row["org_id"],
                divisionId=row["division_id"],
                name=row["name"],
                description=row["description"],
                badgeCount=row["badge_count"],
                dotColor=row["dot_color"],
                status=row["status"],
                defaultView=row["default_view"],
                isTemplate=row["is_template"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    async def _fetch_tasks(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> list[WorkspaceTask]:
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   project_id,
                   name,
                   priority,
                   badge_variant,
                   dot_color,
                   is_template,
                   updated_at
              FROM public.workspace_tasks
             WHERE org_id = :org_id
               AND archived_at IS NULL
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, updated_at DESC
            """
        )
        result = await self._session.execute(
            stmt,
            {"org_id": org_id, "division_id": division_id, "include_templates": include_templates},
        )
        rows = result.mappings().all()
        return [
            WorkspaceTask(
                id=row["id"],
                orgId=row["org_id"],
                divisionId=row["division_id"],
                projectId=row["project_id"],
                name=row["name"],
                priority=row["priority"],
                badgeVariant=row["badge_variant"],
                dotColor=row["dot_color"],
                isTemplate=row["is_template"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    async def _fetch_docs(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
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
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, updated_at DESC
            """
        )
        result = await self._session.execute(
            stmt,
            {"org_id": org_id, "division_id": division_id, "include_templates": include_templates},
        )
        rows = result.mappings().all()
        return [
            WorkspaceDoc(
                id=row["id"],
                orgId=row["org_id"],
                divisionId=row["division_id"],
                name=row["name"],
                url=row["url"],
                summary=row["summary"],
                isTemplate=row["is_template"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    async def _fetch_channels(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        page: int,
        page_size: int,
    ) -> ChannelListResponse:
        offset = max(page - 1, 0) * page_size
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   slug,
                   name,
                   channel_type,
                   topic,
                   description,
                   member_count,
                   is_favorite,
                   is_muted,
                   unread_count,
                   is_template,
                   updated_at
              FROM public.workspace_channels
             WHERE org_id = :org_id
               AND archived_at IS NULL
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
             ORDER BY is_template DESC, name ASC
             LIMIT :limit OFFSET :offset
            """
        )
        total_stmt = text(
            """
            SELECT COUNT(*)::INT
              FROM public.workspace_channels
             WHERE org_id = :org_id
               AND archived_at IS NULL
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
            """
        )
        params = {
            "org_id": org_id,
            "division_id": division_id,
            "include_templates": include_templates,
            "limit": page_size,
            "offset": offset,
        }
        result = await self._session.execute(stmt, params)
        rows = result.mappings().all()
        total_result = await self._session.execute(total_stmt, params)
        total = int(total_result.scalar_one())
        return ChannelListResponse(
            items=[
                WorkspaceChannel(
                    id=row["id"],
                    orgId=row["org_id"],
                    divisionId=row["division_id"],
                    slug=row["slug"],
                    name=row["name"],
                    channelType=row["channel_type"],
                    topic=row["topic"],
                    description=row["description"],
                    memberCount=row["member_count"],
                    isFavorite=row["is_favorite"],
                    isMuted=row["is_muted"],
                    unreadCount=row["unread_count"],
                    isTemplate=row["is_template"],
                    updatedAt=row["updated_at"],
                )
                for row in rows
            ],
            total=total,
            page=page,
            pageSize=page_size,
        )

    async def list_channels(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        page: int,
        page_size: int,
    ) -> ChannelListResponse:
        return await self._fetch_channels(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            page=page,
            page_size=page_size,
        )

    async def fetch_activity_feed(
        self,
        *,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int,
        cursor: Optional[str],
    ) -> ActivityFeedResponse:
        cursor_ts: Optional[datetime] = None
        if cursor:
            cursor_ts = datetime.fromisoformat(cursor)
        stmt = text(
            """
            SELECT id,
                   org_id,
                   division_id,
                   activity_type,
                   content,
                   metadata,
                   occurred_at,
                   is_template,
                   actor_id,
                   actor_name,
                   actor_role
              FROM public.workspace_activities
             WHERE org_id = :org_id
               AND (CAST(:division_id AS UUID) IS NULL OR division_id IS NULL OR division_id = CAST(:division_id AS UUID))
               AND (:include_templates OR is_template = FALSE)
               AND (:cursor_ts IS NULL OR occurred_at < :cursor_ts)
             ORDER BY occurred_at DESC
             LIMIT :limit
            """
        )
        params = {
            "org_id": org_id,
            "division_id": division_id,
            "include_templates": include_templates,
            "cursor_ts": cursor_ts,
            "limit": limit,
        }
        result = await self._session.execute(stmt, params)
        rows = result.mappings().all()
        activities = [
            WorkspaceActivity(
                id=row["id"],
                orgId=row["org_id"],
                divisionId=row["division_id"],
                activityType=row["activity_type"],
                content=row["content"],
                metadata=row["metadata"],
                occurredAt=row["occurred_at"],
                isTemplate=row["is_template"],
                author={
                    "id": row["actor_id"],
                    "name": row["actor_name"] or "Workspace",  # fallback to generic name
                    "role": row["actor_role"],
                },
            )
            for row in rows
        ]
        next_cursor = activities[-1].occurredAt.isoformat() if len(activities) == limit else None
        return ActivityFeedResponse(items=activities, nextCursor=next_cursor)

    async def create_project(
        self,
        *,
        org_id: str,
        payload: ProjectCreatePayload,
    ) -> WorkspaceProject:
        stmt = text(
            """
            INSERT INTO public.workspace_projects (
                org_id,
                division_id,
                name,
                description,
                badge_count,
                dot_color,
                status,
                default_view,
                is_template,
                template_source
            )
            VALUES (:org_id, :division_id, :name, :description, :badge_count, :dot_color, 'active', 'board', FALSE, NULL)
            RETURNING id,
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
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "org_id": org_id,
                "division_id": payload.division_id,
                "name": payload.name,
                "description": payload.description,
                "badge_count": payload.badge_count,
                "dot_color": payload.dot_color,
            },
        )
        row = result.mappings().one()
        await self._session.commit()
        return WorkspaceProject(
            id=row["id"],
            orgId=row["org_id"],
            divisionId=row["division_id"],
            name=row["name"],
            description=row["description"],
            badgeCount=row["badge_count"],
            dotColor=row["dot_color"],
            status=row["status"],
            defaultView=row["default_view"],
            isTemplate=row["is_template"],
            updatedAt=row["updated_at"],
        )

    async def update_project(
        self,
        *,
        project_id: str,
        payload: ProjectUpdatePayload,
    ) -> WorkspaceProject:
        stmt = text(
            """
            UPDATE public.workspace_projects
               SET name = :name,
                   description = :description,
                   badge_count = :badge_count,
                   dot_color = :dot_color,
                   division_id = :division_id,
                   archived_at = :archived_at
             WHERE id = :project_id
             RETURNING id,
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
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "project_id": project_id,
                "name": payload.name,
                "description": payload.description,
                "badge_count": payload.badge_count,
                "dot_color": payload.dot_color,
                "division_id": payload.division_id,
                "archived_at": payload.archived_at,
            },
        )
        row = result.mappings().one()
        await self._session.commit()
        return WorkspaceProject(
            id=row["id"],
            orgId=row["org_id"],
            divisionId=row["division_id"],
            name=row["name"],
            description=row["description"],
            badgeCount=row["badge_count"],
            dotColor=row["dot_color"],
            status=row["status"],
            defaultView=row["default_view"],
            isTemplate=row["is_template"],
            updatedAt=row["updated_at"],
        )

    async def delete_project(self, *, project_id: str) -> None:
        stmt = text(
            """DELETE FROM public.workspace_projects WHERE id = :project_id"""
        )
        await self._session.execute(stmt, {"project_id": project_id})
        await self._session.commit()

    async def create_channel(
        self,
        *,
        org_id: str,
        payload: ChannelCreatePayload,
    ) -> WorkspaceChannel:
        stmt = text(
            """
            INSERT INTO public.workspace_channels (
                org_id,
                division_id,
                slug,
                name,
                channel_type,
                topic,
                description,
                member_count,
                is_favorite,
                is_muted,
                unread_count,
                is_template,
                template_source
            )
            VALUES (
                :org_id,
                :division_id,
                :slug,
                :name,
                :channel_type,
                :topic,
                :description,
                0,
                FALSE,
                FALSE,
                0,
                FALSE,
                NULL
            )
            RETURNING id,
                      org_id,
                      division_id,
                      slug,
                      name,
                      channel_type,
                      topic,
                      description,
                      member_count,
                      is_favorite,
                      is_muted,
                      unread_count,
                      is_template,
                      updated_at
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "org_id": org_id,
                "division_id": payload.division_id,
                "slug": payload.slug,
                "name": payload.name,
                "channel_type": payload.channel_type,
                "topic": payload.topic,
                "description": payload.description,
            },
        )
        row = result.mappings().one()
        await self._session.commit()
        return WorkspaceChannel(
            id=row["id"],
            orgId=row["org_id"],
            divisionId=row["division_id"],
            slug=row["slug"],
            name=row["name"],
            channelType=row["channel_type"],
            topic=row["topic"],
            description=row["description"],
            memberCount=row["member_count"],
            isFavorite=row["is_favorite"],
            isMuted=row["is_muted"],
            unreadCount=row["unread_count"],
            isTemplate=row["is_template"],
            updatedAt=row["updated_at"],
        )

    async def update_channel(
        self,
        *,
        channel_id: str,
        payload: ChannelUpdatePayload,
    ) -> WorkspaceChannel:
        stmt = text(
            """
            UPDATE public.workspace_channels
               SET slug = :slug,
                   name = :name,
                   channel_type = :channel_type,
                   topic = :topic,
                   description = :description,
                   division_id = :division_id,
                   is_favorite = COALESCE(:is_favorite, is_favorite),
                   is_muted = COALESCE(:is_muted, is_muted),
                   archived_at = :archived_at
             WHERE id = :channel_id
             RETURNING id,
                       org_id,
                       division_id,
                       slug,
                       name,
                       channel_type,
                       topic,
                       description,
                       member_count,
                       is_favorite,
                       is_muted,
                       unread_count,
                       is_template,
                       updated_at
            """
        )
        result = await self._session.execute(
            stmt,
            {
                "channel_id": channel_id,
                "slug": payload.slug,
                "name": payload.name,
                "channel_type": payload.channel_type,
                "topic": payload.topic,
                "description": payload.description,
                "division_id": payload.division_id,
                "is_favorite": payload.is_favorite,
                "is_muted": payload.is_muted,
                "archived_at": payload.archived_at,
            },
        )
        row = result.mappings().one()
        await self._session.commit()
        return WorkspaceChannel(
            id=row["id"],
            orgId=row["org_id"],
            divisionId=row["division_id"],
            slug=row["slug"],
            name=row["name"],
            channelType=row["channel_type"],
            topic=row["topic"],
            description=row["description"],
            memberCount=row["member_count"],
            isFavorite=row["is_favorite"],
            isMuted=row["is_muted"],
            unreadCount=row["unread_count"],
            isTemplate=row["is_template"],
            updatedAt=row["updated_at"],
        )

    async def delete_channel(self, *, channel_id: str) -> None:
        stmt = text("DELETE FROM public.workspace_channels WHERE id = :channel_id")
        await self._session.execute(stmt, {"channel_id": channel_id})
        await self._session.commit()


class WorkspacePermissionRepository:
    """Validates access to workspace entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def ensure_membership(self, principal: CurrentPrincipal, org_id: str) -> None:
        stmt = text(
            """
            SELECT 1
              FROM public.org_memberships
             WHERE user_id = :user_id
               AND org_id = :org_id
             LIMIT 1
            """
        )
        result = await self._session.execute(stmt, {"user_id": principal.id, "org_id": org_id})
        if result.scalar_one_or_none() is None:
            raise PermissionError("User does not belong to this organization")

    async def ensure_division_membership(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
    ) -> None:
        if division_id is None:
            return
        stmt = text(
            """
            SELECT 1
              FROM public.division_memberships AS dm
              JOIN public.divisions AS d ON dm.division_id = d.id
             WHERE dm.user_id = :user_id
               AND dm.division_id = :division_id
               AND d.org_id = :org_id
             LIMIT 1
            """
        )
        result = await self._session.execute(
            stmt,
            {"user_id": principal.id, "division_id": division_id, "org_id": org_id},
        )
        if result.scalar_one_or_none() is None:
            raise PermissionError("User does not belong to this division")

