# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
Integration tests for project management REST API endpoints.

Tests the complete project workspace functionality including:
- Project CRUD operations with scope validation
- Workspace snapshot functionality
- Workspace views management
- Error handling and security
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, AsyncMock

from app.main import app
from app.dependencies import CurrentPrincipal
from app.modules.projects.schemas import (
    ProjectStatus,
    ProjectPriority,
    ViewType,
    ProjectMemberRole
)
from app.modules.projects.di import get_project_service


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_principal():
    """Create mock principal for testing."""
    return CurrentPrincipal(
        id="test_user_id",
        email="test@example.com",
        org_ids=["test_org_id"],
        active_division_id="test_division_id",
        permissions={"project:read", "project:create", "project:update", "project:delete"}
    )


@pytest.fixture
def mock_project_service():
    """Create mock project service."""
    service = Mock()
    service.list_projects_for_division = AsyncMock()
    service.create_project_for_division = AsyncMock()
    service.get_project_for_division = AsyncMock()
    service.update_project_for_division = AsyncMock()
    service.delete_project_for_division = AsyncMock()
    service.get_project_workspace_snapshot = AsyncMock()
    service.list_workspace_views = AsyncMock()
    service.create_workspace_view = AsyncMock()
    service.update_workspace_view = AsyncMock()
    service.delete_workspace_view = AsyncMock()
    return service


