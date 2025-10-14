import pytest
from fastapi import status
from httpx import AsyncClient

from app.dependencies import CurrentPrincipal


@pytest.mark.integration
class TestOrganizationEndpoints:
    """Integration tests for organization API endpoints."""

    async def test_list_organizations_unauthorized(self, test_client: AsyncClient) -> None:
        response = await test_client.get("/api/organizations")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["detail"] == "Missing bearer token"

    async def test_list_organizations_authorized(
        self,
        test_client: AsyncClient,
        mock_principal: CurrentPrincipal,
    ) -> None:
        headers = {"Authorization": f"Bearer {mock_principal.id}"}

        response = await test_client.get("/api/organizations", headers=headers)

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]

        if response.status_code == status.HTTP_200_OK:
            data = response.json()
            assert isinstance(data, list)
            for organization in data:
                assert "id" in organization
                assert "name" in organization
                assert "divisions" in organization
