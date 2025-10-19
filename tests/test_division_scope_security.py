# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
Division-level scope enforcement security tests.

This module tests the division-level security boundaries that ensure
users can only access data within their authorized divisions.

Test Scenarios:
1. Division access validation within organizations
2. Cross-division access prevention
3. Division-based data isolation
4. Division scope hierarchy enforcement
5. Division permission validation
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import status

from backend.app.core.scope import (
    ScopeGuard,
    ScopeContext,
    ScopeDecision,
    ScopeViolationType,
    require_division_access
)
from backend.app.core.errors import APIError
from backend.app.dependencies import CurrentPrincipal


@pytest.mark.division_scope
@pytest.mark.security
class TestDivisionAccessValidation:
    """Test division-level access validation."""

    @pytest.mark.asyncio
    async def test_user_can_access_authorized_divisions(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that users can access divisions they belong to."""
        org_id = "org_123"
        authorized_divisions = ["div_1", "div_2"]  # Alyssa belongs to these

        for div_id in authorized_divisions:
            scope_context = await test_scope_guard.check_division_access(
                mock_principal_alyssa, org_id, div_id, {"project:read"}
            )

            assert scope_context.decision == ScopeDecision.ALLOW
            assert scope_context.organization_id == org_id
            assert scope_context.division_id == div_id
            assert "project:read" in scope_context.permissions

    @pytest.mark.asyncio
    async def test_user_cannot_access_unauthorized_divisions(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that users cannot access divisions they don't belong to."""
        org_id = "org_123"
        unauthorized_divisions = ["div_5", "div_6"]  # Alyssa doesn't belong to these

        for div_id in unauthorized_divisions:
            with pytest.raises(APIError) as exc_info:
                await test_scope_guard.check_division_access(
                    mock_principal_alyssa, org_id, div_id, {"project:read"}
                )

            assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
            assert exc_info.value.code == "division_access_denied"

    @pytest.mark.asyncio
    async def test_division_access_requires_organization_access(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test that division access requires organization access first."""
        org_id = "org_456"  # Bob doesn't belong to this org
        div_id = "div_3"    # This division exists in org_456

        # Should fail at organization level first
        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_division_access(
                mock_principal_bob, org_id, div_id, {"project:read"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "org_access_denied"

    @pytest.mark.asyncio
    async def test_division_access_with_different_permission_sets(
        self, test_scope_guard, mock_principal_charlie
    ):
        """Test division access with different permission requirements."""
        org_id = "org_456"
        div_id = "div_3"  # Charlie belongs to this division

        # Test with read permissions
        read_context = await test_scope_guard.check_division_access(
            mock_principal_charlie, org_id, div_id, {"project:read"}
        )

        # Test with delete permissions
        delete_context = await test_scope_guard.check_division_access(
            mock_principal_charlie, org_id, div_id, {"project:delete"}
        )

        # Both should succeed
        assert read_context.decision == ScopeDecision.ALLOW
        assert delete_context.decision == ScopeDecision.ALLOW
        assert read_context.division_id == delete_context.division_id


@pytest.mark.division_scope
@pytest.mark.security
class TestCrossDivisionSecurity:
    """Test cross-division access prevention."""

    @pytest.mark.asyncio
    async def test_cross_division_access_blocked_by_default(
        self, test_scope_guard, mock_principal_charlie
    ):
        """Test that cross-division access is blocked by default."""
        org_id = "org_456"
        from_div = "div_3"  # Charlie belongs to this division
        to_div = "div_4"    # Charlie also belongs to this division, but cross-access should be blocked

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_division_access(
                mock_principal_charlie, org_id, from_div, to_div, {"division:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "cross_division_access"

    @pytest.mark.asyncio
    async def test_cross_division_access_with_unauthorized_source(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test cross-division access from unauthorized source division."""
        org_id = "org_123"
        from_div = "div_2"  # Bob doesn't belong to this division
        to_div = "div_1"    # Bob belongs to this division

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_division_access(
                mock_principal_bob, org_id, from_div, to_div, {"division:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_cross_division_access_with_unauthorized_target(
        self, test_scope_guard, mock_principal_bob
    ):
        """Test cross-division access to unauthorized target division."""
        org_id = "org_123"
        from_div = "div_1"  # Bob belongs to this division
        to_div = "div_2"    # Bob doesn't belong to this division

        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_cross_division_access(
                mock_principal_bob, org_id, from_div, to_div, {"division:manage"}
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.division_scope
@pytest.mark.security
class TestDivisionDataIsolation:
    """Test division-based data isolation."""

    @pytest.mark.asyncio
    async def test_project_data_isolation_by_division(
        self, mock_repository, test_scope_guard, mock_principal_charlie
    ):
        """Test that project data is properly isolated by division."""
        from backend.app.modules.projects.service import ProjectService

        # Mock repository to return different data for different divisions
        async def mock_list_for_division(org_id, div_id):
            if org_id == "org_456" and div_id == "div_3":
                return [
                    {"id": "proj_1", "name": "Division 3 Project 1", "org_id": "org_456", "division_id": "div_3"},
                    {"id": "proj_2", "name": "Division 3 Project 2", "org_id": "org_456", "division_id": "div_3"},
                ]
            elif org_id == "org_456" and div_id == "div_4":
                return [
                    {"id": "proj_3", "name": "Division 4 Project 1", "org_id": "org_456", "division_id": "div_4"},
                ]
            else:
                return []

        mock_repository.list_for_division = mock_list_for_division

        service = ProjectService(mock_repository)

        # Charlie accesses div_3 projects
        div_3_projects = await service.list_projects_for_division(
            mock_principal_charlie, "org_456", "div_3"
        )

        # Charlie accesses div_4 projects
        div_4_projects = await service.list_projects_for_division(
            mock_principal_charlie, "org_456", "div_4"
        )

        # Verify data isolation
        assert len(div_3_projects) == 2
        assert len(div_4_projects) == 1
        assert all(p["division_id"] == "div_3" for p in div_3_projects)
        assert all(p["division_id"] == "div_4" for p in div_4_projects)

    @pytest.mark.asyncio
    async def test_division_project_crud_operations_boundaries(
        self, mock_repository, test_scope_guard, mock_principal_charlie
    ):
        """Test that CRUD operations respect division boundaries."""
        from backend.app.modules.projects.service import ProjectService
        from backend.app.modules.projects.schemas import ProjectCreateRequest

        service = ProjectService(mock_repository)

        project_request = ProjectCreateRequest(
            name="Test Division Project",
            description="Test Description",
            status="active",
            priority="medium"
        )

        # Create project in authorized division
        project = await service.create_project_for_division(
            mock_principal_charlie, "org_456", "div_3", project_request
        )

        # Verify the created project belongs to the correct division
        assert project.org_id == "org_456"
        assert project.division_id == "div_3"
        assert project.owner_id == mock_principal_charlie.id

        # Try to create project in unauthorized division
        with pytest.raises(APIError) as exc_info:
            await service.create_project_for_division(
                mock_principal_charlie, "org_456", "div_5", project_request
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "division_access_denied"

    @pytest.mark.asyncio
    async def test_cross_division_project_access_blocked(
        self, mock_repository, test_scope_guard, mock_principal_bob
    ):
        """Test that accessing projects from other divisions is blocked."""
        from backend.app.modules.projects.service import ProjectService

        # Mock a project that exists in div_2
        mock_project = {
            "id": "proj_123",
            "name": "Division 2 Project",
            "org_id": "org_123",
            "division_id": "div_2",
            "owner_id": "other_user"
        }
        mock_repository.get_by_id.return_value = mock_project

        service = ProjectService(mock_repository)

        # Bob tries to access a project from div_2 (he doesn't belong to div_2)
        with pytest.raises(APIError) as exc_info:
            await service.get_project_for_division(
                mock_principal_bob, "org_123", "div_2", "proj_123"
            )

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.code == "division_access_denied"

    @pytest.mark.asyncio
    async def test_division_scope_boundary_with_organization_change(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test division boundaries when organizations change."""
        from backend.app.modules.projects.service import ProjectService

        service = ProjectService(mock_repository)

        # Alyssa accesses a project in org_123, div_1 (she belongs to both)
        with patch.object(mock_repository, 'get_by_id') as mock_get:
            mock_get.return_value = MagicMock(
                org_id="org_123",
                division_id="div_1",
                id="proj_123"
            )

            project = await service.get_project_for_division(
                mock_principal_alyssa, "org_123", "div_1", "proj_123"
            )

            assert project is not None

        # Now Alyssa tries to access a project in org_456, div_3 (she belongs to both)
        with patch.object(mock_repository, 'get_by_id') as mock_get:
            mock_get.return_value = MagicMock(
                org_id="org_456",
                division_id="div_3",
                id="proj_456"
            )

            project = await service.get_project_for_division(
                mock_principal_alyssa, "org_456", "div_3", "proj_456"
            )

            assert project is not None


@pytest.mark.division_scope
@pytest.mark.security
class TestDivisionScopeHierarchy:
    """Test division scope hierarchy and inheritance."""

    @pytest.mark.asyncio
    async def test_organization_access_does_not_grant_division_access(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that organization access doesn't automatically grant division access."""
        org_id = "org_123"  # Alyssa belongs to this org
        div_id = "div_5"    # But not this division

        # First verify org access works
        org_context = await test_scope_guard.check_organization_access(
            mock_principal_alyssa, org_id, {"project:read"}
        )
        assert org_context.decision == ScopeDecision.ALLOW

        # Then verify division access fails
        with pytest.raises(APIError) as exc_info:
            await test_scope_guard.check_division_access(
                mock_principal_alyssa, org_id, div_id, {"project:read"}
            )
        assert exc_info.value.code == "division_access_denied"

    @pytest.mark.asyncio
    async def test_multiple_division_access_isolation(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that access to multiple divisions is properly isolated."""
        org_id = "org_123"
        divisions = ["div_1", "div_2"]  # Alyssa belongs to both

        scope_contexts = []
        for div_id in divisions:
            context = await test_scope_guard.check_division_access(
                mock_principal_alyssa, org_id, div_id, {"project:read"}
            )
            scope_contexts.append(context)

        # All should succeed
        assert len(scope_contexts) == 2
        for context in scope_contexts:
            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == org_id
            assert context.division_id in divisions

        # But each should be a separate context
        assert scope_contexts[0].division_id != scope_contexts[1].division_id

    @pytest.mark.asyncio
    async def test_division_access_with_complex_organization_structure(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test division access with complex organization structures."""
        # Test access across different organizations with different division memberships
        org_div_pairs = [
            ("org_123", "div_1"),  # Alyssa belongs to both
            ("org_123", "div_2"),  # Alyssa belongs to both
            ("org_456", "div_3"),  # Alyssa belongs to both
        ]

        for org_id, div_id in org_div_pairs:
            context = await test_scope_guard.check_division_access(
                mock_principal_alyssa, org_id, div_id, {"project:read"}
            )
            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == org_id
            assert context.division_id == div_id

        # Test unauthorized combinations
        unauthorized_pairs = [
            ("org_123", "div_5"),  # Wrong division
            ("org_456", "div_5"),  # Wrong division
            ("org_789", "div_1"),  # Wrong organization
        ]

        for org_id, div_id in unauthorized_pairs:
            with pytest.raises(APIError):
                await test_scope_guard.check_division_access(
                    mock_principal_alyssa, org_id, div_id, {"project:read"}
                )


@pytest.mark.division_scope
@pytest.mark.security
class TestDivisionPermissionValidation:
    """Test division-level permission validation."""

    @pytest.mark.asyncio
    async def test_division_permission_inheritance(
        self, test_scope_guard, mock_principal_charlie
    ):
        """Test how permissions work at division level."""
        org_id = "org_456"
        div_id = "div_3"

        # Test different permission sets
        permission_sets = [
            {"project:read"},
            {"project:read", "project:create"},
            {"project:delete"},
            {"division:manage"},
        ]

        for permissions in permission_sets:
            context = await test_scope_guard.check_division_access(
                mock_principal_charlie, org_id, div_id, permissions
            )
            assert context.decision == ScopeDecision.ALLOW
            assert context.division_id == div_id

    @pytest.mark.asyncio
    async def test_division_permission_isolation(
        self, test_scope_guard, mock_principal_bob, mock_principal_charlie
    ):
        """Test that division permissions are isolated between users."""
        org_id = "org_456"
        div_id = "div_3"

        # Charlie has project:delete permission
        charlie_context = await test_scope_guard.check_division_access(
            mock_principal_charlie, org_id, div_id, {"project:delete"}
        )

        # Bob doesn't belong to this organization/division at all
        with pytest.raises(APIError):
            await test_scope_guard.check_division_access(
                mock_principal_bob, org_id, div_id, {"project:delete"}
            )

        assert charlie_context.decision == ScopeDecision.ALLOW

    @pytest.mark.asyncio
    async def test_division_permission_cache_isolation(
        self, test_scope_guard, mock_principal_alyssa, mock_principal_charlie
    ):
        """Test that division permission caching is properly isolated."""
        org_id = "org_456"
        div_id = "div_3"

        # Both users access the same division with different permissions
        alyssa_context = await test_scope_guard.check_division_access(
            mock_principal_alyssa, org_id, div_id, {"project:read"}
        )

        charlie_context = await test_scope_guard.check_division_access(
            mock_principal_charlie, org_id, div_id, {"project:delete"}
        )

        # Both should succeed but be separate contexts
        assert alyssa_context.decision == ScopeDecision.ALLOW
        assert charlie_context.decision == ScopeDecision.ALLOW
        assert alyssa_context.principal.id != charlie_context.principal.id

        # Verify cache keys are different
        alyssa_cache_key = test_scope_guard._build_cache_key(
            mock_principal_alyssa, org_id, div_id, {"project:read"}
        )
        charlie_cache_key = test_scope_guard._build_cache_key(
            mock_principal_charlie, org_id, div_id, {"project:delete"}
        )

        assert alyssa_cache_key != charlie_cache_key


@pytest.mark.division_scope
@pytest.mark.security
class TestDivisionEdgeCases:
    """Test division edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_division_access_with_invalid_division_id(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test division access with invalid division IDs."""
        org_id = "org_123"
        invalid_division_ids = [
            "",  # Empty string
            "   ",  # Whitespace only
            "../../../etc/passwd",  # Path traversal attempt
            "<script>alert('xss')</script>",  # XSS attempt
            "null",  # Null string
        ]

        for invalid_div_id in invalid_division_ids:
            with pytest.raises(APIError):
                await test_scope_guard.check_division_access(
                    mock_principal_alyssa, org_id, invalid_div_id, {"project:read"}
                )

    @pytest.mark.asyncio
    async def test_division_access_with_malformed_principal(
        self, test_scope_guard
    ):
        """Test division access with malformed principal data."""
        # Create a principal with malformed division_ids
        malformed_principal = MagicMock(spec=CurrentPrincipal)
        malformed_principal.id = "test_user"
        malformed_principal.org_ids = {"org_123"}
        malformed_principal.division_ids = None  # Missing division_ids

        with pytest.raises((APIError, AttributeError)):
            await test_scope_guard.check_division_access(
                malformed_principal, "org_123", "div_1", {"project:read"}
            )

    @pytest.mark.asyncio
    async def test_division_access_with_none_values(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test division access with None values."""
        with pytest.raises((APIError, ValueError)):
            await test_scope_guard.check_division_access(
                mock_principal_alyssa, None, "div_1", {"project:read"}
            )

        with pytest.raises((APIError, ValueError)):
            await test_scope_guard.check_division_access(
                mock_principal_alyssa, "org_123", None, {"project:read"}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])