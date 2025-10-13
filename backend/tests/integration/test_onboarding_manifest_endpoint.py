"""Integration tests for the onboarding manifest endpoint."""

import pytest
from fastapi import status
from httpx import AsyncClient


@pytest.mark.integration
async def test_get_onboarding_manifest(test_client: AsyncClient):
    """The manifest endpoint should return the server-defined onboarding steps."""

    response = await test_client.get("/api/onboarding/manifest")

    assert response.status_code == status.HTTP_200_OK

    payload = response.json()
    assert payload["version"]
    assert payload.get("variant") == "default"
    assert isinstance(payload.get("steps"), list)
    assert payload["steps"], "Expected at least one onboarding step"

    step = payload["steps"][0]
    for field in ("id", "title", "description", "path", "required", "canSkip"):
        assert field in step
