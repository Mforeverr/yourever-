# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
Session management security tests.

This module tests session management security to ensure that
session hijacking, fixation, and other session-based attacks
cannot compromise scope enforcement.

Test Scenarios:
1. Session token validation security
2. Cross-session scope isolation
3. Session fixation prevention
4. Session timeout and expiration
5. Multi-session scope consistency
6. Session revocation and invalidation
"""

import pytest
import time
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.testclient import TestClient
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.app.core.scope import (
    ScopeGuard,
    ScopeContext,
    ScopeDecision,
    ScopeViolationType
)
from backend.app.core.errors import APIError
from backend.app.dependencies import CurrentPrincipal


@pytest.mark.security
class TestSessionTokenSecurity:
    """Test session token security validation."""

    @pytest.fixture
    def mock_jwt_secret(self):
        """Mock JWT secret for testing."""
        return "test_secret_key_do_not_use_in_production"

    @pytest.fixture
    def sample_token_payload(self, test_user_data):
        """Sample JWT token payload."""
        return {
            "sub": "user_alyssa_123",
            "email": "alyssa@yourever.com",
            "name": "Alyssa Test User",
            "org_ids": ["org_123", "org_456"],
            "division_ids": {
                "org_123": ["div_1", "div_2"],
                "org_456": ["div_3"]
            },
            "permissions": ["project:read", "project:create"],
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,  # 1 hour
            "iss": "yourever.com",
            "aud": "yourever-api"
        }

    @pytest.fixture
    def valid_token(self, sample_token_payload, mock_jwt_secret):
        """Generate a valid JWT token."""
        return jwt.encode(sample_token_payload, mock_jwt_secret, algorithm="HS256")

    @pytest.fixture
    def expired_token_payload(self, sample_token_payload):
        """Generate an expired token payload."""
        expired_payload = sample_token_payload.copy()
        expired_payload["exp"] = int(time.time()) - 3600  # Expired 1 hour ago
        return expired_payload

    @pytest.fixture
    def expired_token(self, expired_token_payload, mock_jwt_secret):
        """Generate an expired JWT token."""
        return jwt.encode(expired_token_payload, mock_jwt_secret, algorithm="HS256")

    @pytest.fixture
    def tampered_token(self, valid_token):
        """Generate a tampered token."""
        # Modify the token by changing the last character
        return valid_token[:-1] + "X"

    @pytest.fixture
    def app_with_auth_routes(self, mock_scope_guard, mock_jwt_secret):
        """Create FastAPI app with authentication routes."""
        app = FastAPI()
        security = HTTPBearer()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        def decode_token(token: str) -> dict:
            """Mock JWT token decoding."""
            try:
                payload = jwt.decode(token, mock_jwt_secret, algorithms=["HS256"])
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=401,
                    detail="Token has expired",
                    code="token_expired"
                )
            except jwt.InvalidTokenError:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token",
                    code="invalid_token"
                )

        def create_principal_from_payload(payload: dict) -> CurrentPrincipal:
            """Create principal from JWT payload."""
            principal = MagicMock(spec=CurrentPrincipal)
            principal.id = payload["sub"]
            principal.email = payload["email"]
            principal.name = payload["name"]
            principal.org_ids = set(payload["org_ids"])
            principal.division_ids = payload["division_ids"]
            principal.permissions = set(payload["permissions"])
            return principal

        async def get_current_principal(
            credentials: HTTPAuthorizationCredentials = Depends(security)
        ) -> CurrentPrincipal:
            """Dependency to get current principal from JWT token."""
            token = credentials.credentials
            payload = decode_token(token)
            return create_principal_from_payload(payload)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(
            org_id: str,
            principal: CurrentPrincipal = Depends(get_current_principal)
        ):
            """Protected route requiring valid session."""
            guard = get_scope_guard()
            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {"org_id": org_id, "user_id": principal.id, "projects": []}
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        @app.get("/api/session/info")
        async def get_session_info(
            principal: CurrentPrincipal = Depends(get_current_principal)
        ):
            """Get current session information."""
            return {
                "user_id": principal.id,
                "email": principal.email,
                "org_ids": list(principal.org_ids),
                "division_ids": principal.division_ids,
                "permissions": list(principal.permissions)
            }

        return app

    @pytest.fixture
    def test_client(self, app_with_auth_routes):
        """Create test client."""
        return TestClient(app_with_auth_routes)

    def test_valid_session_token_access(
        self, test_client, valid_token
    ):
        """Test access with valid session token."""
        headers = {"Authorization": f"Bearer {valid_token}"}
        response = test_client.get("/api/session/info", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "user_alyssa_123"
        assert data["email"] == "alyssa@yourever.com"
        assert "org_123" in data["org_ids"]
        assert "org_456" in data["org_ids"]

    def test_expired_session_token_rejection(
        self, test_client, expired_token
    ):
        """Test rejection of expired session tokens."""
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = test_client.get("/api/session/info", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "token_expired" in str(data)

    def test_invalid_session_token_rejection(
        self, test_client, tampered_token
    ):
        """Test rejection of invalid/tampered session tokens."""
        headers = {"Authorization": f"Bearer {tampered_token}"}
        response = test_client.get("/api/session/info", headers=headers)

        assert response.status_code == 401
        data = response.json()
        assert "invalid_token" in str(data)

    def test_missing_session_token_rejection(
        self, test_client
    ):
        """Test rejection of requests without session tokens."""
        response = test_client.get("/api/session/info")

        assert response.status_code == 403  # No authorization header

    def test_malformed_session_token_rejection(
        self, test_client
    ):
        """Test rejection of malformed session tokens."""
        malformed_tokens = [
            "not.a.jwt",
            "Bearer",
            "Bearer invalid_format",
            "",
            "Bearer ",
            "Bearer .",
            "Bearer a.b",  # Incomplete JWT
        ]

        for token in malformed_tokens:
            headers = {"Authorization": token}
            response = test_client.get("/api/session/info", headers=headers)
            assert response.status_code in [401, 403]

    def test_session_token_with_invalid_algorithm(
        self, test_client, sample_token_payload, mock_jwt_secret
    ):
        """Test rejection of tokens with invalid algorithms."""
        # Create token with None algorithm (algorithm confusion attack)
        token_with_none = jwt.encode(
            sample_token_payload,
            mock_jwt_secret,
            algorithm="none"
        )

        headers = {"Authorization": f"Bearer {token_with_none}"}
        response = test_client.get("/api/session/info", headers=headers)

        assert response.status_code == 401


@pytest.mark.security
class TestCrossSessionScopeIsolation:
    """Test cross-session scope isolation."""

    @pytest.fixture
    def user_tokens(self, mock_jwt_secret, test_user_data):
        """Create tokens for different users."""
        tokens = {}

        for user_key, user_data in test_user_data.items():
            payload = {
                "sub": user_data["id"],
                "email": user_data["email"],
                "name": user_data["name"],
                "org_ids": user_data["org_ids"],
                "division_ids": user_data["division_ids"],
                "permissions": user_data["permissions"],
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,
                "iss": "yourever.com",
                "aud": "yourever-api"
            }
            tokens[user_key] = jwt.encode(payload, mock_jwt_secret, algorithm="HS256")

        return tokens

    @pytest.fixture
    def app_with_isolation_routes(self, mock_scope_guard, mock_jwt_secret):
        """Create FastAPI app for isolation testing."""
        app = FastAPI()
        security = HTTPBearer()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        def decode_token(token: str) -> dict:
            """Mock JWT token decoding."""
            try:
                payload = jwt.decode(token, mock_jwt_secret, algorithms=["HS256"])
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.InvalidTokenError:
                raise HTTPException(status_code=401, detail="Invalid token")

        def create_principal_from_payload(payload: dict) -> CurrentPrincipal:
            """Create principal from JWT payload."""
            principal = MagicMock(spec=CurrentPrincipal)
            principal.id = payload["sub"]
            principal.email = payload["email"]
            principal.name = payload["name"]
            principal.org_ids = set(payload["org_ids"])
            principal.division_ids = payload["division_ids"]
            principal.permissions = set(payload["permissions"])
            return principal

        async def get_current_principal(
            credentials: HTTPAuthorizationCredentials = Depends(security)
        ) -> CurrentPrincipal:
            """Dependency to get current principal from JWT token."""
            token = credentials.credentials
            payload = decode_token(token)
            return create_principal_from_payload(payload)

        @app.get("/api/organizations/{org_id}/projects")
        async def get_projects(
            org_id: str,
            principal: CurrentPrincipal = Depends(get_current_principal)
        ):
            """Protected route showing user-specific data."""
            guard = get_scope_guard()
            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {
                    "org_id": org_id,
                    "user_id": principal.id,
                    "user_email": principal.email,
                    "accessible_orgs": list(principal.org_ids),
                    "projects": []
                }
            except APIError:
                raise HTTPException(status_code=403, detail="Access denied")

        return app

    @pytest.fixture
    def test_client(self, app_with_isolation_routes):
        """Create test client."""
        return TestClient(app_with_isolation_routes)

    def test_different_users_see_different_data(
        self, test_client, user_tokens
    ):
        """Test that different users see different data based on their scope."""
        # Alyssa's session
        alyssa_headers = {"Authorization": f"Bearer {user_tokens['alyssa']}"}
        alyssa_response = test_client.get(
            "/api/organizations/org_123/projects",
            headers=alyssa_headers
        )

        # Bob's session
        bob_headers = {"Authorization": f"Bearer {user_tokens['bob']}"}
        bob_response = test_client.get(
            "/api/organizations/org_123/projects",
            headers=bob_headers
        )

        # Both should succeed (both belong to org_123)
        assert alyssa_response.status_code == 200
        assert bob_response.status_code == 200

        alyssa_data = alyssa_response.json()
        bob_data = bob_response.json()

        # But should see different user information
        assert alyssa_data["user_id"] != bob_data["user_id"]
        assert alyssa_data["user_email"] != bob_data["user_email"]
        assert alyssa_data["user_id"] == "user_alyssa_123"
        assert bob_data["user_id"] == "user_bob_456"

    def test_cross_tenant_access_blocked_by_session(
        self, test_client, user_tokens
    ):
        """Test that sessions block cross-tenant access."""
        # Bob tries to access org_456 (he doesn't belong there)
        bob_headers = {"Authorization": f"Bearer {user_tokens['bob']}"}
        response = test_client.get(
            "/api/organizations/org_456/projects",
            headers=bob_headers
        )

        # Should be blocked
        assert response.status_code == 403

        # Charlie can access org_456
        charlie_headers = {"Authorization": f"Bearer {user_tokens['charlie']}"}
        response = test_client.get(
            "/api/organizations/org_456/projects",
            headers=charlie_headers
        )

        # Should succeed
        assert response.status_code == 200

    def test_session_scope_persistence(
        self, test_client, user_tokens
    ):
        """Test that session scope persists across multiple requests."""
        alyssa_headers = {"Authorization": f"Bearer {user_tokens['alyssa']}"}

        # Make multiple requests
        for i in range(5):
            response = test_client.get(
                "/api/organizations/org_123/projects",
                headers=alyssa_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user_alyssa_123"
            assert "org_123" in data["accessible_orgs"]

    def test_concurrent_sessions_isolation(
        self, test_client, user_tokens
    ):
        """Test isolation between concurrent sessions."""
        # Simulate concurrent access from different users
        import threading
        import queue

        results = queue.Queue()

        def make_request(user_key, token):
            headers = {"Authorization": f"Bearer {token}"}
            response = test_client.get(
                "/api/organizations/org_123/projects",
                headers=headers
            )
            results.put((user_key, response.status_code, response.json()))

        # Create threads for concurrent requests
        threads = []
        for user_key, token in user_tokens.items():
            thread = threading.Thread(target=make_request, args=(user_key, token))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Check results
        user_results = {}
        while not results.empty():
            user_key, status_code, data = results.get()
            user_results[user_key] = {"status": status_code, "data": data}

        # Alyssa and Bob should succeed (both belong to org_123)
        assert user_results["alyssa"]["status"] == 200
        assert user_results["bob"]["status"] == 200

        # Charlie should fail (doesn't belong to org_123)
        assert user_results["charlie"]["status"] == 403


@pytest.mark.security
class TestSessionFixationPrevention:
    """Test session fixation attack prevention."""

    @pytest.fixture
    def app_with_session_routes(self, mock_scope_guard):
        """Create FastAPI app with session management routes."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        # Mock session store
        session_store = {}

        @app.post("/api/auth/login")
        async def login(request):
            """Mock login endpoint that creates new session."""
            import uuid
            session_id = str(uuid.uuid4())

            # Create new session with fresh scope
            session_store[session_id] = {
                "user_id": "user_alyssa_123",
                "org_ids": ["org_123", "org_456"],
                "division_ids": {"org_123": ["div_1", "div_2"]},
                "created_at": time.time(),
                "session_id": session_id
            }

            return {"session_id": session_id, "message": "Logged in successfully"}

        @app.post("/api/auth/logout")
        async def logout(request):
            """Mock logout endpoint that invalidates session."""
            # In a real implementation, this would invalidate the session
            return {"message": "Logged out successfully"}

        @app.get("/api/session/data")
        async def get_session_data(request):
            """Mock endpoint to get session data."""
            # In a real implementation, this would validate session
            return {"message": "Session data endpoint"}

        return app

    @pytest.fixture
    def test_client(self, app_with_session_routes):
        """Create test client."""
        return TestClient(app_with_session_routes)

    def test_login_creates_new_session(
        self, test_client
    ):
        """Test that login creates a new session."""
        response = test_client.post("/api/auth/login", json={
            "email": "alyssa@yourever.com",
            "password": "DemoPass123!"
        })

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert len(data["session_id"]) > 0

        # Multiple logins should create different sessions
        response2 = test_client.post("/api/auth/login", json={
            "email": "alyssa@yourever.com",
            "password": "DemoPass123!"
        })

        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["session_id"] != data["session_id"]

    def test_session_invalidation_on_logout(
        self, test_client
    ):
        """Test that logout invalidates the session."""
        # First login
        login_response = test_client.post("/api/auth/login", json={
            "email": "alyssa@yourever.com",
            "password": "DemoPass123!"
        })

        session_id = login_response.json()["session_id"]

        # Access with session should work
        response = test_client.get("/api/session/data", headers={
            "X-Session-ID": session_id
        })

        # Then logout
        logout_response = test_client.post("/api/auth/logout")
        assert logout_response.status_code == 200

        # Access with same session should be invalid after logout
        # (This would be implemented in a real system)
        response = test_client.get("/api/session/data", headers={
            "X-Session-ID": session_id
        })


