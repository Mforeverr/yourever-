"""Unit tests for the workspace service layer."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.dependencies import CurrentPrincipal
from app.modules.workspace.repository import WorkspacePermissionRepository, WorkspaceRepository
from app.modules.workspace.schemas import (
    ChannelUpdatePayload,
    ProjectCreatePayload,
    WorkspaceChannel,
    WorkspaceOverview,
    WorkspaceProject,
)
from app.modules.workspace.service import WorkspaceCache, WorkspaceService


pytestmark = pytest.mark.asyncio


class TestWorkspaceService:
    """Validate caching and permission behaviour for workspace operations."""

    @pytest.fixture()
    def principal(self) -> CurrentPrincipal:
        return CurrentPrincipal(id="user-1", email="user@example.com", role="member")

    @pytest.fixture()
    def repository(self) -> AsyncMock:
        return AsyncMock(spec=WorkspaceRepository)

    @pytest.fixture()
    def permission_repository(self) -> AsyncMock:
        repo = AsyncMock(spec=WorkspacePermissionRepository)
        repo.ensure_membership.return_value = None
        repo.ensure_division_membership.return_value = None
        return repo

    @pytest.fixture()
    def cache(self) -> WorkspaceCache:
        return WorkspaceCache(ttl_seconds=60)

    @pytest.fixture()
    def service(
        self,
        repository: AsyncMock,
        permission_repository: AsyncMock,
        cache: WorkspaceCache,
    ) -> WorkspaceService:
        return WorkspaceService(
            repository=repository,
            permission_repository=permission_repository,
            cache=cache,
        )

    async def test_get_overview_uses_cache(
        self,
        service: WorkspaceService,
        repository: AsyncMock,
        permission_repository: AsyncMock,
        principal: CurrentPrincipal,
    ) -> None:
        """Repeated overview calls should reuse the cached payload and avoid extra queries."""

        overview = WorkspaceOverview(
            orgId="org-1",
            divisionId=None,
            projects=[],
            tasks=[],
            docs=[],
            channels=[],
            hasTemplates=False,
        )
        repository.fetch_overview.return_value = overview

        first = await service.get_overview(
            principal=principal,
            org_id="org-1",
            division_id=None,
            include_templates=True,
        )
        second = await service.get_overview(
            principal=principal,
            org_id="org-1",
            division_id=None,
            include_templates=True,
        )

        assert first is overview
        assert second is overview
        repository.fetch_overview.assert_awaited_once_with(
            org_id="org-1",
            division_id=None,
            include_templates=True,
        )
        permission_repository.ensure_membership.assert_awaited()
        permission_repository.ensure_division_membership.assert_awaited()

    async def test_create_project_clears_cache(
        self,
        repository: AsyncMock,
        permission_repository: AsyncMock,
        principal: CurrentPrincipal,
    ) -> None:
        """Creating a project should invalidate cached overview payloads."""

        cache_mock = AsyncMock(spec=WorkspaceCache)
        service = WorkspaceService(
            repository=repository,
            permission_repository=permission_repository,
            cache=cache_mock,
        )

        repository.create_project.return_value = WorkspaceProject(
            id="proj-1",
            orgId="org-1",
            divisionId="div-1",
            name="Sample",
            description=None,
            badgeCount=0,
            dotColor="bg-blue-500",
            status="active",
            defaultView="board",
            isTemplate=False,
            updatedAt=datetime.now(timezone.utc),
        )

        payload = ProjectCreatePayload(name="Sample", divisionId="div-1")

        await service.create_project(
            principal=principal,
            org_id="org-1",
            payload=payload,
        )

        repository.create_project.assert_awaited_once_with(org_id="org-1", payload=payload)
        permission_repository.ensure_membership.assert_awaited_with(principal, "org-1")
        permission_repository.ensure_division_membership.assert_awaited_with(
            principal,
            "org-1",
            "div-1",
        )
        cache_mock.clear_scope.assert_awaited_once_with("org-1")

    async def test_update_channel_checks_permissions(
        self,
        service: WorkspaceService,
        repository: AsyncMock,
        permission_repository: AsyncMock,
        principal: CurrentPrincipal,
    ) -> None:
        """Updating a channel should enforce division membership and return repository payload."""

        channel = WorkspaceChannel(
            id="chan-1",
            orgId="org-1",
            divisionId="div-2",
            slug="general",
            name="General",
            channelType="public",
            topic=None,
            description=None,
            memberCount=10,
            isFavorite=False,
            isMuted=False,
            unreadCount=0,
            isTemplate=False,
            updatedAt=datetime.now(timezone.utc),
        )
        repository.update_channel.return_value = channel

        payload = ChannelUpdatePayload(
            name="General",
            slug="general",
            channelType="public",
            divisionId="div-2",
        )

        result = await service.update_channel(
            principal=principal,
            channel_id="chan-1",
            org_id="org-1",
            payload=payload,
        )

        assert result == channel
        permission_repository.ensure_membership.assert_awaited_with(principal, "org-1")
        permission_repository.ensure_division_membership.assert_awaited_with(
            principal,
            "org-1",
            "div-2",
        )
        repository.update_channel.assert_awaited_once_with(channel_id="chan-1", payload=payload)