class TestProjectWorkspaceEndpoints:
    """Test project workspace management endpoints."""

    def test_get_project_workspace_snapshot_success(self, client, mock_project_service, mock_principal):
        """Test successful workspace snapshot retrieval."""
        # Mock the workspace snapshot response
        from app.modules.projects.schemas import (
            ProjectWorkspaceSnapshot,
            ProjectDetails,
            ProjectCapabilities,
            ProjectFeatureFlags,
            ProjectMember,
            WorkspaceView
        )
        from datetime import datetime

        mock_snapshot = ProjectWorkspaceSnapshot(
            project=ProjectDetails(
                id="mock_project_id",
                name="Test Project",
                status=ProjectStatus.ACTIVE,
                priority=ProjectPriority.MEDIUM,
                org_id="test_org_id",
                division_id="test_division_id",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            members=[
                ProjectMember(
                    userId="test_user_id",
                    role=ProjectMemberRole.OWNER,
                    joinedAt=datetime.utcnow()
                )
            ],
            views=[
                WorkspaceView(
                    id="view_1",
                    type=ViewType.BOARD,
                    name="Sprint Board",
                    is_default=True,
                    settings={"groupBy": "status"}
                )
            ],
            capabilities=ProjectCapabilities(
                can_manage_project=True,
                can_manage_views=True,
                can_manage_members=True,
                can_create_tasks=True,
                can_delete_project=True
            ),
            feature_flags=ProjectFeatureFlags(
                project_workspace=True,
                project_sidebar=False,
                advanced_views=False,
                real_time_collaboration=True
            ),
            active_view_id="view_1"
        )

        mock_project_service.get_project_workspace_snapshot.return_value = mock_snapshot

        # Override dependency injection
        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.get(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/workspace",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["project"]["id"] == "mock_project_id"
        assert data["project"]["name"] == "Test Project"
        assert len(data["members"]) == 1
        assert len(data["views"]) == 1
        assert data["capabilities"]["canManageProject"] is True
        assert data["featureFlags"]["projectWorkspace"] is True
        assert data["activeViewId"] == "view_1"

        # Clean up
        app.dependency_overrides.clear()

    def test_get_project_workspace_snapshot_not_found(self, client, mock_project_service):
        """Test workspace snapshot with non-existent project."""
        mock_project_service.get_project_workspace_snapshot.return_value = None

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.get(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/nonexistent_project/workspace",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Project not found or access denied"

        app.dependency_overrides.clear()

    def test_list_workspace_views_success(self, client, mock_project_service):
        """Test successful workspace views listing."""
        from app.modules.projects.schemas import WorkspaceViewsList, WorkspaceView
        from datetime import datetime

        mock_views_list = WorkspaceViewsList(
            views=[
                WorkspaceView(
                    id="view_1",
                    type=ViewType.BOARD,
                    name="Sprint Board",
                    is_default=True,
                    settings={"groupBy": "status"}
                ),
                WorkspaceView(
                    id="view_2",
                    type=ViewType.CALENDAR,
                    name="Release Calendar",
                    is_default=False,
                    settings={"source": "tasks.dueDate"}
                )
            ],
            total=2,
            default_view_id="view_1"
        )

        mock_project_service.list_workspace_views.return_value = mock_views_list

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.get(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/views",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["views"]) == 2
        assert data["total"] == 2
        assert data["defaultViewId"] == "view_1"
        assert data["views"][0]["type"] == "board"
        assert data["views"][1]["type"] == "calendar"

        app.dependency_overrides.clear()

    def test_create_workspace_view_success(self, client, mock_project_service):
        """Test successful workspace view creation."""
        from app.modules.projects.schemas import WorkspaceView
        from datetime import datetime

        mock_view = WorkspaceView(
            id="new_view_id",
            type=ViewType.LIST,
            name="Task List",
            is_default=False,
            settings={"sortBy": "priority"}
        )

        mock_project_service.create_workspace_view.return_value = mock_view

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        view_data = {
            "type": "list",
            "name": "Task List",
            "isDefault": False,
            "settings": {"sortBy": "priority"}
        }

        response = client.post(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/views",
            json=view_data,
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "new_view_id"
        assert data["type"] == "list"
        assert data["name"] == "Task List"
        assert data["isDefault"] is False
        assert data["settings"]["sortBy"] == "priority"

        app.dependency_overrides.clear()

    def test_update_workspace_view_success(self, client, mock_project_service):
        """Test successful workspace view update."""
        from app.modules.projects.schemas import WorkspaceView
        from datetime import datetime

        mock_view = WorkspaceView(
            id="view_1",
            type=ViewType.BOARD,
            name="Updated Board Name",
            is_default=True,
            settings={"groupBy": "priority", "swimlanes": "assignee"}
        )

        mock_project_service.update_workspace_view.return_value = mock_view

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        update_data = {
            "name": "Updated Board Name",
            "isDefault": True,
            "settings": {"groupBy": "priority", "swimlanes": "assignee"}
        }

        response = client.patch(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/views/view_1",
            json=update_data,
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Board Name"
        assert data["isDefault"] is True
        assert data["settings"]["groupBy"] == "priority"

        app.dependency_overrides.clear()

    def test_delete_workspace_view_success(self, client, mock_project_service):
        """Test successful workspace view deletion."""
        mock_project_service.delete_workspace_view.return_value = True

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.delete(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/views/view_1",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 204
        assert response.content == b""

        app.dependency_overrides.clear()

    def test_delete_workspace_view_not_found(self, client, mock_project_service):
        """Test workspace view deletion with non-existent view."""
        mock_project_service.delete_workspace_view.return_value = False

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.delete(
            "/api/organizations/test_org_id/divisions/test_division_id/projects/mock_project_id/views/nonexistent_view",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "View not found or access denied"

        app.dependency_overrides.clear()


class TestProjectCRUDEndpoints:
    """Test project CRUD operations."""

    def test_create_project_success(self, client, mock_project_service):
        """Test successful project creation."""
        from app.modules.projects.schemas import ProjectDetails
        from datetime import datetime

        mock_project = ProjectDetails(
            id="new_project_id",
            name="New Test Project",
            description="A new test project",
            status=ProjectStatus.ACTIVE,
            priority=ProjectPriority.HIGH,
            org_id="test_org_id",
            division_id="test_division_id",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        mock_project_service.create_project_for_division.return_value = mock_project

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        project_data = {
            "name": "New Test Project",
            "description": "A new test project",
            "status": "active",
            "priority": "high"
        }

        response = client.post(
            "/api/organizations/test_org_id/divisions/test_division_id/projects",
            json=project_data,
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "new_project_id"
        assert data["name"] == "New Test Project"
        assert data["status"] == "active"
        assert data["priority"] == "high"

        app.dependency_overrides.clear()

    def test_list_projects_success(self, client, mock_project_service):
        """Test successful project listing."""
        from app.modules.projects.schemas import ProjectSummary
        from datetime import datetime

        mock_projects = [
            ProjectSummary(
                id="project_1",
                name="Project 1",
                status=ProjectStatus.ACTIVE,
                org_id="test_org_id",
                division_id="test_division_id",
                updated_at=datetime.utcnow()
            ),
            ProjectSummary(
                id="project_2",
                name="Project 2",
                status=ProjectStatus.ACTIVE,
                org_id="test_org_id",
                division_id="test_division_id",
                updated_at=datetime.utcnow()
            )
        ]

        mock_project_service.list_projects_for_division.return_value = mock_projects

        app.dependency_overrides[get_project_service] = lambda: mock_project_service

        response = client.get(
            "/api/organizations/test_org_id/divisions/test_division_id/projects",
            headers={"Authorization": "Bearer test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2
        assert data["results"][0]["name"] == "Project 1"
        assert data["results"][1]["name"] == "Project 2"

        app.dependency_overrides.clear()


if __name__ == "__main__":
    pytest.main([__file__])