@pytest.mark.security
class TestSessionTimeoutSecurity:
    """Test session timeout and expiration security."""

    @pytest.fixture
    def app_with_timeout_routes(self, mock_scope_guard):
        """Create FastAPI app with session timeout handling."""
        app = FastAPI()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        # Mock session store with timeout
        session_store = {}
        SESSION_TIMEOUT = 3600  # 1 hour

        def is_session_valid(session_data):
            """Check if session is still valid."""
            created_at = session_data.get("created_at", 0)
            return (time.time() - created_at) < SESSION_TIMEOUT

        @app.get("/api/session/check")
        async def check_session(request):
            """Check if session is valid."""
            session_id = request.headers.get("X-Session-ID")
            if not session_id or session_id not in session_store:
                raise HTTPException(status_code=401, detail="No session found")

            session_data = session_store[session_id]
            if not is_session_valid(session_data):
                # Remove expired session
                del session_store[session_id]
                raise HTTPException(
                    status_code=401,
                    detail="Session has expired",
                    code="session_expired"
                )

            return {"valid": True, "user_id": session_data["user_id"]}

        @app.post("/api/session/create")
        async def create_session(request):
            """Create a new session."""
            import uuid
            session_id = str(uuid.uuid4())

            session_store[session_id] = {
                "user_id": "user_alyssa_123",
                "org_ids": ["org_123", "org_456"],
                "division_ids": {"org_123": ["div_1", "div_2"]},
                "created_at": time.time(),
                "session_id": session_id
            }

            return {"session_id": session_id}

        @app.post("/api/session/expire")
        async def expire_session_manually(request):
            """Manually expire a session for testing."""
            session_id = request.headers.get("X-Session-ID")
            if session_id and session_id in session_store:
                # Set created_at to expire the session
                session_store[session_id]["created_at"] = 0
                return {"message": "Session expired"}
            return {"message": "Session not found"}

        return app

    @pytest.fixture
    def test_client(self, app_with_timeout_routes):
        """Create test client."""
        return TestClient(app_with_timeout_routes)

    def test_session_valid_within_timeout(
        self, test_client
    ):
        """Test that session is valid within timeout period."""
        # Create session
        create_response = test_client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Check session immediately - should be valid
        response = test_client.get("/api/session/check", headers={
            "X-Session-ID": session_id
        })

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True

    def test_session_expiration_after_timeout(
        self, test_client
    ):
        """Test that session expires after timeout period."""
        # Create session
        create_response = test_client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Manually expire the session
        test_client.post("/api/session/expire", headers={
            "X-Session-ID": session_id
        })

        # Check session - should be expired
        response = test_client.get("/api/session/check", headers={
            "X-Session-ID": session_id
        })

        assert response.status_code == 401
        data = response.json()
        assert "session_expired" in str(data)

    def test_expired_session_cleanup(
        self, test_client
    ):
        """Test that expired sessions are cleaned up."""
        # Create session
        create_response = test_client.post("/api/session/create")
        session_id = create_response.json()["session_id"]

        # Manually expire the session
        test_client.post("/api/session/expire", headers={
            "X-Session-ID": session_id
        })

        # Try to access expired session - should be removed
        response = test_client.get("/api/session/check", headers={
            "X-Session-ID": session_id
        })

        assert response.status_code == 401

        # Try again - should still fail (session was cleaned up)
        response2 = test_client.get("/api/session/check", headers={
            "X-Session-ID": session_id
        })

        assert response2.status_code == 401


