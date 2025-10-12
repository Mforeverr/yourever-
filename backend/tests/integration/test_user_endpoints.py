"""
Integration tests for user endpoints.
"""

import pytest
from httpx import AsyncClient
from fastapi import status

from app.dependencies import CurrentPrincipal


@pytest.mark.integration
class TestUserEndpoints:
    """Integration tests for user API endpoints."""

    async def test_get_me_unauthorized(self, test_client: AsyncClient):
        """Test GET /api/users/me without authentication returns 401."""
        response = await test_client.get("/api/users/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Missing bearer token"

    async def test_get_me_authorized(self, test_client: AsyncClient, mock_principal: CurrentPrincipal):
        """Test GET /api/users/me with valid authentication."""
        # Set up authentication header
        headers = {"Authorization": f"Bearer {mock_principal.id}"}

        response = await test_client.get("/api/users/me", headers=headers)

        # Should either return user data or 404 if user not found in database
        # Both are valid responses depending on test data
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "user" in data
            assert data["user"]["id"] == mock_principal.id
            assert data["user"]["email"] == mock_principal.email

    async def test_get_onboarding_progress_unauthorized(self, test_client: AsyncClient):
        """Test GET /api/users/me/onboarding-progress without authentication returns 401."""
        response = await test_client.get("/api/users/me/onboarding-progress")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Missing bearer token"

    async def test_get_onboarding_progress_authorized(self, test_client: AsyncClient, mock_principal: CurrentPrincipal):
        """Test GET /api/users/me/onboarding-progress with valid authentication."""
        headers = {"Authorization": f"Bearer {mock_principal.id}"}

        response = await test_client.get("/api/users/me/onboarding-progress", headers=headers)

        # Should either return session data or 404 if no session exists
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert "session" in data
            assert data["session"]["userId"] == mock_principal.id

    async def test_patch_onboarding_progress_unauthorized(self, test_client: AsyncClient):
        """Test PATCH /api/users/me/onboarding-progress without authentication returns 401."""
        payload = {"status": {"completedSteps": ["profile"]}}

        response = await test_client.patch("/api/users/me/onboarding-progress", json=payload)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Missing bearer token"

    async def test_patch_onboarding_progress_authorized(self, test_client: AsyncClient, mock_principal: CurrentPrincipal):
        """Test PATCH /api/users/me/onboarding-progress with valid authentication."""
        headers = {"Authorization": f"Bearer {mock_principal.id}"}
        payload = {"status": {"completedSteps": ["profile"], "lastStep": "work-profile", "completed": False}}

        response = await test_client.patch("/api/users/me/onboarding-progress", headers=headers, json=payload)

        # Should either update successfully or create new session
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

        if response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
            data = response.json()
            assert "session" in data
            assert data["session"]["userId"] == mock_principal.id
            assert data["session"]["status"]["lastStep"] == "work-profile"

    async def test_patch_onboarding_progress_invalid_payload(self, test_client: AsyncClient, mock_principal: CurrentPrincipal):
        """Test PATCH /api/users/me/onboarding-progress with invalid payload."""
        headers = {"Authorization": f"Bearer {mock_principal.id}"}
        invalid_payload = {"invalid": "data"}

        response = await test_client.patch("/api/users/me/onboarding-progress", headers=headers, json=invalid_payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_health_check(self, test_client: AsyncClient):
        """Test that health endpoint is working."""
        response = await test_client.get("/api/health/live")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "ok"