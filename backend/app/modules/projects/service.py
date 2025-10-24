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
    ProjectResponse,
    ProjectWorkspaceSnapshot,
    ProjectCapabilities,
    ProjectFeatureFlags,
    ProjectMember,
    WorkspaceView,
    WorkspaceViewCreateRequest,
    WorkspaceViewUpdateRequest,
    WorkspaceViewsList,
    ProjectMemberRole
)
from .errors import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectMemberNotFoundError,
    ProjectMemberAlreadyExistsError,
    ProjectOwnerOperationError,
    ProjectWorkspaceError,
    validate_project_name,
    validate_project_description,
    validate_project_status,
    validate_project_priority,
    validate_user_id,
    validate_project_member_role
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

        # Validate request data
        validated_name = validate_project_name(project_request.name)
        validated_description = validate_project_description(project_request.description)
        validated_status = validate_project_status(project_request.status)
        validated_priority = validate_project_priority(project_request.priority)

        # Handle frontend field mapping
        metadata = project_request.metadata or {}
        settings = project_request.settings or {}

        # Store frontend-specific fields in metadata/settings for compatibility
        if project_request.visibility:
            metadata["visibility"] = project_request.visibility
        if project_request.tags:
            metadata["tags"] = project_request.tags
        if project_request.target_date:
            metadata["target_date"] = project_request.target_date
        if project_request.default_view:
            settings["default_view"] = project_request.default_view

        project_data = {
            "id": str(uuid.uuid4()),
            "name": validated_name,
            "description": validated_description,
            "status": validated_status,
            "priority": validated_priority,
            "org_id": organization_id,
            "division_id": None,
            "owner_id": principal.id,
            "metadata": metadata,
            "settings": settings,
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
        project_request: ProjectUpdateRequest
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

        update_data = {}

        # Validate and include fields that are provided in the request
        if project_request.name is not None:
            update_data["name"] = validate_project_name(project_request.name)
        if project_request.description is not None:
            update_data["description"] = validate_project_description(project_request.description)
        if project_request.status is not None:
            update_data["status"] = validate_project_status(project_request.status)
        if project_request.priority is not None:
            update_data["priority"] = validate_project_priority(project_request.priority)
        if project_request.metadata is not None:
            update_data["metadata"] = project_request.metadata
        if project_request.settings is not None:
            update_data["settings"] = project_request.settings

        # Always update the timestamp
        update_data["updated_at"] = datetime.utcnow()

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

        # Validate request data
        validated_name = validate_project_name(project_request.name)
        validated_description = validate_project_description(project_request.description)
        validated_status = validate_project_status(project_request.status)
        validated_priority = validate_project_priority(project_request.priority)

        # Handle frontend field mapping
        metadata = project_request.metadata or {}
        settings = project_request.settings or {}

        # Store frontend-specific fields in metadata/settings for compatibility
        if project_request.visibility:
            metadata["visibility"] = project_request.visibility
        if project_request.tags:
            metadata["tags"] = project_request.tags
        if project_request.target_date:
            metadata["target_date"] = project_request.target_date
        if project_request.default_view:
            settings["default_view"] = project_request.default_view

        project_data = {
            "id": str(uuid.uuid4()),
            "name": validated_name,
            "description": validated_description,
            "status": validated_status,
            "priority": validated_priority,
            "org_id": organization_id,
            "division_id": division_id,
            "owner_id": principal.id,
            "metadata": metadata,
            "settings": settings,
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
        project_request: ProjectUpdateRequest
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

        update_data = {}

        # Validate and include fields that are provided in the request
        if project_request.name is not None:
            update_data["name"] = validate_project_name(project_request.name)
        if project_request.description is not None:
            update_data["description"] = validate_project_description(project_request.description)
        if project_request.status is not None:
            update_data["status"] = validate_project_status(project_request.status)
        if project_request.priority is not None:
            update_data["priority"] = validate_project_priority(project_request.priority)
        if project_request.metadata is not None:
            update_data["metadata"] = project_request.metadata
        if project_request.settings is not None:
            update_data["settings"] = project_request.settings

        # Always update the timestamp
        update_data["updated_at"] = datetime.utcnow()

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

    # Workspace management methods
    async def get_project_workspace_snapshot(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str
    ) -> Optional[ProjectWorkspaceSnapshot]:
        """
        Get comprehensive project workspace snapshot.

        This method aggregates project details, members, views, capabilities,
        and feature flags into a single response for UI initialization.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:read"}
        )

        # Get project details
        project = await self._repository.get_by_id(project_id)
        if not project or project.org_id != organization_id or project.division_id != division_id:
            return None

        # Get project members
        members = await self._repository.get_project_members(project_id)

        # Get workspace views
        views = await self._repository.get_workspace_views(project_id)

        # Determine user capabilities based on role and permissions
        user_member = next((m for m in members if m.user_id == principal.id), None)
        capabilities = self._calculate_user_capabilities(user_member, principal)

        # Get feature flags (could be enhanced with feature flag service)
        feature_flags = self._get_project_feature_flags(project)

        # Get active view (could be enhanced with user preferences)
        default_view = next((v for v in views if v.is_default), None)
        active_view_id = default_view.id if default_view else (views[0].id if views else None)

        return ProjectWorkspaceSnapshot(
            project=project,
            members=members,
            views=views,
            capabilities=capabilities,
            feature_flags=feature_flags,
            active_view_id=active_view_id
        )

    async def list_workspace_views(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str
    ) -> Optional[WorkspaceViewsList]:
        """
        List all workspace views for a project.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:read"}
        )

        # Verify project exists and belongs to division
        project = await self._repository.get_by_id(project_id)
        if not project or project.org_id != organization_id or project.division_id != division_id:
            return None

        views = await self._repository.get_workspace_views(project_id)
        default_view = next((v for v in views if v.is_default), None)

        return WorkspaceViewsList(
            views=views,
            total=len(views),
            default_view_id=default_view.id if default_view else None
        )

    async def create_workspace_view(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str,
        view_request: WorkspaceViewCreateRequest
    ) -> Optional[WorkspaceView]:
        """
        Create a new workspace view for a project.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:update"}
        )

        # Verify project exists and belongs to division
        project = await self._repository.get_by_id(project_id)
        if not project or project.org_id != organization_id or project.division_id != division_id:
            return None

        # If setting as default, unset existing default
        if view_request.is_default:
            await self._repository.clear_default_view(project_id)

        view_data = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "type": view_request.type,
            "name": view_request.name,
            "is_default": view_request.is_default,
            "settings": view_request.settings or {},
            "created_by": principal.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.create_workspace_view(view_data)

    async def update_workspace_view(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str,
        view_id: str,
        view_request: WorkspaceViewUpdateRequest
    ) -> Optional[WorkspaceView]:
        """
        Update an existing workspace view.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:update"}
        )

        # Verify view exists and belongs to project
        existing_view = await self._repository.get_workspace_view(view_id)
        if not existing_view or existing_view.project_id != project_id:
            return None

        # Verify project belongs to division
        project = await self._repository.get_by_id(project_id)
        if not project or project.org_id != organization_id or project.division_id != division_id:
            return None

        # If setting as default, unset existing default
        if view_request.is_default and not existing_view.is_default:
            await self._repository.clear_default_view(project_id)

        update_data = {}
        if view_request.name is not None:
            update_data["name"] = view_request.name
        if view_request.is_default is not None:
            update_data["is_default"] = view_request.is_default
        if view_request.settings is not None:
            update_data["settings"] = view_request.settings
        update_data["updated_at"] = datetime.utcnow()

        return await self._repository.update_workspace_view(view_id, update_data)

    async def delete_workspace_view(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        project_id: str,
        view_id: str
    ) -> bool:
        """
        Delete a workspace view.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"project:update"}
        )

        # Verify view exists and belongs to project
        existing_view = await self._repository.get_workspace_view(view_id)
        if not existing_view or existing_view.project_id != project_id:
            return False

        # Verify project belongs to division
        project = await self._repository.get_by_id(project_id)
        if not project or project.org_id != organization_id or project.division_id != division_id:
            return False

        return await self._repository.delete_workspace_view(view_id)

    # Helper methods
    def _calculate_user_capabilities(
        self,
        member: Optional[ProjectMember],
        principal: CurrentPrincipal
    ) -> ProjectCapabilities:
        """Calculate user capabilities based on membership role."""
        if not member:
            return ProjectCapabilities(
                can_manage_project=False,
                can_manage_views=False,
                can_manage_members=False,
                can_create_tasks=False,
                can_delete_project=False
            )

        # Role-based capabilities
        is_owner = member.role == ProjectMemberRole.OWNER
        is_admin = member.role == ProjectMemberRole.ADMIN
        is_collaborator = member.role == ProjectMemberRole.COLLABORATOR

        return ProjectCapabilities(
            can_manage_project=is_owner or is_admin,
            can_manage_views=is_owner or is_admin or is_collaborator,
            can_manage_members=is_owner or is_admin,
            can_create_tasks=is_owner or is_admin or is_collaborator,
            can_delete_project=is_owner
        )

    def _get_project_feature_flags(self, project: ProjectDetails) -> ProjectFeatureFlags:
        """Get feature flags for a project."""
        # This could be enhanced with a feature flag service
        # For now, return default flags
        return ProjectFeatureFlags(
            project_workspace=True,
            project_sidebar=False,
            advanced_views=project.metadata.get("advanced_views", False),
            real_time_collaboration=True
        )

    # Project Membership Management Methods
    async def get_project_members(self, project_id: str) -> List[ProjectMember]:
        """
        Get all members of a project.

        Returns a list of all users who are members of the specified project,
        including their roles and membership timestamps.
        """
        return await self._repository.get_project_members(project_id)

    async def add_project_member(
        self,
        project_id: str,
        user_id: str,
        role: ProjectMemberRole,
        invited_by: str
    ) -> Optional[ProjectMember]:
        """
        Add a new member to a project.

        Args:
            project_id: The project to add the member to
            user_id: The user ID to add as a member
            role: The role to assign to the member
            invited_by: The user ID who is inviting this member

        Returns:
            The created project member, or None if failed

        Raises:
            ProjectValidationError: If validation fails
            ProjectMemberAlreadyExistsError: If user is already a member
        """
        # Validate input
        validated_user_id = validate_user_id(user_id)
        validated_role = validate_project_member_role(role.value if hasattr(role, 'value') else role)

        # Check if user is already a member
        existing_members = await self._repository.get_project_members(project_id)
        if any(member.user_id == validated_user_id for member in existing_members):
            raise ProjectMemberAlreadyExistsError(project_id, validated_user_id)

        member_data = {
            "project_id": project_id,
            "user_id": validated_user_id,
            "role": validated_role,
            "invited_at": datetime.utcnow(),
            "joined_at": datetime.utcnow(),
            "invited_by": invited_by,
        }

        return await self._repository.add_project_member(member_data)

    async def update_project_member_role(
        self,
        project_id: str,
        user_id: str,
        new_role: ProjectMemberRole,
        updated_by: str
    ) -> Optional[ProjectMember]:
        """
        Update a project member's role.

        Args:
            project_id: The project containing the member
            user_id: The user ID whose role to update
            new_role: The new role to assign
            updated_by: The user ID making the change

        Returns:
            The updated project member, or None if failed

        Raises:
            ProjectValidationError: If validation fails
            ProjectMemberNotFoundError: If member not found
            ProjectOwnerOperationError: If operation not allowed on owner
        """
        # Validate input
        validated_user_id = validate_user_id(user_id)
        validated_role = validate_project_member_role(new_role.value if hasattr(new_role, 'value') else new_role)

        # Get existing members
        existing_members = await self._repository.get_project_members(project_id)
        target_member = next((m for m in existing_members if m.user_id == validated_user_id), None)

        if not target_member:
            raise ProjectMemberNotFoundError(project_id, validated_user_id)

        # Cannot change the role of the project owner
        if target_member.role == ProjectMemberRole.OWNER:
            raise ProjectOwnerOperationError(
                "update role",
                "Cannot change the role of the project owner. Use ownership transfer instead."
            )

        # Cannot make someone else the owner (ownership transfer is separate)
        if validated_role == ProjectMemberRole.OWNER:
            raise ProjectOwnerOperationError(
                "assign owner role",
                "Cannot assign owner role directly. Use ownership transfer instead."
            )

        return await self._repository.update_project_member_role(
            project_id, validated_user_id, validated_role, updated_by
        )

    async def remove_project_member(
        self,
        project_id: str,
        user_id: str,
        removed_by: str
    ) -> bool:
        """
        Remove a member from a project.

        Args:
            project_id: The project containing the member
            user_id: The user ID to remove
            removed_by: The user ID making the change

        Returns:
            True if successful, False otherwise

        Raises:
            ProjectValidationError: If validation fails
            ProjectMemberNotFoundError: If member not found
            ProjectOwnerOperationError: If trying to remove owner
        """
        # Validate input
        validated_user_id = validate_user_id(user_id)

        # Get existing members
        existing_members = await self._repository.get_project_members(project_id)
        target_member = next((m for m in existing_members if m.user_id == validated_user_id), None)

        if not target_member:
            raise ProjectMemberNotFoundError(project_id, validated_user_id)

        # Cannot remove the project owner
        if target_member.role == ProjectMemberRole.OWNER:
            raise ProjectOwnerOperationError(
                "remove member",
                "Cannot remove the project owner from the project."
            )

        return await self._repository.remove_project_member(project_id, validated_user_id)

    async def transfer_project_ownership(
        self,
        project_id: str,
        from_user_id: str,
        to_user_id: str,
        transferred_by: str
    ) -> bool:
        """
        Transfer project ownership from one user to another.

        Args:
            project_id: The project to transfer ownership for
            from_user_id: The current owner user ID
            to_user_id: The new owner user ID
            transferred_by: The user ID making the transfer

        Returns:
            True if successful, False otherwise
        """
        # Get existing members
        existing_members = await self._repository.get_project_members(project_id)

        current_owner = next((m for m in existing_members if m.user_id == from_user_id and m.role == ProjectMemberRole.OWNER), None)
        new_owner = next((m for m in existing_members if m.user_id == to_user_id), None)

        if not current_owner:
            return False

        if not new_owner:
            # Add the new user as an admin first if they don't exist
            new_member_data = {
                "project_id": project_id,
                "user_id": to_user_id,
                "role": ProjectMemberRole.ADMIN,
                "invited_at": datetime.utcnow(),
                "joined_at": datetime.utcnow(),
                "invited_by": transferred_by,
            }
            new_owner = await self._repository.add_project_member(new_member_data)
            if not new_owner:
                return False

        # Transfer ownership
        success1 = await self._repository.update_project_member_role(
            project_id, to_user_id, ProjectMemberRole.OWNER, transferred_by
        )

        success2 = await self._repository.update_project_member_role(
            project_id, from_user_id, ProjectMemberRole.ADMIN, transferred_by
        )

        return success1 and success2
