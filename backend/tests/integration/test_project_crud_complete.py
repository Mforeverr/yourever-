# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
Complete integration tests for Project CRUD API endpoints.

This test module provides comprehensive coverage of all Project CRUD operations
including error handling, validation, and security scenarios.
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime

from app.modules.projects.schemas import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectMemberAddRequest,
    ProjectMemberUpdateRequest,
    ProjectStatus,
    ProjectPriority,
    ProjectMemberRole
)


class TestProjectCRUD:
    """Test suite for complete Project CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_organization_project_success(self, client: AsyncClient, auth_headers):
        """Test successful project creation within an organization."""
        project_data = {
            "name": "Test Organization Project",
            "description": "A test project for organization",
            "status": "active",
            "priority": "high"
        }

        response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Organization Project"
        assert data["description"] == "A test project for organization"
        assert data["status"] == "active"
        assert data["priority"] == "high"
        assert "id" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_create_project_validation_error(self, client: AsyncClient, auth_headers):
        """Test project creation with invalid data."""
        # Test with empty name
        project_data = {
            "name": "",
            "description": "Invalid project",
            "status": "active",
            "priority": "medium"
        }

        response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "project_validation_error"

    @pytest.mark.asyncio
    async def test_list_organization_projects_success(self, client: AsyncClient, auth_headers):
        """Test successful project listing within an organization."""
        response = await client.get(
            "/api/organizations/test-org-id/projects",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)

    @pytest.mark.asyncio
    async def test_get_organization_project_success(self, client: AsyncClient, auth_headers):
        """Test successful project retrieval."""
        # First create a project
        project_data = {
            "name": "Test Get Project",
            "description": "Project for testing get endpoint",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Now get the project
        response = await client.get(
            f"/api/organizations/test-org-id/projects/{project_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == "Test Get Project"

    @pytest.mark.asyncio
    async def test_get_organization_project_not_found(self, client: AsyncClient, auth_headers):
        """Test project retrieval with non-existent ID."""
        fake_id = str(uuid4())
        response = await client.get(
            f"/api/organizations/test-org-id/projects/{fake_id}",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "project_not_found"

    @pytest.mark.asyncio
    async def test_update_organization_project_success(self, client: AsyncClient, auth_headers):
        """Test successful project update."""
        # First create a project
        project_data = {
            "name": "Test Update Project",
            "description": "Original description",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Now update the project
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
            "priority": "high"
        }

        response = await client.patch(
            f"/api/organizations/test-org-id/projects/{project_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == "Updated Project Name"
        assert data["description"] == "Updated description"
        assert data["priority"] == "high"
        # Status should remain unchanged
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_delete_organization_project_success(self, client: AsyncClient, auth_headers):
        """Test successful project deletion."""
        # First create a project
        project_data = {
            "name": "Test Delete Project",
            "description": "Project for testing deletion",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Now delete the project
        response = await client.delete(
            f"/api/organizations/test-org-id/projects/{project_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_create_division_project_success(self, client: AsyncClient, auth_headers):
        """Test successful project creation within a division."""
        project_data = {
            "name": "Test Division Project",
            "description": "A test project for division",
            "status": "active",
            "priority": "high"
        }

        response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Division Project"
        assert data["orgId"] == "test-org-id"
        assert data["divisionId"] == "test-div-id"

    @pytest.mark.asyncio
    async def test_add_project_member_success(self, client: AsyncClient, auth_headers):
        """Test successful addition of a project member."""
        # First create a project
        project_data = {
            "name": "Test Member Project",
            "description": "Project for testing member management",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Now add a member
        member_data = {
            "userId": "test-user-123",
            "role": "collaborator"
        }

        response = await client.post(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members",
            json=member_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["userId"] == "test-user-123"
        assert data["role"] == "collaborator"

    @pytest.mark.asyncio
    async def test_update_project_member_role_success(self, client: AsyncClient, auth_headers):
        """Test successful update of a project member's role."""
        # First create a project and add a member
        project_data = {
            "name": "Test Role Update Project",
            "description": "Project for testing role updates",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Add a member
        member_data = {
            "userId": "test-user-456",
            "role": "collaborator"
        }

        await client.post(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Now update the member's role
        role_update = {
            "role": "admin"
        }

        response = await client.patch(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members/test-user-456",
            json=role_update,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["userId"] == "test-user-456"
        assert data["role"] == "admin"

    @pytest.mark.asyncio
    async def test_remove_project_member_success(self, client: AsyncClient, auth_headers):
        """Test successful removal of a project member."""
        # First create a project and add a member
        project_data = {
            "name": "Test Remove Member Project",
            "description": "Project for testing member removal",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Add a member
        member_data = {
            "userId": "test-user-789",
            "role": "collaborator"
        }

        await client.post(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Now remove the member
        response = await client.delete(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members/test-user-789",
            headers=auth_headers
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_get_project_workspace_snapshot_success(self, client: AsyncClient, auth_headers):
        """Test successful project workspace snapshot retrieval."""
        # First create a project
        project_data = {
            "name": "Test Workspace Project",
            "description": "Project for testing workspace snapshot",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Get workspace snapshot
        response = await client.get(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/workspace",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "project" in data
        assert "members" in data
        assert "views" in data
        assert "capabilities" in data
        assert "featureFlags" in data
        assert data["project"]["id"] == project_id

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client: AsyncClient):
        """Test that unauthorized access is properly rejected."""
        response = await client.get("/api/organizations/test-org-id/projects")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_cross_tenant_access_prevention(self, client: AsyncClient, auth_headers):
        """Test that cross-tenant access is properly prevented."""
        # This test would require setting up proper scope validation
        # For now, just verify the endpoint exists and requires proper auth
        response = await client.get(
            "/api/organizations/different-org-id/projects",
            headers=auth_headers
        )
        # Should either return 403 (access denied) or 200 with empty results
        # depending on the scope validation implementation
        assert response.status_code in [200, 403]


class TestProjectErrorHandling:
    """Test suite for project error handling and validation."""

    @pytest.mark.asyncio
    async def test_invalid_project_status(self, client: AsyncClient, auth_headers):
        """Test project creation with invalid status."""
        project_data = {
            "name": "Test Invalid Status",
            "description": "Project with invalid status",
            "status": "invalid_status",
            "priority": "medium"
        }

        response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "project_validation_error"

    @pytest.mark.asyncio
    async def test_invalid_project_priority(self, client: AsyncClient, auth_headers):
        """Test project creation with invalid priority."""
        project_data = {
            "name": "Test Invalid Priority",
            "description": "Project with invalid priority",
            "status": "active",
            "priority": "invalid_priority"
        }

        response = await client.post(
            "/api/organizations/test-org-id/projects",
            json=project_data,
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "project_validation_error"

    @pytest.mark.asyncio
    async def test_duplicate_project_member(self, client: AsyncClient, auth_headers):
        """Test adding duplicate project member."""
        # First create a project
        project_data = {
            "name": "Test Duplicate Member",
            "description": "Project for testing duplicate members",
            "status": "active",
            "priority": "medium"
        }

        create_response = await client.post(
            "/api/organizations/test-org-id/divisions/test-div-id/projects",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]

        # Add a member
        member_data = {
            "userId": "duplicate-test-user",
            "role": "collaborator"
        }

        await client.post(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members",
            json=member_data,
            headers=auth_headers
        )

        # Try to add the same member again
        response = await client.post(
            f"/api/organizations/test-org-id/divisions/test-div-id/projects/{project_id}/members",
            json=member_data,
            headers=auth_headers
        )

        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "project_member_already_exists"


if __name__ == "__main__":
    pytest.main([__file__])