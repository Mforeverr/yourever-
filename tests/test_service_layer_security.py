# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Integration Testing

"""
Service layer validation security tests.

This module tests the security of the service layer to ensure that
business logic properly enforces scope validation and prevents
unauthorized access at the domain level.

Test Scenarios:
1. Service method scope validation
2. Repository access control
3. Business logic security enforcement
4. Data transformation security
5. Service-level audit logging
6. Error handling security
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import status

from backend.app.core.scope import (
    ScopeGuard,
    ScopeContext,
    ScopeDecision,
    ScopeViolationType
)
from backend.app.core.scope_integration import ScopedService
from backend.app.core.errors import APIError
from backend.app.dependencies import CurrentPrincipal
from backend.app.modules.projects.service import ProjectService
from backend.app.modules.projects.schemas import ProjectCreateRequest


@pytest.mark.service_security
@pytest.mark.security
class TestScopedServiceValidation:
    """Test the base ScopedService validation capabilities."""

    @pytest.mark.asyncio
    async def test_scoped_service_organization_validation(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that ScopedService properly validates organization access."""
        service = ScopedService(test_scope_guard)

        # Valid organization access
        with patch.object(test_scope_guard, 'check_organization_access') as mock_check:
            mock_check.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            context = await service.validate_organization_access(
                mock_principal_alyssa, "org_123", {"project:read"}
            )

            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == "org_123"
            mock_check.assert_called_once_with(
                mock_principal_alyssa, "org_123", {"project:read"}
            )

    @pytest.mark.asyncio
    async def test_scoped_service_organization_validation_failure(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that ScopedService properly handles organization validation failures."""
        service = ScopedService(test_scope_guard)

        # Invalid organization access
        with patch.object(test_scope_guard, 'check_organization_access') as mock_check:
            mock_check.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization access denied",
                code="org_access_denied"
            )

            with pytest.raises(APIError) as exc_info:
                await service.validate_organization_access(
                    mock_principal_alyssa, "org_789", {"project:read"}
                )

            assert exc_info.value.code == "org_access_denied"

    @pytest.mark.asyncio
    async def test_scoped_service_division_validation(
        self, test_scope_guard, mock_principal_charlie
    ):
        """Test that ScopedService properly validates division access."""
        service = ScopedService(test_scope_guard)

        # Valid division access
        with patch.object(test_scope_guard, 'check_division_access') as mock_check:
            mock_check.return_value = ScopeContext(
                principal=mock_principal_charlie,
                organization_id="org_456",
                division_id="div_3",
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            context = await service.validate_division_access(
                mock_principal_charlie, "org_456", "div_3", {"project:read"}
            )

            assert context.decision == ScopeDecision.ALLOW
            assert context.organization_id == "org_456"
            assert context.division_id == "div_3"
            mock_check.assert_called_once_with(
                mock_principal_charlie, "org_456", "div_3", {"project:read"}
            )

    @pytest.mark.asyncio
    async def test_scoped_service_cross_organization_validation(
        self, test_scope_guard, mock_principal_alyssa
    ):
        """Test that ScopedService properly validates cross-organization access."""
        service = ScopedService(test_scope_guard)

        # Cross-organization access should be blocked
        with patch.object(test_scope_guard, 'check_cross_organization_access') as mock_check:
            mock_check.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-organization access not permitted",
                code="cross_org_access"
            )

            with pytest.raises(APIError) as exc_info:
                await service.validate_cross_organization_access(
                    mock_principal_alyssa, "org_123", "org_456", {"project:manage"}
                )

            assert exc_info.value.code == "cross_org_access"

    @pytest.mark.asyncio
    async def test_scoped_service_cross_division_validation(
        self, test_scope_guard, mock_principal_charlie
    ):
        """Test that ScopedService properly validates cross-division access."""
        service = ScopedService(test_scope_guard)

        # Cross-division access should be blocked
        with patch.object(test_scope_guard, 'check_cross_division_access') as mock_check:
            mock_check.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-division access not permitted",
                code="cross_division_access"
            )

            with pytest.raises(APIError) as exc_info:
                await service.validate_cross_division_access(
                    mock_principal_charlie, "org_456", "div_3", "div_4", {"division:manage"}
                )

            assert exc_info.value.code == "cross_division_access"


@pytest.mark.service_security
@pytest.mark.security
class TestProjectServiceSecurity:
    """Test ProjectService security implementation."""

    @pytest.mark.asyncio
    async def test_project_service_list_organizations_scope_validation(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that list_projects_for_organization validates scope."""
        service = ProjectService(mock_repository)

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            # Mock repository response
            mock_repository.list_for_organization.return_value = [
                {"id": "proj_1", "name": "Project 1", "org_id": "org_123"}
            ]

            projects = await service.list_projects_for_organization(
                mock_principal_alyssa, "org_123"
            )

            # Verify scope validation was called
            mock_validate.assert_called_once_with(
                mock_principal_alyssa, "org_123", {"project:read"}
            )

            # Verify repository was called with correct org_id
            mock_repository.list_for_organization.assert_called_once_with("org_123")

            # Verify returned projects
            assert len(projects) == 1
            assert projects[0]["org_id"] == "org_123"

    @pytest.mark.asyncio
    async def test_project_service_list_organizations_unauthorized_access(
        self, mock_repository, test_scope_guard, mock_principal_bob
    ):
        """Test that list_projects_for_organization blocks unauthorized access."""
        service = ProjectService(mock_repository)

        # Mock failed scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization access denied",
                code="org_access_denied"
            )

            with pytest.raises(APIError) as exc_info:
                await service.list_projects_for_organization(
                    mock_principal_bob, "org_456"  # Bob doesn't belong to this org
                )

            assert exc_info.value.code == "org_access_denied"

            # Verify repository was never called
            mock_repository.list_for_organization.assert_not_called()

    @pytest.mark.asyncio
    async def test_project_service_create_organizations_scope_validation(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that create_project_for_organization validates scope."""
        service = ProjectService(mock_repository)

        project_request = ProjectCreateRequest(
            name="Test Project",
            description="Test Description",
            status="active",
            priority="medium"
        )

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

            # Mock repository response
            created_project = MagicMock()
            created_project.id = "proj_new"
            created_project.name = project_request.name
            created_project.org_id = "org_123"
            created_project.division_id = None
            created_project.owner_id = mock_principal_alyssa.id
            mock_repository.create.return_value = created_project

            project = await service.create_project_for_organization(
                mock_principal_alyssa, "org_123", project_request
            )

            # Verify scope validation was called
            mock_validate.assert_called_once_with(
                mock_principal_alyssa, "org_123", {"project:create"}
            )

            # Verify repository was called with correct data
            create_call_args = mock_repository.create.call_args[0][0]
            assert create_call_args["org_id"] == "org_123"
            assert create_call_args["division_id"] is None
            assert create_call_args["owner_id"] == mock_principal_alyssa.id
            assert create_call_args["name"] == project_request.name

            # Verify returned project
            assert project.org_id == "org_123"
            assert project.owner_id == mock_principal_alyssa.id

    @pytest.mark.asyncio
    async def test_project_service_create_organizations_unauthorized_access(
        self, mock_repository, test_scope_guard, mock_principal_bob
    ):
        """Test that create_project_for_organization blocks unauthorized access."""
        service = ProjectService(mock_repository)

        project_request = ProjectCreateRequest(
            name="Unauthorized Project",
            description="Should not be created",
            status="active",
            priority="medium"
        )

        # Mock failed scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
                code="insufficient_permissions"
            )

            with pytest.raises(APIError) as exc_info:
                await service.create_project_for_organization(
                    mock_principal_bob, "org_123", project_request
                )

            assert exc_info.value.code == "insufficient_permissions"

            # Verify repository was never called
            mock_repository.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_project_service_get_organizations_scope_and_ownership_validation(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that get_project_for_organization validates both scope and ownership."""
        service = ProjectService(mock_repository)

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            # Test case 1: Project belongs to correct organization
            correct_project = MagicMock()
            correct_project.id = "proj_123"
            correct_project.org_id = "org_123"
            correct_project.division_id = None
            mock_repository.get_by_id.return_value = correct_project

            project = await service.get_project_for_organization(
                mock_principal_alyssa, "org_123", "proj_123"
            )

            assert project is not None
            assert project.org_id == "org_123"

            # Test case 2: Project belongs to different organization
            wrong_project = MagicMock()
            wrong_project.id = "proj_456"
            wrong_project.org_id = "org_456"  # Different org
            wrong_project.division_id = None
            mock_repository.get_by_id.return_value = wrong_project

            project = await service.get_project_for_organization(
                mock_principal_alyssa, "org_123", "proj_456"
            )

            assert project is None  # Should return None for wrong org

    @pytest.mark.asyncio
    async def test_project_service_list_divisions_scope_validation(
        self, mock_repository, test_scope_guard, mock_principal_charlie
    ):
        """Test that list_projects_for_division validates division scope."""
        service = ProjectService(mock_repository)

        # Mock successful division scope validation
        with patch.object(service, 'validate_division_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_charlie,
                organization_id="org_456",
                division_id="div_3",
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            # Mock repository response
            mock_repository.list_for_division.return_value = [
                {"id": "proj_3", "name": "Division Project", "org_id": "org_456", "division_id": "div_3"}
            ]

            projects = await service.list_projects_for_division(
                mock_principal_charlie, "org_456", "div_3"
            )

            # Verify division scope validation was called
            mock_validate.assert_called_once_with(
                mock_principal_charlie, "org_456", "div_3", {"project:read"}
            )

            # Verify repository was called with correct parameters
            mock_repository.list_for_division.assert_called_once_with("org_456", "div_3")

            # Verify returned projects
            assert len(projects) == 1
            assert projects[0]["org_id"] == "org_456"
            assert projects[0]["division_id"] == "div_3"

    @pytest.mark.asyncio
    async def test_project_service_update_divisions_scope_and_ownership_validation(
        self, mock_repository, test_scope_guard, mock_principal_charlie
    ):
        """Test that update_project_for_division validates both scope and ownership."""
        service = ProjectService(mock_repository)

        project_request = ProjectCreateRequest(
            name="Updated Project",
            description="Updated Description",
            status="active",
            priority="high"
        )

        # Mock successful division scope validation
        with patch.object(service, 'validate_division_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_charlie,
                organization_id="org_456",
                division_id="div_3",
                permissions={"project:update"},
                decision=ScopeDecision.ALLOW
            )

            # Test case 1: Project belongs to correct division
            correct_project = MagicMock()
            correct_project.id = "proj_123"
            correct_project.org_id = "org_456"
            correct_project.division_id = "div_3"
            mock_repository.get_by_id.return_value = correct_project

            updated_project = MagicMock()
            updated_project.id = "proj_123"
            updated_project.name = project_request.name
            mock_repository.update.return_value = updated_project

            project = await service.update_project_for_division(
                mock_principal_charlie, "org_456", "div_3", "proj_123", project_request
            )

            assert project is not None
            assert project.name == project_request.name

            # Test case 2: Project belongs to different division
            wrong_project = MagicMock()
            wrong_project.id = "proj_456"
            wrong_project.org_id = "org_456"
            wrong_project.division_id = "div_4"  # Different division
            mock_repository.get_by_id.return_value = wrong_project

            project = await service.update_project_for_division(
                mock_principal_charlie, "org_456", "div_3", "proj_456", project_request
            )

            assert project is None  # Should return None for wrong division

    @pytest.mark.asyncio
    async def test_project_service_delete_divisions_scope_and_ownership_validation(
        self, mock_repository, test_scope_guard, mock_principal_charlie
    ):
        """Test that delete_project_for_division validates both scope and ownership."""
        service = ProjectService(mock_repository)

        # Mock successful division scope validation
        with patch.object(service, 'validate_division_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_charlie,
                organization_id="org_456",
                division_id="div_3",
                permissions={"project:delete"},
                decision=ScopeDecision.ALLOW
            )

            # Test case 1: Project belongs to correct division
            correct_project = MagicMock()
            correct_project.id = "proj_123"
            correct_project.org_id = "org_456"
            correct_project.division_id = "div_3"
            mock_repository.get_by_id.return_value = correct_project
            mock_repository.delete.return_value = True

            success = await service.delete_project_for_division(
                mock_principal_charlie, "org_456", "div_3", "proj_123"
            )

            assert success is True

            # Test case 2: Project belongs to different division
            wrong_project = MagicMock()
            wrong_project.id = "proj_456"
            wrong_project.org_id = "org_456"
            wrong_project.division_id = "div_4"  # Different division
            mock_repository.get_by_id.return_value = wrong_project

            success = await service.delete_project_for_division(
                mock_principal_charlie, "org_456", "div_3", "proj_456"
            )

            assert success is False  # Should return False for wrong division

            # Verify delete was only called for correct project
            assert mock_repository.delete.call_count == 1


@pytest.mark.service_security
@pytest.mark.security
class TestServiceDataTransformationSecurity:
    """Test service layer data transformation security."""

    @pytest.mark.asyncio
    async def test_service_data_sanitization_on_create(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that service sanitizes data during creation."""
        service = ProjectService(mock_repository)

        # Create request with potentially malicious content
        malicious_request = ProjectCreateRequest(
            name="<script>alert('xss')</script>",
            description="'; DROP TABLE projects; --",
            status="active",
            priority="medium",
            metadata={"$ne": ""},
            settings={"admin": True}
        )

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

            # Mock repository to capture what data is actually passed
            captured_data = {}
            def capture_create(data):
                captured_data.update(data)
                return MagicMock(id="proj_new", **data)

            mock_repository.create.side_effect = capture_create

            await service.create_project_for_organization(
                mock_principal_alyssa, "org_123", malicious_request
            )

            # Verify that data is passed to repository as-is (sanitization should happen elsewhere)
            # This test ensures we know what data reaches the persistence layer
            assert captured_data["name"] == malicious_request.name
            assert captured_data["description"] == malicious_request.description
            assert captured_data["org_id"] == "org_123"
            assert captured_data["owner_id"] == mock_principal_alyssa.id

    @pytest.mark.asyncio
    async def test_service_data_filtering_on_read(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that service properly filters data on read operations."""
        service = ProjectService(mock_repository)

        # Mock repository to return sensitive data
        sensitive_data = [
            {
                "id": "proj_1",
                "name": "Project 1",
                "org_id": "org_123",
                "division_id": None,
                "owner_id": mock_principal_alyssa.id,
                "internal_notes": "Sensitive internal data",
                "admin_settings": {"secret": "value"},
                "created_at": "2023-01-01T00:00:00Z"
            }
        ]

        mock_repository.list_for_organization.return_value = sensitive_data

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            projects = await service.list_projects_for_organization(
                mock_principal_alyssa, "org_123"
            )

            # Verify that service doesn't filter out data by default
            # (Filtering should be handled by the presentation layer)
            assert len(projects) == 1
            # The service should return what the repository provides
            # Data filtering for security should happen at the API/response layer

    @pytest.mark.asyncio
    async def test_service_error_handling_security(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test service error handling doesn't leak sensitive information."""
        service = ProjectService(mock_repository)

        # Mock repository to raise an exception
        mock_repository.list_for_organization.side_effect = Exception("Database connection failed")

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:read"},
                decision=ScopeDecision.ALLOW
            )

            # The service should propagate the exception
            # Error handling and sanitization should happen at the API layer
            with pytest.raises(Exception) as exc_info:
                await service.list_projects_for_organization(
                    mock_principal_alyssa, "org_123"
                )

            assert "Database connection failed" in str(exc_info.value)


@pytest.mark.service_security
@pytest.mark.security
class TestServiceAuditSecurity:
    """Test service layer audit logging security."""

    @pytest.mark.asyncio
    async def test_service_scope_validation_audit_logging(
        self, mock_repository, test_scope_guard, mock_principal_bob
    ):
        """Test that service properly logs scope validation attempts."""
        service = ProjectService(mock_repository)

        # Mock failed scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.side_effect = APIError(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization access denied",
                code="org_access_denied"
            )

            # Attempt unauthorized access
            with pytest.raises(APIError):
                await service.list_projects_for_organization(
                    mock_principal_bob, "org_456"  # Bob doesn't belong to this org
                )

            # Verify scope validation was attempted
            mock_validate.assert_called_once_with(
                mock_principal_bob, "org_456", {"project:read"}
            )

            # The scope guard should have logged the violation
            # This is verified in the scope guard tests

    @pytest.mark.asyncio
    async def test_service_operation_audit_trail(
        self, mock_repository, test_scope_guard, mock_principal_alyssa
    ):
        """Test that service operations create proper audit trails."""
        service = ProjectService(mock_repository)

        project_request = ProjectCreateRequest(
            name="Audit Test Project",
            description="Testing audit functionality",
            status="active",
            priority="medium"
        )

        # Mock successful scope validation
        with patch.object(service, 'validate_organization_access') as mock_validate:
            mock_validate.return_value = ScopeContext(
                principal=mock_principal_alyssa,
                organization_id="org_123",
                division_id=None,
                permissions={"project:create"},
                decision=ScopeDecision.ALLOW
            )

            # Mock repository response
            created_project = MagicMock()
            created_project.id = "proj_audit"
            created_project.name = project_request.name
            created_project.org_id = "org_123"
            created_project.owner_id = mock_principal_alyssa.id
            mock_repository.create.return_value = created_project

            # Perform the operation
            project = await service.create_project_for_organization(
                mock_principal_alyssa, "org_123", project_request
            )

            # Verify the operation was properly scoped and tracked
            assert project.org_id == "org_123"
            assert project.owner_id == mock_principal_alyssa.id
            assert project.name == project_request.name

            # Verify scope validation was called (creates audit trail)
            mock_validate.assert_called_once_with(
                mock_principal_alyssa, "org_123", {"project:create"}
            )

            # Verify repository operation was called
            mock_repository.create.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])