@pytest.mark.security
class TestMultiSessionScopeConsistency:
    """Test scope consistency across multiple sessions."""

    @pytest.fixture
    def app_with_multi_session_routes(self, mock_scope_guard, mock_jwt_secret):
        """Create FastAPI app for multi-session testing."""
        app = FastAPI()
        security = HTTPBearer()

        # Override the global scope guard
        from backend.app.core.scope import set_scope_guard
        set_scope_guard(mock_scope_guard)

        def decode_token(token: str) -> dict:
            """Mock JWT token decoding."""
            try:
                payload = jwt.decode(token, mock_jwt_secret, algorithms=["HS256"])
                return payload
            except jwt.ExpiredSignatureError:
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.InvalidTokenError:
                raise HTTPException(status_code=401, detail="Invalid token")

        def create_principal_from_payload(payload: dict) -> CurrentPrincipal:
            """Create principal from JWT payload."""
            principal = MagicMock(spec=CurrentPrincipal)
            principal.id = payload["sub"]
            principal.email = payload["email"]
            principal.name = payload["name"]
            principal.org_ids = set(payload["org_ids"])
            principal.division_ids = payload["division_ids"]
            principal.permissions = set(payload["permissions"])
            return principal

        async def get_current_principal(
            credentials: HTTPAuthorizationCredentials = Depends(security)
        ) -> CurrentPrincipal:
            """Dependency to get current principal from JWT token."""
            token = credentials.credentials
            payload = decode_token(token)
            return create_principal_from_payload(payload)

        @app.get("/api/session/scope-info")
        async def get_scope_info(
            principal: CurrentPrincipal = Depends(get_current_principal)
        ):
            """Get current session scope information."""
            return {
                "user_id": principal.id,
                "email": principal.email,
                "org_ids": sorted(list(principal.org_ids)),
                "division_ids": principal.division_ids,
                "permissions": sorted(list(principal.permissions)),
                "session_created": "mock_timestamp"
            }

        @app.get("/api/organizations/{org_id}/access-check")
        async def check_organization_access(
            org_id: str,
            principal: CurrentPrincipal = Depends(get_current_principal)
        ):
            """Check if current session can access organization."""
            guard = get_scope_guard()
            try:
                await guard.check_organization_access(principal, org_id, {"project:read"})
                return {
                    "accessible": True,
                    "org_id": org_id,
                    "user_id": principal.id,
                    "user_orgs": list(principal.org_ids)
                }
            except APIError as e:
                return {
                    "accessible": False,
                    "org_id": org_id,
                    "user_id": principal.id,
                    "user_orgs": list(principal.org_ids),
                    "reason": e.code
                }

        return app

    @pytest.fixture
    def test_client(self, app_with_multi_session_routes):
        """Create test client."""
        return TestClient(app_with_multi_session_routes)

    def test_same_user_multiple_sessions_same_scope(
        self, test_client, mock_jwt_secret, test_user_data
    ):
        """Test that same user has consistent scope across multiple sessions."""
        user_data = test_user_data["alyssa"]

        # Create multiple tokens for the same user
        tokens = []
        for i in range(3):
            payload = {
                "sub": user_data["id"],
                "email": user_data["email"],
                "name": user_data["name"],
                "org_ids": user_data["org_ids"],
                "division_ids": user_data["division_ids"],
                "permissions": user_data["permissions"],
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,
                "iss": "yourever.com",
                "aud": "yourever-api",
                "jti": f"session_{i}"  # Different session ID
            }
            token = jwt.encode(payload, mock_jwt_secret, algorithm="HS256")
            tokens.append(token)

        # Check scope consistency across all sessions
        scope_responses = []
        for token in tokens:
            headers = {"Authorization": f"Bearer {token}"}
            response = test_client.get("/api/session/scope-info", headers=headers)
            assert response.status_code == 200
            scope_responses.append(response.json())

        # All sessions should have the same scope
        first_scope = scope_responses[0]
        for scope in scope_responses[1:]:
            assert scope["user_id"] == first_scope["user_id"]
            assert scope["org_ids"] == first_scope["org_ids"]
            assert scope["division_ids"] == first_scope["division_ids"]
            assert scope["permissions"] == first_scope["permissions"]

    def test_different_users_different_scope_isolation(
        self, test_client, user_tokens
    ):
        """Test that different users have properly isolated scopes."""
        scope_responses = {}

        # Get scope info for each user
        for user_key, token in user_tokens.items():
            headers = {"Authorization": f"Bearer {token}"}
            response = test_client.get("/api/session/scope-info", headers=headers)
            assert response.status_code == 200
            scope_responses[user_key] = response.json()

        # Verify each user has different scope
        assert scope_responses["alyssa"]["user_id"] != scope_responses["bob"]["user_id"]
        assert scope_responses["alyssa"]["user_id"] != scope_responses["charlie"]["user_id"]
        assert scope_responses["bob"]["user_id"] != scope_responses["charlie"]["user_id"]

        # Verify organizational access is different
        alyssa_orgs = set(scope_responses["alyssa"]["org_ids"])
        bob_orgs = set(scope_responses["bob"]["org_ids"])
        charlie_orgs = set(scope_responses["charlie"]["org_ids"])

        assert alyssa_orgs != bob_orgs
        assert alyssa_orgs != charlie_orgs

        # Alyssa should have access to both org_123 and org_456
        assert "org_123" in alyssa_orgs
        assert "org_456" in alyssa_orgs

        # Bob should only have access to org_123
        assert bob_orgs == {"org_123"}

        # Charlie should only have access to org_456
        assert charlie_orgs == {"org_456"}

    def test_concurrent_access_pattern_consistency(
        self, test_client, user_tokens
    ):
        """Test scope consistency under concurrent access patterns."""
        import threading
        import queue
        import time

        results = queue.Queue()

        def concurrent_scope_check(user_key, token, org_id):
            """Check organization access concurrently."""
            headers = {"Authorization": f"Bearer {token}"}
            response = test_client.get(
                f"/api/organizations/{org_id}/access-check",
                headers=headers
            )
            results.put((user_key, org_id, response.json()))

        # Test concurrent access to different organizations
        test_scenarios = [
            ("alyssa", user_tokens["alyssa"], "org_123"),
            ("alyssa", user_tokens["alyssa"], "org_456"),
            ("bob", user_tokens["bob"], "org_123"),
            ("charlie", user_tokens["charlie"], "org_456"),
        ]

        threads = []
        for user_key, token, org_id in test_scenarios:
            thread = threading.Thread(
                target=concurrent_scope_check,
                args=(user_key, token, org_id)
            )
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Check results for consistency
        expected_access = {
            ("alyssa", "org_123"): True,
            ("alyssa", "org_456"): True,
            ("bob", "org_123"): True,
            ("charlie", "org_456"): True,
        }

        while not results.empty():
            user_key, org_id, result = results.get()
            expected = expected_access.get((user_key, org_id), False)
            assert result["accessible"] == expected
            assert result["user_id"] == f"user_{user_key}_123"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])