# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Workspace service with comprehensive scope validation and security.

This service implements secure workspace management operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Optional, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from ..organizations.schemas import OrganizationDivision, OrganizationResponse
from .repository import WorkspacePermissionRepository, WorkspaceRepository
from .schemas import (
    ActivityFeedResponse,
    ChannelCreatePayload,
    ChannelListResponse,
    ChannelUpdatePayload,
    ProjectCreatePayload,
    ProjectUpdatePayload,
    WorkspaceChannel,
    WorkspaceOverview,
    WorkspaceProject,
)
from .templates import build_template_payload

logger = logging.getLogger(__name__)


class WorkspaceCache:
    """Simple in-process TTL cache keyed by organization scope."""

    def __init__(self, ttl_seconds: int = 60) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, object]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[object]:
        async with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, payload = entry
            if time.monotonic() >= expires_at:
                self._store.pop(key, None)
                return None
            return payload

    async def set(self, key: str, payload: object) -> None:
        async with self._lock:
            self._store[key] = (time.monotonic() + self._ttl, payload)

    async def clear_scope(self, org_id: str) -> None:
        async with self._lock:
            keys_to_remove = [key for key in self._store if f":{org_id}:" in key]
            for key in keys_to_remove:
                self._store.pop(key, None)


class WorkspaceService(ScopedService):
    """
    Encapsulates secure workspace domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all workspace operations respect organization
    and division boundaries.
    """

    def __init__(
        self,
        repository: WorkspaceRepository,
        permission_repository: WorkspacePermissionRepository,
        cache: Optional[WorkspaceCache] = None,
    ) -> None:
        super().__init__()
        self._repository = repository
        self._permission_repository = permission_repository
        self._cache = cache or WorkspaceCache()

    # Organization-scoped methods
    async def get_overview_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> WorkspaceOverview:
        """
        Get workspace overview for an organization with scope validation.

        This method validates organization access and optionally division access
        before returning the overview.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"workspace:read"}
        )

        # Additional validation if division is specified
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, division_id, {"workspace:read"}
            )

        cache_key = f"overview:{org_id}:{division_id or 'all'}:{'templates' if include_templates else 'live'}:{principal.id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached  # type: ignore[return-value]
        overview = await self._repository.fetch_overview(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
        )
        await self._cache.set(cache_key, overview)
        return overview

    # Legacy method for backward compatibility
    async def get_overview(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
    ) -> WorkspaceOverview:
        """
        Legacy method - get overview with old permission validation.

        DEPRECATED: Use get_overview_for_organization instead for better security.
        """
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, division_id)
        cache_key = f"overview:{org_id}:{division_id or 'all'}:{'templates' if include_templates else 'live'}:{principal.id}"
        cached = await self._cache.get(cache_key)
        if cached:
            return cached  # type: ignore[return-value]
        overview = await self._repository.fetch_overview(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
        )
        await self._cache.set(cache_key, overview)
        return overview

    async def list_channels_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        page: int,
        page_size: int,
    ) -> ChannelListResponse:
        """
        List channels for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"channel:read"}
        )

        # Additional validation if division is specified
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, division_id, {"channel:read"}
            )

        return await self._repository.list_channels(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            page=page,
            page_size=page_size,
        )

    # Legacy method for backward compatibility
    async def list_channels(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        page: int,
        page_size: int,
    ) -> ChannelListResponse:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, division_id)
        return await self._repository.list_channels(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            page=page,
            page_size=page_size,
        )

    async def fetch_activity_feed_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int,
        cursor: Optional[str],
    ) -> ActivityFeedResponse:
        """
        Fetch activity feed for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"activity:read"}
        )

        # Additional validation if division is specified
        if division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, division_id, {"activity:read"}
            )

        return await self._repository.fetch_activity_feed(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            limit=limit,
            cursor=cursor,
        )

    async def create_project_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: ProjectCreatePayload,
    ) -> WorkspaceProject:
        """
        Create a project for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"project:create"}
        )

        # Additional validation if division is specified
        if payload.division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, payload.division_id, {"project:create"}
            )

        project = await self._repository.create_project(org_id=org_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return project

    async def update_project_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        project_id: str,
        org_id: str,
        payload: ProjectUpdatePayload,
    ) -> WorkspaceProject:
        """
        Update a project for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"project:update"}
        )

        # Additional validation if division is specified
        if payload.division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, payload.division_id, {"project:update"}
            )

        project = await self._repository.update_project(project_id=project_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return project

    async def delete_project_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        project_id: str,
        org_id: str,
    ) -> None:
        """
        Delete a project for an organization with scope validation.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"project:delete"}
        )

        await self._repository.delete_project(project_id=project_id)
        await self._cache.clear_scope(org_id)

    async def create_channel_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: ChannelCreatePayload,
    ) -> WorkspaceChannel:
        """
        Create a channel for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"channel:create"}
        )

        # Additional validation if division is specified
        if payload.division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, payload.division_id, {"channel:create"}
            )

        channel = await self._repository.create_channel(org_id=org_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return channel

    async def update_channel_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        channel_id: str,
        org_id: str,
        payload: ChannelUpdatePayload,
    ) -> WorkspaceChannel:
        """
        Update a channel for an organization with scope validation.
        """
        # Base validation for organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"channel:update"}
        )

        # Additional validation if division is specified
        if payload.division_id:
            scope_ctx = await self.validate_division_access(
                principal, org_id, payload.division_id, {"channel:update"}
            )

        channel = await self._repository.update_channel(channel_id=channel_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return channel

    async def delete_channel_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        channel_id: str,
        org_id: str,
    ) -> None:
        """
        Delete a channel for an organization with scope validation.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, org_id, {"channel:delete"}
        )

        await self._repository.delete_channel(channel_id=channel_id)
        await self._cache.clear_scope(org_id)

    # Legacy methods for backward compatibility
    async def fetch_activity_feed(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        division_id: Optional[str],
        include_templates: bool,
        limit: int,
        cursor: Optional[str],
    ) -> ActivityFeedResponse:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, division_id)
        return await self._repository.fetch_activity_feed(
            org_id=org_id,
            division_id=division_id,
            include_templates=include_templates,
            limit=limit,
            cursor=cursor,
        )

    async def create_project(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: ProjectCreatePayload,
    ) -> WorkspaceProject:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, payload.division_id)
        project = await self._repository.create_project(org_id=org_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return project

    async def update_project(
        self,
        *,
        principal: CurrentPrincipal,
        project_id: str,
        org_id: str,
        payload: ProjectUpdatePayload,
    ) -> WorkspaceProject:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, payload.division_id)
        project = await self._repository.update_project(project_id=project_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return project

    async def delete_project(
        self,
        *,
        principal: CurrentPrincipal,
        project_id: str,
        org_id: str,
    ) -> None:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._repository.delete_project(project_id=project_id)
        await self._cache.clear_scope(org_id)

    async def create_channel(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: ChannelCreatePayload,
    ) -> WorkspaceChannel:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, payload.division_id)
        channel = await self._repository.create_channel(org_id=org_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return channel

    async def update_channel(
        self,
        *,
        principal: CurrentPrincipal,
        channel_id: str,
        org_id: str,
        payload: ChannelUpdatePayload,
    ) -> WorkspaceChannel:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._permission_repository.ensure_division_membership(principal, org_id, payload.division_id)
        channel = await self._repository.update_channel(channel_id=channel_id, payload=payload)
        await self._cache.clear_scope(org_id)
        return channel

    async def delete_channel(
        self,
        *,
        principal: CurrentPrincipal,
        channel_id: str,
        org_id: str,
    ) -> None:
        await self._permission_repository.ensure_membership(principal, org_id)
        await self._repository.delete_channel(channel_id=channel_id)
        await self._cache.clear_scope(org_id)


class WorkspaceTemplateService(ScopedService):
    """
    Encapsulates secure workspace template behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all template operations respect organization
    and division boundaries.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self._session = session

    async def _should_seed(self, org_id: str) -> bool:
        query = text(
            """
            SELECT EXISTS (
                SELECT 1 FROM public.workspace_projects WHERE org_id = :org_id
            ) OR EXISTS (
                SELECT 1 FROM public.workspace_channels WHERE org_id = :org_id
            )
            """
        )
        result = await self._session.execute(query, {"org_id": org_id})
        exists = result.scalar()
        return not bool(exists)

    async def seed_for_organization(
        self,
        *,
        principal: CurrentPrincipal,
        organization: OrganizationResponse,
        divisions: Sequence[OrganizationDivision],
        seeded_by: Optional[str] = None,
    ) -> None:
        """
        Seed template data for an organization with scope validation.

        This method validates that the principal has admin access to the organization
        before seeding template data.
        """
        # Validate organization admin access
        scope_ctx = await self.validate_organization_access(
            principal, organization.id, {"workspace:admin"}
        )
        if not await self._should_seed(organization.id):
            logger.info(
                "workspace.templates.skip", extra={"org_id": organization.id, "reason": "already-populated"}
            )
            return

        payload = build_template_payload(organization, divisions)
        template_source = "default:v1"
        now_query = text("SELECT NOW()")
        now_result = await self._session.execute(now_query)
        timestamp = now_result.scalar_one()
        projects_json = json.dumps(payload["projects"])
        tasks_json = json.dumps(payload["tasks"])
        docs_json = json.dumps(payload["docs"])
        channels_json = json.dumps(payload["channels"])
        activities_json = json.dumps(payload["activities"])

        async with self._session.begin():
            await self._session.execute(
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
                    template_source,
                    created_at,
                    updated_at
                )
                SELECT :org_id,
                       CAST(projects->>'division_id' AS UUID),
                       projects->>'name',
                       projects->>'description',
                       COALESCE((projects->>'badge_count')::INT, 0),
                       COALESCE(projects->>'dot_color', 'bg-blue-500'),
                       'active',
                       'board',
                       TRUE,
                       :template_source,
                       :timestamp,
                       :timestamp
                  FROM JSONB_ARRAY_ELEMENTS(:projects::JSONB) AS projects
                """,
                {
                    "org_id": organization.id,
                    "projects": projects_json,
                    "template_source": template_source,
                    "timestamp": timestamp,
                },
            )

            await self._session.execute(
                """
                INSERT INTO public.workspace_tasks (
                    org_id,
                    division_id,
                    project_id,
                    name,
                    priority,
                    badge_variant,
                    dot_color,
                    due_at,
                    is_template,
                    template_source,
                    created_at,
                    updated_at
                )
                SELECT :org_id,
                       CAST(tasks->>'division_id' AS UUID),
                       (
                           SELECT id FROM public.workspace_projects
                            WHERE org_id = :org_id
                              AND name = tasks->>'project_name'
                            LIMIT 1
                       ),
                       tasks->>'name',
                       COALESCE(tasks->>'priority', 'Medium'),
                       COALESCE(tasks->>'badge_variant', 'secondary'),
                       COALESCE(tasks->>'dot_color', 'bg-blue-500'),
                       COALESCE((tasks->>'due_at')::timestamptz, NULL),
                       TRUE,
                       :template_source,
                       :timestamp,
                       :timestamp
                  FROM JSONB_ARRAY_ELEMENTS(:tasks::JSONB) AS tasks
                """,
                {
                    "org_id": organization.id,
                    "tasks": tasks_json,
                    "template_source": template_source,
                    "timestamp": timestamp,
                },
            )

            await self._session.execute(
                """
                INSERT INTO public.workspace_docs (
                    org_id,
                    division_id,
                    name,
                    url,
                    summary,
                    is_template,
                    template_source,
                    created_at,
                    updated_at
                )
                SELECT :org_id,
                       CAST(docs->>'division_id' AS UUID),
                       docs->>'name',
                       docs->>'url',
                       docs->>'summary',
                       TRUE,
                       :template_source,
                       :timestamp,
                       :timestamp
                  FROM JSONB_ARRAY_ELEMENTS(:docs::JSONB) AS docs
                """,
                {
                    "org_id": organization.id,
                    "docs": docs_json,
                    "template_source": template_source,
                    "timestamp": timestamp,
                },
            )

            await self._session.execute(
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
                    template_source,
                    created_at,
                    updated_at
                )
                SELECT :org_id,
                       CAST(channels->>'division_id' AS UUID),
                       channels->>'slug',
                       channels->>'name',
                       COALESCE(channels->>'channel_type', 'public'),
                       channels->>'topic',
                       channels->>'description',
                       0,
                       FALSE,
                       FALSE,
                       0,
                       TRUE,
                       :template_source,
                       :timestamp,
                       :timestamp
                  FROM JSONB_ARRAY_ELEMENTS(:channels::JSONB) AS channels
                """,
                {
                    "org_id": organization.id,
                    "channels": channels_json,
                    "template_source": template_source,
                    "timestamp": timestamp,
                },
            )

            await self._session.execute(
                """
                INSERT INTO public.workspace_activities (
                    org_id,
                    division_id,
                    actor_id,
                    actor_name,
                    actor_role,
                    activity_type,
                    content,
                    metadata,
                    occurred_at,
                    is_template,
                    template_source,
                    created_at
                )
                SELECT :org_id,
                       CAST(activities->>'division_id' AS UUID),
                       :seeded_by,
                       COALESCE(:seeded_by_name, 'Workspace Guide'),
                       'guide',
                       activities->>'activity_type',
                       activities->>'content',
                       activities->'metadata',
                       :timestamp,
                       TRUE,
                       :template_source,
                       :timestamp
                  FROM JSONB_ARRAY_ELEMENTS(:activities::JSONB) AS activities
                """,
                {
                    "org_id": organization.id,
                    "activities": activities_json,
                    "template_source": template_source,
                    "timestamp": timestamp,
                    "seeded_by": seeded_by or principal.id,
                    "seeded_by_name": organization.name,
                },
            )

        logger.info(
            "workspace.templates.seeded",
            extra={
                "org_id": organization.id,
                "division_count": len(divisions),
                "template_source": template_source,
            },
        )

