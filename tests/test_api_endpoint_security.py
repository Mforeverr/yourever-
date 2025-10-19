# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
API endpoint security validation tests.

This module tests the security of FastAPI endpoints to ensure they
properly enforce scope validation and prevent unauthorized access.

Test Scenarios:
1. Organization-scoped endpoint security
2. Division-scoped endpoint security
3. HTTP method-based permission validation
4. Path parameter validation
5. Request body validation security
6. Response data filtering
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient
from httpx import AsyncClient

from backend.app.core.scope import ScopeGuard, ScopeContext, ScopeDecision
from backend.app.core.errors import APIError
from backend.app.dependencies import CurrentPrincipal
from backend.app.modules.projects.router import router as projects_router


@pytest.mark.api_security
@pytest.mark.security
class TestOrganizationScopedEndpointSecurity:
    """Test organization-scoped endpoint security."""

    @pytest.fixture
    def app_with_projects_router(self, mock_scope_guard):
        """Create FastAPI app with projects router."""
        app = FastAPI()
        app.include_router(projects_router)

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        return app

    @pytest.fixture
    def test_client(self, app_with_projects_router):
        """Create test client for API testing."""
        return TestClient(app_with_projects_router)

    def test_organization_projects_list_with_valid_access(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test listing organization projects with valid access."""
        org_id = "org_123"

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if principal.id == mock_principal_alyssa.id and org_id_param == org_id:
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.list_projects_for_organization.return_value = [
                {"id": "proj_1", "name": "Project 1", "org_id": org_id}
            ]
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.get(f"/api/organizations/{org_id}/projects")

                assert response.status_code == 200
                data = response.json()
                assert "results" in data

    def test_organization_projects_list_with_invalid_access(
        self, test_client, mock_scope_guard, mock_principal_bob
    ):
        """Test listing organization projects with invalid access."""
        org_id = "org_456"  # Bob doesn't belong to this org

        # Mock failed scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if principal.id == mock_principal_bob.id and org_id_param == org_id:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_bob

            response = test_client.get(f"/api/organizations/{org_id}/projects")

            assert response.status_code == 403
            data = response.json()
            assert "org_access_denied" in str(data)

    def test_organization_project_creation_with_valid_access(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test creating a project with valid organization access."""
        org_id = "org_123"
        project_data = {
            "name": "Test Project",
            "description": "Test Description",
            "status": "active",
            "priority": "medium"
        }

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.create_project_for_organization.return_value = MagicMock(
                id="proj_new",
                name=project_data["name"],
                org_id=org_id
            )
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.post(
                    f"/api/organizations/{org_id}/projects",
                    json=project_data
                )

                assert response.status_code == 200
                data = response.json()
                assert data["name"] == project_data["name"]

    def test_organization_project_creation_with_invalid_permissions(
        self, test_client, mock_scope_guard, mock_principal_bob
    ):
        """Test creating a project with invalid permissions."""
        org_id = "org_123"  # Bob belongs to this org
        project_data = {
            "name": "Unauthorized Project",
            "description": "Should not be created",
            "status": "active",
            "priority": "medium"
        }

        # Mock failed scope validation for create permission
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if "project:create" in (required_permissions or set()):
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions",
                    code="insufficient_permissions"
                )
            else:
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_bob

            response = test_client.post(
                f"/api/organizations/{org_id}/projects",
                json=project_data
            )

            assert response.status_code == 403

    def test_organization_project_retrieval_with_wrong_org(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test retrieving a project from wrong organization."""
        org_id = "org_123"
        project_id = "proj_456"  # Project belongs to different org

        # Mock successful scope validation but project not found
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.get_project_for_organization.return_value = None  # Project not found
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.get(f"/api/organizations/{org_id}/projects/{project_id}")

                assert response.status_code == 404
                data = response.json()
                assert "Project not found" in str(data)


@pytest.mark.api_security
@pytest.mark.security
class TestDivisionScopedEndpointSecurity:
    """Test division-scoped endpoint security."""

    @pytest.fixture
    def app_with_projects_router(self, mock_scope_guard):
        """Create FastAPI app with projects router."""
        app = FastAPI()
        app.include_router(projects_router)

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        return app

    @pytest.fixture
    def test_client(self, app_with_projects_router):
        """Create test client for API testing."""
        return TestClient(app_with_projects_router)

    def test_division_projects_list_with_valid_access(
        self, test_client, mock_scope_guard, mock_principal_charlie
    ):
        """Test listing division projects with valid access."""
        org_id = "org_456"
        div_id = "div_3"

        # Mock successful division scope validation
        async def mock_check_div_access(principal, org_id_param, div_id_param, required_permissions=None):
            if (principal.id == mock_principal_charlie.id and
                org_id_param == org_id and
                div_id_param == div_id):
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=div_id_param,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Division access denied",
                    code="division_access_denied"
                )

        mock_scope_guard.check_division_access = mock_check_div_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.list_projects_for_division.return_value = [
                {"id": "proj_3", "name": "Division Project 1", "org_id": org_id, "division_id": div_id}
            ]
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_charlie

                response = test_client.get(f"/api/organizations/{org_id}/divisions/{div_id}/projects")

                assert response.status_code == 200
                data = response.json()
                assert "results" in data

    def test_division_projects_list_with_invalid_division_access(
        self, test_client, mock_scope_guard, mock_principal_bob
    ):
        """Test listing division projects with invalid division access."""
        org_id = "org_123"  # Bob belongs to this org
        div_id = "div_2"   # Bob doesn't belong to this division

        # Mock failed division scope validation
        async def mock_check_div_access(principal, org_id_param, div_id_param, required_permissions=None):
            if principal.id == mock_principal_bob.id and div_id_param == div_id:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Division access denied",
                    code="division_access_denied"
                )

        mock_scope_guard.check_division_access = mock_check_div_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_bob

            response = test_client.get(f"/api/organizations/{org_id}/divisions/{div_id}/projects")

            assert response.status_code == 403
            data = response.json()
            assert "division_access_denied" in str(data)

    def test_division_projects_list_with_invalid_org_access(
        self, test_client, mock_scope_guard, mock_principal_bob
    ):
        """Test listing division projects with invalid organization access."""
        org_id = "org_456"  # Bob doesn't belong to this org
        div_id = "div_3"   # This division exists in org_456

        # Mock failed organization scope validation (should fail before division check)
        async def mock_check_div_access(principal, org_id_param, div_id_param, required_permissions=None):
            if principal.id == mock_principal_bob.id and org_id_param == org_id:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_division_access = mock_check_div_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_bob

            response = test_client.get(f"/api/organizations/{org_id}/divisions/{div_id}/projects")

            assert response.status_code == 403
            data = response.json()
            assert "org_access_denied" in str(data)


@pytest.mark.api_security
@pytest.mark.security
class TestHTTPMethodSecurityValidation:
    """Test HTTP method-based security validation."""

    @pytest.fixture
    def app_with_projects_router(self, mock_scope_guard):
        """Create FastAPI app with projects router."""
        app = FastAPI()
        app.include_router(projects_router)

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        return app

    @pytest.fixture
    def test_client(self, app_with_projects_router):
        """Create test client for API testing."""
        return TestClient(app_with_projects_router)

    def test_get_method_requires_read_permissions(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test that GET methods require read permissions."""
        org_id = "org_123"

        # Mock scope validation that checks for read permissions
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if "project:read" in (required_permissions or set()):
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Read permission required",
                    code="insufficient_permissions"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.list_projects_for_organization.return_value = []
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.get(f"/api/organizations/{org_id}/projects")
                assert response.status_code == 200

    def test_post_method_requires_create_permissions(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test that POST methods require create permissions."""
        org_id = "org_123"
        project_data = {
            "name": "Test Project",
            "description": "Test",
            "status": "active",
            "priority": "medium"
        }

        # Mock scope validation that checks for create permissions
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if "project:create" in (required_permissions or set()):
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:create"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Create permission required",
                    code="insufficient_permissions"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.create_project_for_organization.return_value = MagicMock(
                id="new_proj",
                name=project_data["name"]
            )
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.post(f"/api/organizations/{org_id}/projects", json=project_data)
                assert response.status_code == 200

    def test_put_method_requires_update_permissions(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test that PUT methods require update permissions."""
        org_id = "org_123"
        project_id = "proj_123"
        project_data = {
            "name": "Updated Project",
            "description": "Updated description",
            "status": "active",
            "priority": "high"
        }

        # Mock scope validation that checks for update permissions
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if "project:update" in (required_permissions or set()):
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:update"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Update permission required",
                    code="insufficient_permissions"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.update_project_for_organization.return_value = MagicMock(
                id=project_id,
                name=project_data["name"]
            )
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_alyssa

                response = test_client.put(
                    f"/api/organizations/{org_id}/projects/{project_id}",
                    json=project_data
                )
                assert response.status_code == 200

    def test_delete_method_requires_delete_permissions(
        self, test_client, mock_scope_guard, mock_principal_charlie
    ):
        """Test that DELETE methods require delete permissions."""
        org_id = "org_456"
        project_id = "proj_456"

        # Mock scope validation that checks for delete permissions
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            if "project:delete" in (required_permissions or set()):
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id_param,
                    division_id=None,
                    permissions={"project:delete"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Delete permission required",
                    code="insufficient_permissions"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock the service layer
        with patch('backend.app.modules.projects.service.ProjectService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service.delete_project_for_organization.return_value = True
            mock_service_class.return_value = mock_service

            # Mock authentication dependency
            with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
                mock_auth.return_value = mock_principal_charlie

                response = test_client.delete(f"/api/organizations/{org_id}/projects/{project_id}")
                assert response.status_code == 200


@pytest.mark.api_security
@pytest.mark.security
class TestPathParameterSecurity:
    """Test path parameter security validation."""

    @pytest.fixture
    def app_with_projects_router(self, mock_scope_guard):
        """Create FastAPI app with projects router."""
        app = FastAPI()
        app.include_router(projects_router)

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        return app

    @pytest.fixture
    def test_client(self, app_with_projects_router):
        """Create test client for API testing."""
        return TestClient(app_with_projects_router)

    def test_malformed_organization_id_parameter(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of malformed organization ID parameters."""
        malformed_org_ids = [
            "../../../etc/passwd",
            "<script>alert('xss')</script>",
            "'; DROP TABLE projects; --",
            "null",
            "",
            "   ",
        ]

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            for malformed_org_id in malformed_org_ids:
                response = test_client.get(f"/api/organizations/{malformed_org_id}/projects")
                # Should return 400, 403, or 404 - but not 200 (success)
                assert response.status_code != 200

    def test_malformed_division_id_parameter(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of malformed division ID parameters."""
        org_id = "org_123"
        malformed_div_ids = [
            "../../../etc/passwd",
            "<script>alert('xss')</script>",
            "'; DROP TABLE projects; --",
            "null",
            "",
            "   ",
        ]

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            for malformed_div_id in malformed_div_ids:
                response = test_client.get(f"/api/organizations/{org_id}/divisions/{malformed_div_id}/projects")
                # Should return 400, 403, or 404 - but not 200 (success)
                assert response.status_code != 200

    def test_malformed_project_id_parameter(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of malformed project ID parameters."""
        org_id = "org_123"
        malformed_project_ids = [
            "../../../etc/passwd",
            "<script>alert('xss')</script>",
            "'; DROP TABLE projects; --",
            "null",
            "",
            "   ",
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            for malformed_project_id in malformed_project_ids:
                response = test_client.get(f"/api/organizations/{org_id}/projects/{malformed_project_id}")
                # Should return 400, 403, or 404 - but not 200 (success)
                assert response.status_code != 200


@pytest.mark.api_security
@pytest.mark.security
class TestRequestBodySecurity:
    """Test request body security validation."""

    @pytest.fixture
    def app_with_projects_router(self, mock_scope_guard):
        """Create FastAPI app with projects router."""
        app = FastAPI()
        app.include_router(projects_router)

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        return app

    @pytest.fixture
    def test_client(self, app_with_projects_router):
        """Create test client for API testing."""
        return TestClient(app_with_projects_router)

    def test_malicious_request_body_content(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of malicious request body content."""
        org_id = "org_123"
        malicious_payloads = [
            {
                "name": "<script>alert('xss')</script>",
                "description": "'; DROP TABLE projects; --",
                "status": "active",
                "priority": "medium"
            },
            {
                "name": "Normal name",
                "description": {"$ne": ""},
                "status": "active",
                "priority": "medium"
            },
            {
                "name": "Normal name",
                "description": "admin",
                "status": "active",
                "priority": {"$gt": 999999}
            }
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            for payload in malicious_payloads:
                response = test_client.post(
                    f"/api/organizations/{org_id}/projects",
                    json=payload
                )
                # Should reject malicious payloads or sanitize them
                # The exact behavior depends on the validation implementation
                # but it should not accept malicious content blindly
                assert response.status_code in [400, 422, 403]

    def test_oversized_request_body(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of oversized request bodies."""
        org_id = "org_123"
        oversized_payload = {
            "name": "A" * 10000,  # Very long name
            "description": "B" * 100000,  # Very long description
            "status": "active",
            "priority": "medium"
        }

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            response = test_client.post(
                f"/api/organizations/{org_id}/projects",
                json=oversized_payload
            )
            # Should reject oversized payloads
            assert response.status_code in [400, 413, 422]

    def test_missing_required_fields(
        self, test_client, mock_scope_guard, mock_principal_alyssa
    ):
        """Test handling of missing required fields."""
        org_id = "org_123"
        incomplete_payloads = [
            {},  # Empty payload
            {"description": "Missing name"},
            {"name": "", "description": "Empty name"},
            {"name": "Test", "status": "invalid_status"}  # Invalid status
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id_param, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id_param,
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Mock authentication dependency
        with patch('backend.app.modules.projects.router.require_current_principal') as mock_auth:
            mock_auth.return_value = mock_principal_alyssa

            for payload in incomplete_payloads:
                response = test_client.post(
                    f"/api/organizations/{org_id}/projects",
                    json=payload
                )
                # Should reject incomplete payloads
                assert response.status_code in [400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])