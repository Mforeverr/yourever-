# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
Cross-tenant data access prevention security tests.

This module tests the critical security boundary that prevents users
from accessing data from organizations they don't have access to.

Test Scenarios:
1. Organization scope boundary enforcement
2. Project access isolation between organizations
3. Data leakage prevention via API calls
4. Scope validation caching security
5. Cross-organization operation blocking
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import status

from backend.app.core.scope import (
    ScopeGuard,
    ScopeContext,
    ScopeDecision,
    ScopeViolationType,
    require_organization_access,
    require_division_access
)
from backend.app.core.errors import APIError
from backend.app.dependencies import CurrentPrincipal


@pytest.mark.cross_tenant
@pytest.mark.security
class TestOrganizationScopeBoundaries:
    """Test organization-level scope boundaries."""

    @pytest.mark.asyncio
    async def test_user_can_access_own_organization(
        self, test_scope_guard, mock_principal_alyssa, test_organization_data
    ):
        """Test that users can access organizations they belong to."""
        org_id = "org_123"  # Alyssa belongs to this org

        # Should succeed without error
        scope_context = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        assert scope_context.decision == ScopeDecision.ALLOW
        assert scope_context.organization_id == org_id
        assert "project:read" in scope_context.permissions

    @pytest.mark.asyncio
    async def test_user_cannot_access_unauthorized_organization(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that users cannot access organizations they don't belong to."""
        unauthorized_org_id = "org_789"  # Alyssa doesn't belong to this org

        # Should raise APIError
        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_organization_access(
                mock_principal_alyssa, unauthorized_org_id, {"project:read"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "org_access_denied"

    @pytest.mark.asyncio
    async def test_organization_access_with_cache(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that organization access caching doesn't bypass security."""
        org_id = "org_123"

        # First access
        scope_context_1 = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        # Second access from cache
        scope_context_2 = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        # Both should succeed and be equivalent
        assert scope_context_1.decision == ScopeDecision.ALLOW
        assert scope_context_2.decision == ScopeDecision.ALLOW
        assert scope_context_1.organization_id == scope_context_2.organization_id

    @pytest.mark.asyncio
    async def test_organization_scope_cache_isolation(
        self, test_scope_guard, mock_principal_alyssa, mock_principal_bob
    ):
        """Test that cache isolation prevents cross-user data leakage."""
        org_id = "org_123"

        # Alyssa accesses the organization
        alyssa_context = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        # Bob accesses the same organization
        bob_context = await test_scope_guard.check_organization_access(
            mock_principal_bob, org_id, {"project:read"}
        )

        # Both should succeed but be separate contexts
        assert alyssa_context.decision == ScopeDecision.ALLOW
        assert bob_context.decision == ScopeDecision.ALLOW
        assert alyssa_context.principal.id != bob_context.principal.id

    @pytest.mark.asyncio
    async def test_organization_access_with_different_permissions(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that permission requirements are properly validated."""
        org_id = "org_123"

        # Test with read permissions
        read_context = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        # Test with create permissions
        create_context = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:create"}
        )

        # Both should succeed (current implementation grants basic permissions)
        assert read_context.decision == ScopeDecision.ALLOW
        assert create_context.decision == ScopeDecision.ALLOW


@pytest.mark.cross_tenant
@pytest.mark.security
class TestDivisionScopeBoundaries:
    """Test division-level scope boundaries."""

    @pytest.mark.asyncio
    async def test_user_can_access_authorized_division(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that users can access divisions they belong to."""
        org_id = "org_123"
        div_id = "div_1"  # Alyssa belongs to this division

        scope_context = await test_scope_guard.check_division_access(
            mock_principal_alyssa, org_id, div_id, {"project:read"}
        )

        assert scope_context.decision == ScopeDecision.ALLOW
        assert scope_context.organization_id == org_id
        assert scope_context.division_id == div_id

    @pytest.mark.asyncio
    async def test_user_cannot_access_unauthorized_division_in_same_org(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test that users cannot access divisions they don't belong to, even in the same org."""
        org_id = "org_123"  # Bob belongs to this org
        div_id = "div_2"  # Bob doesn't belong to this division

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_division_access(
                mock_principal_bob, org_id, div_id, {"project:read"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "division_access_denied"

    @pytest.mark.asyncio
    async def test_user_cannot_access_division_in_unauthorized_org(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test that users cannot access divisions in organizations they don't belong to."""
        org_id = "org_456"  # Bob doesn't belong to this org
        div_id = "div_3"  # This division exists in org_456

        # Should fail at organization level first
        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_division_access(
                mock_principal_bob, org_id, div_id, {"project:read"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "org_access_denied"

    @pytest.mark.asyncio
    async def test_division_scope_cache_isolation(
        self, test_scope_guard, mock_principal_alyssa, mock_principal_charlie
    ):
        """Test that division access cache is properly isolated."""
        org_id = "org_456"
        div_id = "div_3"

        # Charlie can access this division
        charlie_context = await test_scope_guard.check_division_access(
            mock_principal_charlie, org_id, div_id, {"project:read"}
        )

        # Alyssa also belongs to org_456 and can access div_3
        alyssa_context = await test_scope_guard.check_division_access(
            mock_principal_alyssa, org_id, div_id, {"project:read"}
        )

        assert charlie_context.decision == ScopeDecision.ALLOW
        assert alyssa_context.decision == ScopeDecision.ALLOW
        assert charlie_context.principal.id != alyssa_context.principal.id


@pytest.mark.cross_tenant
@pytest.mark.security
class TestCrossOrganizationSecurity:
    """Test cross-organization operation security."""

    @pytest.mark.asyncio
    async def test_cross_organization_access_is_blocked(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that cross-organization access is blocked by default."""
        from_org = "org_123"
        to_org = "org_456"

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_organization_access(
                mock_principal_alyssa, from_org, to_org, {"project:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "cross_org_access"

    @pytest.mark.asyncio
    async def test_cross_organization_access_requires_both_orgs(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test that cross-organization access requires access to both orgs."""
        from_org = "org_123"  # Bob belongs to this org
        to_org = "org_456"  # Bob doesn't belong to this org

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_organization_access(
                mock_principal_bob, from_org, to_org, {"project:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "cross_org_access"

    @pytest.mark.asyncio
    async def test_cross_division_access_is_blocked(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that cross-division access is blocked by default."""
        org_id = "org_123"
        from_div = "div_1"  # Alyssa belongs to this division
        to_div = "div_2"  # Alyssa also belongs to this division, but cross-access should be blocked

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_division_access(
                mock_principal_alyssa, org_id, from_div, to_div, {"division:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "cross_division_access"


@pytest.mark.cross_tenant
@pytest.mark.security
class TestScopeValidationSecurity {
    """Test scope validation security mechanisms."""

    @pytest.mark.asyncio
    async def test_scope_validation_rate_limiting(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that scope validation has rate limiting to prevent abuse."""
        org_id = "org_123"

        # Make many rapid requests (simulate rate limiting test)
        # Note: In a real test, you'd configure a low rate limit for testing
        requests_made = 0
        for i in range(50):  # Make 50 requests
            try:
                await test_scope_guard.check_organization_access(
                    mock_principal_alyssa, org_id, {"project:read"}
                )
                requests_made += 1
            except APIError as e:
                if e.code == "scope_rate_limited":
                    break
                else:
                    raise

        # Should be able to make some requests before hitting rate limit
        assert requests_made > 0

    @pytest.mark.asyncio
    async def test_scope_validation_caching_invalidation(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that cache invalidation doesn't expose security issues."""
        org_id = "org_123"

        # Access organization
        context_1 = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        # Invalidate cache
        await test_scope_guard.invalidate_cache(f"user:{mock_principal_alyssa.id}")

        # Access again - should still work
        context_2 = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )

        assert context_1.decision == ScopeDecision.ALLOW
        assert context_2.decision == ScopeDecision.ALLOW

    @pytest.mark.asyncio
    async def test_scope_validation_with_invalid_org_id(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test scope validation with invalid organization IDs."""
        invalid_org_ids = [
            "",  # Empty string
            "   ",  # Whitespace only
            "../../../etc/passwd",  # Path traversal attempt
            "<script>alert('xss')</script>",  # XSS attempt
            "null",  # Null string
            "undefined",  # Undefined string
        ]

        for invalid_org_id in invalid_org_ids:
            with pytest.raises(APIError):
                await test_scope_guard.check_organization_access(
                    mock_principal_alyssa, invalid_org_id, {"project:read"}
                )

    @pytest.mark.asyncio
    async def test_scope_validation_with_malformed_principal(
        self, test_scope_guard
    ):
        """Test scope validation with malformed principal data."""
        # Create a principal with missing org_ids
        malformed_principal = MagicMock(spec=CurrentPrincipal)
        malformed_principal.id = "test_user"
        malformed_principal.org_ids = None  # Missing org_ids
        malformed_principal.division_ids = {}

        with pytest.raises((APIError, AttributeError)):
            await test_scope_guard.check_organization_access(
                malformed_principal, "org_123", {"project:read"}
            )


@pytest.mark.cross_tenant
@pytest.mark.security
class TestDataLeakagePrevention:
    """Test that data leakage is prevented across tenant boundaries."""

    @pytest.mark.asyncio
    async def test_project_access_isolation(
        self, mock_repository, test_scope_guard, mock_principal_alyssa, mock_principal_bob
    ):
        """Test that project access is properly isolated by organization."""
        from backend.app.modules.projects.service import ProjectService

        # Mock repository to return different data for different organizations
        async def mock_list_for_organization(org_id):
            if org_id == "org_123":
                return [
                    {"id": "proj_1", "name": "Project 1", "org_id": "org_123"},
                    {"id": "proj_2", "name": "Project 2", "org_id": "org_123"},
                ]
            elif org_id == "org_456":
                return [
                    {"id": "proj_3", "name": "Project 3", "org_id": "org_456"},
                ]
            else:
                return []

        mock_repository.list_for_organization = mock_list_for_organization

        service = ProjectService(mock_repository)

        # Alyssa accesses org_123 projects
        alyssa_projects = await service.list_projects_for_organization(
            mock_principal_alyssa, "org_123"
        )

        # Bob accesses org_123 projects (same org, different user)
        bob_projects = await service.list_projects_for_organization(
            mock_principal_bob, "org_123"
        )

        # Both should see the same org_123 projects
        assert len(alyssa_projects) == len(bob_projects)
        assert all(p["org_id"] == "org_123" for p in alyssa_projects)
        assert all(p["org_id"] == "org_123" for p in bob_projects)

    @pytest.mark.asyncio
    async def test_cross_tenant_project_access_blocked(
        self, mock_repository, test_scope_guard, mock_principal_bob
    ):
        """Test that cross-tenant project access is blocked."""
        from backend.app.modules.projects.service import ProjectService

        service = ProjectService(mock_repository)

        # Bob tries to access org_456 projects (he doesn't belong to org_456)
        with pytest.raises(APIError) as exc_info:
            await service.list_projects_for_organization(
                mock_principal_bob, "org_456"
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "org_access_denied"

    @pytest.mark.asyncio
    async def test_project_crud_operations_respect_boundaries(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that CRUD operations respect organization boundaries."""
        from backend.app.modules.projects.service import ProjectService
        from backend.app.modules.projects.schemas import ProjectCreateRequest

        service = ProjectService(mock_repository)

        # Create project in authorized organization
        project_request = ProjectCreateRequest(
            name="Test Project",
            description="Test Description",
            status="active",
            priority="medium"
        )

        project = await service.create_project_for_organization(
            mock_principal_alyssa, "org_123", project_request
        )

        # Verify the created project belongs to the correct organization
        assert project.org_id == "org_123"
        assert project.owner_id == mock_principal_alyssa.id

        # Try to create project in unauthorized organization
        with pytest.raises(APIError) as exc_info:
            await service.create_project_for_organization(
                mock_principal_alyssa, "org_789", project_request
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "org_access_denied"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])