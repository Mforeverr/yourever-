# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Project service with comprehensive scope validation and security.

This service implements secure project management operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access.
"""

from datetime import datetime
from typing import Optional, List
import uuid

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from .repository import ProjectRepository
from .schemas import (
    ProjectSummary,
    ProjectDetails,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse
)


class ProjectService(ScopedService):
    """
    Encapsulates secure project domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all project operations respect organization
    and division boundaries.
    """

    def __init__(self, repository: ProjectRepository) -> None:
        super().__init__()
        self._repository = repository

    # Legacy method for backward compatibility
    async def list_projects(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        """
        Legacy method - returns all projects the principal can access.

        DEPRECATED: Use scoped methods instead for better security.
        """
        return await self._repository.list_for_principal(principal)

    # Organization-scoped methods
    async def list_projects_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str
    ) -> List[ProjectSummary]:
        """
        List all projects within a specific organization.

        This method validates that the principal has access to the specified
        organization before returning projects, preventing cross-organization
        data access.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"project:read"}
        )

        return await self._repository.list_for_organization(organization_id)

    async def create_project_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        project_request: ProjectCreateRequest
    ) -> ProjectDetails:
        """
        Create a new project within a specific organization.

        Validates organization access and associates the project with the
        validated organization scope.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"project:create"}
        )

        project_data = {
            "id": str(uuid.uuid4()),
            "name": project_request.name,
            "description": project_request.description,
            "status": project_request.status,
            "priority": project_request.priority,
            "org_id": organization_id,
            "division_id": None,
            "owner_id": principal.id,
            "metadata": project_request.metadata or {},
            "settings": project_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.create(project_data)

    async def get_project_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        project_id: str
    ) -> Optional[ProjectDetails]:
        """
        Get a specific project within an organization.

        Validates both organization access and project ownership
        within that organization.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"project:read"}
        )

        project = await self._repository.get_by_id(project_id)

        # Ensure project belongs to the validated organization
        if project and project.org_id == organization_id:
            return project

        return None

    async def update_project_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        project_id: str,
        project_request: ProjectCreateRequest
    ) -> Optional[ProjectDetails]:
        """
        Update a project within an organization.

        Validates organization access and ensures the project belongs
        to that organization before updating.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"project:update"}
        )

        # Verify project exists and belongs to organization
        existing_project = await self._repository.get_by_id(project_id)
        if not existing_project or existing_project.org_id != organization_id:
            return None

        update_data = {
            "name": project_request.name,
            "description": project_request.description,
            "status": project_request.status,
            "priority": project_request.priority,
            "metadata": project_request.metadata or {},
            "settings": project_request.settings or {},
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.update(project_id, update_data)

    async def delete_project_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        project_id: str
    ) -> bool:
        """
        Delete a project within an organization.

        Validates organization access and ensures the project belongs
        to that organization before deletion.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"project:delete"}
        )

        # Verify project exists and belongs to organization
        existing_project = await self._repository.get_by_id(project_id)
        if not existing_project or existing_project.org_id != organization_id:
            return False

        return await self._repository.delete(project_id)

    # Division-scoped methods
    async def list_projects_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str
    ) -> List[ProjectSummary]:
        """
        List all projects within a specific division.

        This method validates both organization and division access before
        returning projects, preventing cross-division data access.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:read"}
        )

        return await self._repository.list_for_division(organization_id, division_id)

    async def create_project_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_request: ProjectCreateRequest
    ) -> ProjectDetails:
        """
        Create a new project within a specific division.

        Validates division access and associates the project with the
        validated division scope.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:create"}
        )

        project_data = {
            "id": str(uuid.uuid4()),
            "name": project_request.name,
            "description": project_request.description,
            "status": project_request.status,
            "priority": project_request.priority,
            "org_id": organization_id,
            "division_id": division_id,
            "owner_id": principal.id,
            "metadata": project_request.metadata or {},
            "settings": project_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.create(project_data)

    async def get_project_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str
    ) -> Optional[ProjectDetails]:
        """
        Get a specific project within a division.

        Validates both division access and project ownership
        within that division.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:read"}
        )

        project = await self._repository.get_by_id(project_id)

        # Ensure project belongs to the validated division
        if project and project.org_id == organization_id and project.division_id == division_id:
            return project

        return None

    async def update_project_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str,
        project_request: ProjectCreateRequest
    ) -> Optional[ProjectDetails]:
        """
        Update a project within a division.

        Validates division access and ensures the project belongs
        to that division before updating.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:update"}
        )

        # Verify project exists and belongs to division
        existing_project = await self._repository.get_by_id(project_id)
        if (not existing_project or
            existing_project.org_id != organization_id or
            existing_project.division_id != division_id):
            return None

        update_data = {
            "name": project_request.name,
            "description": project_request.description,
            "status": project_request.status,
            "priority": project_request.priority,
            "metadata": project_request.metadata or {},
            "settings": project_request.settings or {},
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.update(project_id, update_data)

    async def delete_project_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str
    ) -> bool:
        """
        Delete a project within a division.

        Validates division access and ensures the project belongs
        to that division before deletion.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:delete"}
        )

        # Verify project exists and belongs to division
        existing_project = await self._repository.get_by_id(project_id)
        if (not existing_project or
            existing_project.org_id != organization_id or
            existing_project.division_id != division_id):
            return False

        return await self._repository.delete(project_id)
