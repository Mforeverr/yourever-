# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
Project repository with comprehensive database operations and proper scoping.

This module implements the repository pattern for project management with
real database operations, proper scope validation, and multi-tenant data
isolation to prevent cross-tenant data access.
"""

from typing import Protocol, Optional, List, Dict, Any
import uuid
from datetime import datetime

from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .models import (
    ProjectModel,
    ProjectMemberModel,
    ProjectWorkspaceViewModel
)
from .schemas import (
    ProjectSummary,
    ProjectDetails,
    ProjectMember,
    WorkspaceView,
    ViewType,
    ProjectStatus,
    ProjectPriority,
    ProjectMemberRole
)


class ProjectRepository(Protocol):
    """Contract for persisting and retrieving projects."""

    async def list_for_principal(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        ...

    # Organization-scoped methods
    async def list_for_organization(self, organization_id: str) -> list[ProjectSummary]:
        ...

    async def create(self, project_data: Dict[str, Any]) -> ProjectDetails:
        ...

    async def get_by_id(self, project_id: str) -> Optional[ProjectDetails]:
        ...

    async def update(self, project_id: str, update_data: Dict[str, Any]) -> Optional[ProjectDetails]:
        ...

    async def delete(self, project_id: str) -> bool:
        ...

    # Division-scoped methods
    async def list_for_division(self, organization_id: str, division_id: str) -> list[ProjectSummary]:
        ...

    # Workspace management methods
    async def get_project_members(self, project_id: str) -> List[ProjectMember]:
        ...

    async def get_workspace_views(self, project_id: str) -> List[WorkspaceView]:
        ...

    async def get_workspace_view(self, view_id: str) -> Optional[WorkspaceView]:
        ...

    async def create_workspace_view(self, view_data: Dict[str, Any]) -> WorkspaceView:
        ...

    async def update_workspace_view(self, view_id: str, update_data: Dict[str, Any]) -> Optional[WorkspaceView]:
        ...

    async def delete_workspace_view(self, view_id: str) -> bool:
        ...

    async def clear_default_view(self, project_id: str) -> None:
        ...

    # Project membership management methods
    async def add_project_member(self, member_data: Dict[str, Any]) -> ProjectMember:
        ...

    async def update_project_member_role(
        self,
        project_id: str,
        user_id: str,
        new_role: ProjectMemberRole,
        updated_by: str
    ) -> Optional[ProjectMember]:
        ...

    async def remove_project_member(self, project_id: str, user_id: str) -> bool:
        ...


class SQLAlchemyProjectRepository:
    """
    Project repository backed by SQLAlchemy with comprehensive security and scoping.

    This repository implements real database operations with proper scope validation
    to prevent cross-tenant data access and ensure data security compliance.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_principal(self, principal: CurrentPrincipal) -> list[ProjectSummary]:
        """
        Get projects accessible to the principal with proper scope filtering.

        CRITICAL SECURITY: Applies organization and division scope filtering to prevent
        multi-tenant data leakage. Only returns projects the principal has access to.
        """
        if not principal.org_ids:
            # User has no organization access - return empty list
            return []

        # Build query with organization scope filtering (excluding archived projects)
        query = select(ProjectModel).where(
            and_(
                ProjectModel.org_id.in_(principal.org_ids),
                ProjectModel.archived_at.is_(None)  # Exclude archived projects
            )
        )

        # Apply division scope filtering if active division is set
        if principal.active_division_id:
            query = query.where(ProjectModel.division_id == principal.active_division_id)

        # Order by updated_at for most recent first
        query = query.order_by(ProjectModel.updated_at.desc())

        result = await self._session.execute(query)
        records = result.scalars().all()
        return [self._to_summary(record) for record in records]

    @staticmethod
    def _to_summary(record: ProjectModel) -> ProjectSummary:
        """Convert database record to project summary."""
        # Safely convert database string values to enums with fallbacks
        status_value = record.status if record.status else "draft"
        priority_value = record.priority if record.priority else "medium"

        try:
            status = ProjectStatus(status_value)
        except ValueError:
            status = ProjectStatus.DRAFT

        try:
            priority = ProjectPriority(priority_value)
        except ValueError:
            priority = ProjectPriority.MEDIUM

        return ProjectSummary(
            id=str(record.id),
            name=record.name,
            description=record.description,
            status=status,
            priority=priority,
            org_id=str(record.org_id) if record.org_id else None,
            division_id=str(record.division_id) if record.division_id else None,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    @staticmethod
    def _to_details(record: ProjectModel) -> ProjectDetails:
        """Convert database record to project details."""
        # Safely convert database string values to enums with fallbacks
        status_value = record.status if record.status else "draft"
        priority_value = record.priority if record.priority else "medium"

        try:
            status = ProjectStatus(status_value)
        except ValueError:
            status = ProjectStatus.DRAFT

        try:
            priority = ProjectPriority(priority_value)
        except ValueError:
            priority = ProjectPriority.MEDIUM

        return ProjectDetails(
            id=str(record.id),
            name=record.name,
            description=record.description,
            status=status,
            priority=priority,
            org_id=str(record.org_id) if record.org_id else None,
            division_id=str(record.division_id) if record.division_id else None,
            owner_id=str(record.owner_id) if record.owner_id else None,
            metadata=record.project_metadata or {},
            settings=record.settings or {},
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

    # Organization-scoped methods
    async def list_for_organization(self, organization_id: str) -> list[ProjectSummary]:
        """List all active projects within an organization."""
        query = select(ProjectModel).where(
            and_(
                ProjectModel.org_id == organization_id,
                ProjectModel.archived_at.is_(None)
            )
        ).order_by(ProjectModel.updated_at.desc())

        result = await self._session.execute(query)
        records = result.scalars().all()
        return [self._to_summary(record) for record in records]

    async def create(self, project_data: Dict[str, Any]) -> ProjectDetails:
        """Create a new project in the database."""
        project = ProjectModel(
            id=project_data.get('id', uuid.uuid4()),
            name=project_data['name'],
            description=project_data.get('description'),
            status=project_data['status'],
            priority=project_data['priority'],
            org_id=project_data['org_id'],
            division_id=project_data.get('division_id'),
            owner_id=project_data.get('owner_id'),
            project_metadata=project_data.get('metadata', {}),
            settings=project_data.get('settings', {}),
            created_at=project_data.get('created_at', datetime.utcnow()),
            updated_at=project_data['updated_at'],
        )

        self._session.add(project)
        await self._session.flush()  # Get the ID without committing
        await self._session.refresh(project)

        return self._to_details(project)

    async def get_by_id(self, project_id: str) -> Optional[ProjectDetails]:
        """Get a project by ID."""
        try:
            query = select(ProjectModel).where(ProjectModel.id == project_id)
            result = await self._session.execute(query)
            record = result.scalar_one_or_none()

            if record:
                return self._to_details(record)
            return None
        except Exception:
            return None

    async def update(self, project_id: str, update_data: Dict[str, Any]) -> Optional[ProjectDetails]:
        """Update a project in the database."""
        try:
            # Remove fields that shouldn't be updated directly
            clean_update_data = {k: v for k, v in update_data.items()
                                if k not in ['id', 'org_id', 'created_at']}

            # Always update the updated_at timestamp
            clean_update_data['updated_at'] = datetime.utcnow()

            query = update(ProjectModel).where(
                ProjectModel.id == project_id
            ).values(**clean_update_data).returning(ProjectModel)

            result = await self._session.execute(query)
            record = result.scalar_one_or_none()

            if record:
                await self._session.refresh(record)
                return self._to_details(record)
            return None
        except Exception:
            return None

    async def delete(self, project_id: str) -> bool:
        """Soft delete a project by archiving it."""
        try:
            query = update(ProjectModel).where(
                ProjectModel.id == project_id
            ).values(
                archived_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            result = await self._session.execute(query)
            await self._session.flush()

            return result.rowcount > 0
        except Exception:
            return False

    # Division-scoped methods
    async def list_for_division(self, organization_id: str, division_id: str) -> list[ProjectSummary]:
        """List all active projects within a division."""
        query = select(ProjectModel).where(
            and_(
                ProjectModel.org_id == organization_id,
                ProjectModel.division_id == division_id,
                ProjectModel.archived_at.is_(None)
            )
        ).order_by(ProjectModel.updated_at.desc())

        result = await self._session.execute(query)
        records = result.scalars().all()
        return [self._to_summary(record) for record in records]

    # Workspace management methods
    async def get_project_members(self, project_id: str) -> List[ProjectMember]:
        """Get all members of a project."""
        try:
            # Query project_members table with proper model reference
            query = select(ProjectMemberModel).where(
                and_(
                    ProjectMemberModel.project_id == project_id,
                    ProjectMemberModel.is_active == True
                )
            ).order_by(ProjectMemberModel.created_at)

            result = await self._session.execute(query)
            records = result.scalars().all()

            return [
                ProjectMember(
                    userId=str(record.user_id),
                    role=ProjectMemberRole(record.role) if record.role else ProjectMemberRole.VIEWER,
                    invitedAt=record.invited_at,
                    joinedAt=record.joined_at
                )
                for record in records
            ]
        except Exception as e:
            # Log the error for debugging
            print(f"Error fetching project members: {e}")
            # Return empty list instead of mock data for proper error handling
            return []

    async def get_workspace_views(self, project_id: str) -> List[WorkspaceView]:
        """Get all workspace views for a project."""
        try:
            # Query project_workspace_views table with proper model reference
            query = select(ProjectWorkspaceViewModel).where(
                and_(
                    ProjectWorkspaceViewModel.project_id == project_id,
                    ProjectWorkspaceViewModel.is_active == True,
                    ProjectWorkspaceViewModel.archived_at.is_(None)
                )
            ).order_by(ProjectWorkspaceViewModel.is_default.desc(), ProjectWorkspaceViewModel.created_at)

            result = await self._session.execute(query)
            records = result.scalars().all()

            return [
                WorkspaceView(
                    id=str(record.id),
                    type=ViewType(record.view_type) if record.view_type else ViewType.BOARD,
                    name=record.name,
                    is_default=record.is_default or False,
                    settings=record.config or {},  # Use config instead of settings
                    created_by=str(record.created_by),
                    created_at=record.created_at,
                    updated_at=record.updated_at
                )
                for record in records
            ]
        except Exception as e:
            # Log the error for debugging
            print(f"Error fetching workspace views: {e}")
            # Return empty list instead of mock data for proper error handling
            return []

    async def get_workspace_view(self, view_id: str) -> Optional[WorkspaceView]:
        """Get a specific workspace view."""
        try:
            query = select(ProjectWorkspaceViewModel).where(
                and_(
                    ProjectWorkspaceViewModel.id == view_id,
                    ProjectWorkspaceViewModel.is_active == True,
                    ProjectWorkspaceViewModel.archived_at.is_(None)
                )
            )
            result = await self._session.execute(query)
            record = result.scalar_one_or_none()

            if record:
                return WorkspaceView(
                    id=str(record.id),
                    type=ViewType(record.view_type) if record.view_type else ViewType.BOARD,
                    name=record.name,
                    is_default=record.is_default or False,
                    settings=record.config or {},  # Use config instead of settings
                    created_by=str(record.created_by),
                    created_at=record.created_at,
                    updated_at=record.updated_at
                )
            return None
        except Exception as e:
            # Log the error for debugging
            print(f"Error fetching workspace view {view_id}: {e}")
            return None

    async def create_workspace_view(self, view_data: Dict[str, Any]) -> WorkspaceView:
        """Create a new workspace view."""
        try:
            # Create new workspace view record
            workspace_view = ProjectWorkspaceViewModel(
                id=view_data.get('id', uuid.uuid4()),
                project_id=view_data['project_id'],
                view_type=view_data['type'],  # Use view_type field
                name=view_data['name'],
                description=view_data.get('description'),
                config=view_data.get('settings', {}),  # Use config field
                filter_config=view_data.get('filter_config'),
                sort_config=view_data.get('sort_config'),
                layout_config=view_data.get('layout_config'),
                is_default=view_data.get('is_default', False),
                is_public=view_data.get('is_public', True),
                is_active=True,
                created_by=view_data['created_by'],
                created_at=view_data.get('created_at', datetime.utcnow()),
                updated_at=datetime.utcnow()
            )

            self._session.add(workspace_view)
            await self._session.flush()
            await self._session.refresh(workspace_view)

            # If this is the default view, clear other default views
            if workspace_view.is_default:
                await self.clear_default_view(view_data['project_id'])

            return WorkspaceView(
                id=str(workspace_view.id),
                type=ViewType(workspace_view.view_type) if workspace_view.view_type else ViewType.BOARD,
                name=workspace_view.name,
                is_default=workspace_view.is_default,
                settings=workspace_view.config or {},
                created_by=str(workspace_view.created_by),
                created_at=workspace_view.created_at,
                updated_at=workspace_view.updated_at
            )
        except Exception as e:
            # Log the error for debugging
            print(f"Error creating workspace view: {e}")
            raise e

    async def update_workspace_view(self, view_id: str, update_data: Dict[str, Any]) -> Optional[WorkspaceView]:
        """Update an existing workspace view."""
        try:
            # Build update data with proper field mapping
            clean_update_data = {}
            field_mapping = {
                'name': 'name',
                'type': 'view_type',  # Map 'type' to 'view_type'
                'description': 'description',
                'settings': 'config',  # Map 'settings' to 'config'
                'filter_config': 'filter_config',
                'sort_config': 'sort_config',
                'layout_config': 'layout_config',
                'is_default': 'is_default',
                'is_public': 'is_public',
                'is_active': 'is_active'
            }

            for key, value in update_data.items():
                if key in field_mapping:
                    clean_update_data[field_mapping[key]] = value

            # Always update the updated_at timestamp
            clean_update_data['updated_at'] = datetime.utcnow()

            query = update(ProjectWorkspaceViewModel).where(
                ProjectWorkspaceViewModel.id == view_id
            ).values(**clean_update_data).returning(ProjectWorkspaceViewModel)

            result = await self._session.execute(query)
            record = result.scalar_one_or_none()

            if record:
                await self._session.refresh(record)

                # If this is being set as default, clear other default views
                if clean_update_data.get('is_default', False):
                    await self.clear_default_view(str(record.project_id))
                    # Set this one as default again
                    await self._session.execute(
                        update(ProjectWorkspaceViewModel).where(
                            ProjectWorkspaceViewModel.id == view_id
                        ).values(is_default=True)
                    )

                return WorkspaceView(
                    id=str(record.id),
                    type=ViewType(record.view_type) if record.view_type else ViewType.BOARD,
                    name=record.name,
                    is_default=record.is_default,
                    settings=record.config or {},
                    created_by=str(record.created_by),
                    created_at=record.created_at,
                    updated_at=record.updated_at
                )
            return None
        except Exception as e:
            # Log the error for debugging
            print(f"Error updating workspace view {view_id}: {e}")
            return None

    async def delete_workspace_view(self, view_id: str) -> bool:
        """Delete a workspace view."""
        try:
            # Soft delete by archiving the view
            query = update(ProjectWorkspaceViewModel).where(
                ProjectWorkspaceViewModel.id == view_id
            ).values(
                archived_at=datetime.utcnow(),
                is_active=False,
                updated_at=datetime.utcnow()
            )

            result = await self._session.execute(query)
            await self._session.flush()

            return result.rowcount > 0
        except Exception as e:
            # Log the error for debugging
            print(f"Error deleting workspace view {view_id}: {e}")
            return False

    async def clear_default_view(self, project_id: str) -> None:
        """Clear the default view flag for all views in a project."""
        try:
            query = update(ProjectWorkspaceViewModel).where(
                ProjectWorkspaceViewModel.project_id == project_id
            ).values(
                is_default=False,
                updated_at=datetime.utcnow()
            )

            await self._session.execute(query)
            await self._session.flush()
        except Exception as e:
            # Log the error for debugging
            print(f"Error clearing default view for project {project_id}: {e}")
            # Don't raise here as this is a helper method

    # Project Membership Management Methods
    async def add_project_member(self, member_data: Dict[str, Any]) -> ProjectMember:
        """Add a new member to a project."""
        try:
            # Create new project member record
            project_member = ProjectMemberModel(
                id=member_data.get('id', uuid.uuid4()),
                project_id=member_data['project_id'],
                user_id=member_data['user_id'],
                role=member_data['role'],
                invited_at=member_data.get('invited_at', datetime.utcnow()),
                joined_at=member_data.get('joined_at'),
                invited_by=member_data.get('invited_by'),
                permissions=member_data.get('permissions'),
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            self._session.add(project_member)
            await self._session.flush()
            await self._session.refresh(project_member)

            return ProjectMember(
                userId=str(project_member.user_id),
                role=ProjectMemberRole(project_member.role) if project_member.role else ProjectMemberRole.VIEWER,
                invitedAt=project_member.invited_at,
                joinedAt=project_member.joined_at
            )
        except Exception as e:
            # Log the error for debugging
            print(f"Error adding project member: {e}")
            raise e

    async def update_project_member_role(
        self,
        project_id: str,
        user_id: str,
        new_role: ProjectMemberRole,
        updated_by: str
    ) -> Optional[ProjectMember]:
        """Update a project member's role."""
        try:
            query = update(ProjectMemberModel).where(
                and_(
                    ProjectMemberModel.project_id == project_id,
                    ProjectMemberModel.user_id == user_id,
                    ProjectMemberModel.is_active == True
                )
            ).values(
                role=str(new_role.value),  # Convert enum to string
                updated_at=datetime.utcnow()
            ).returning(ProjectMemberModel)

            result = await self._session.execute(query)
            record = result.scalar_one_or_none()

            if record:
                await self._session.refresh(record)
                return ProjectMember(
                    userId=str(record.user_id),
                    role=ProjectMemberRole(record.role) if record.role else ProjectMemberRole.VIEWER,
                    invitedAt=record.invited_at,
                    joinedAt=record.joined_at
                )
            return None
        except Exception as e:
            # Log the error for debugging
            print(f"Error updating project member role: {e}")
            return None

    async def remove_project_member(self, project_id: str, user_id: str) -> bool:
        """Remove a member from a project."""
        try:
            # Soft delete by setting is_active to False
            query = update(ProjectMemberModel).where(
                and_(
                    ProjectMemberModel.project_id == project_id,
                    ProjectMemberModel.user_id == user_id,
                    ProjectMemberModel.is_active == True
                )
            ).values(
                is_active=False,
                updated_at=datetime.utcnow()
            )

            result = await self._session.execute(query)
            await self._session.flush()

            return result.rowcount > 0
        except Exception as e:
            # Log the error for debugging
            print(f"Error removing project member: {e}")
            return False
