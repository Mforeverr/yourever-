# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Pydantic schemas for the projects module with comprehensive scope validation.

This module defines the data models for project management operations with
proper validation, serialization, and security considerations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, Any, Dict, List
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, validator


class ProjectStatus(str, Enum):
    """Project status enumeration for type safety."""
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class ProjectPriority(str, Enum):
    """Project priority enumeration for task management."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViewType(str, Enum):
    """Workspace view type enumeration."""
    BOARD = "board"
    LIST = "list"
    TIMELINE = "timeline"
    CALENDAR = "calendar"
    MINDMAP = "mindmap"
    DOCS = "docs"


class ProjectMemberRole(str, Enum):
    """Project member role enumeration."""
    OWNER = "owner"
    ADMIN = "admin"
    COLLABORATOR = "collaborator"
    VIEWER = "viewer"


class ProjectSummary(BaseModel):
    """Lightweight project summary for list views and references."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Stable project identifier")
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, description="Current project status")
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM, description="Project priority")
    org_id: Optional[str] = Field(default=None, alias="orgId", description="Organization ID")
    division_id: Optional[str] = Field(default=None, alias="divisionId", description="Division ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt", description="Last update timestamp")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()


class ProjectDetails(ProjectSummary):
    """Complete project details with additional metadata."""
    owner_id: Optional[str] = Field(default=None, alias="ownerId", description="Project owner ID")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional project metadata")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Project-specific settings")

    # Frontend compatibility fields (computed from metadata/settings)
    @property
    def visibility(self) -> str:
        """Get project visibility from metadata."""
        return self.metadata.get("visibility", "division") if self.metadata else "division"

    @property
    def tags(self) -> List[str]:
        """Get project tags from metadata."""
        return self.metadata.get("tags", []) if self.metadata else []

    @property
    def target_date(self) -> Optional[str]:
        """Get target date from metadata."""
        return self.metadata.get("target_date") if self.metadata else None

    @property
    def default_view(self) -> str:
        """Get default view from settings."""
        return self.settings.get("default_view", "board") if self.settings else "board"


class ProjectCreateRequest(BaseModel):
    """Request model for creating new projects."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, description="Initial project status")
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM, description="Project priority")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional project metadata")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Project-specific settings")

    # Frontend compatibility fields
    visibility: Optional[str] = Field(default="division", description="Project visibility")
    tags: Optional[List[str]] = Field(default_factory=list, description="Project tags")
    target_date: Optional[str] = Field(None, description="Target completion date")
    default_view: Optional[str] = Field(default="board", description="Default workspace view")

    # Aliases for frontend field names
    organizationId: Optional[str] = Field(None, alias="organizationId", description="Organization ID (alias)")
    divisionId: Optional[str] = Field(None, alias="divisionId", description="Division ID (alias)")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()


class ProjectUpdateRequest(BaseModel):
    """Request model for updating existing projects."""
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated project name")
    description: Optional[str] = Field(None, max_length=1000, description="Updated project description")
    status: Optional[ProjectStatus] = Field(None, description="Updated project status")
    priority: Optional[ProjectPriority] = Field(None, description="Updated project priority")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Updated project metadata")
    settings: Optional[Dict[str, Any]] = Field(None, description="Updated project settings")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Project name cannot be empty')
        return v.strip() if v else v


class ProjectResponse(BaseModel):
    """Response model for project operations with complete details."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Project identifier")
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    status: ProjectStatus = Field(..., description="Project status")
    priority: ProjectPriority = Field(..., description="Project priority")
    org_id: Optional[str] = Field(None, alias="orgId", description="Organization ID")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Division ID")
    owner_id: Optional[str] = Field(None, alias="ownerId", description="Project owner ID")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Project metadata")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Project settings")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")

    # Frontend compatibility fields
    visibility: Optional[str] = Field(default="division", description="Project visibility")
    tags: Optional[List[str]] = Field(default_factory=list, description="Project tags")
    target_date: Optional[str] = Field(None, description="Target completion date")
    default_view: Optional[str] = Field(default="board", description="Default workspace view")

    @classmethod
    def from_entity(cls, entity: Any) -> ProjectResponse:
        """Create response from a project entity (for future ORM integration)."""
        if hasattr(entity, 'dict'):
            data = entity.dict()
        elif hasattr(entity, '__dict__'):
            data = entity.__dict__
        else:
            # Handle dict-like entities
            data = entity

        # Extract frontend fields from metadata/settings
        metadata = data.get('metadata', {})
        settings = data.get('settings', {})

        # Prepare response data with frontend compatibility
        response_data = {
            **data,
            'visibility': metadata.get('visibility', 'division'),
            'tags': metadata.get('tags', []),
            'target_date': metadata.get('target_date'),
            'default_view': settings.get('default_view', 'board'),
        }

        return cls(**response_data)


class ProjectListResponse(BaseModel):
    """Response model for project list operations."""
    results: list[ProjectSummary] = Field(default_factory=list, description="List of projects")
    total: Optional[int] = Field(None, description="Total count of projects (for pagination)")
    page: Optional[int] = Field(None, description="Current page number")
    per_page: Optional[int] = Field(None, description="Items per page")
    has_next: Optional[bool] = Field(None, description="Whether there are more pages")


class ProjectTaskCounts(BaseModel):
    """Task count summary for project detail responses."""
    model_config = ConfigDict(populate_by_name=True)

    todo: int = 0
    in_progress: int = Field(default=0, alias="in_progress")
    review: int = 0
    done: int = 0


class ProjectDetailEnvelope(BaseModel):
    """Detailed project response envelope matching frontend expectations."""
    model_config = ConfigDict(populate_by_name=True)

    project: ProjectResponse
    members: List[ProjectMember] = Field(default_factory=list)
    task_counts: ProjectTaskCounts = Field(default_factory=ProjectTaskCounts, alias="taskCounts")

    @classmethod
    def from_project(
        cls,
        project: ProjectDetails,
        *,
        members: Optional[List[ProjectMember]] = None,
        task_counts: Optional[Dict[str, int]] = None,
    ) -> ProjectDetailEnvelope:
        counts = ProjectTaskCounts(**(task_counts or {}))
        return cls(
            project=ProjectResponse.from_entity(project),
            members=members or [],
            task_counts=counts,
        )


class ProjectSearchRequest(BaseModel):
    """Request model for project search operations."""
    query: Optional[str] = Field(None, min_length=1, max_length=255, description="Search query")
    status: Optional[ProjectStatus] = Field(None, description="Filter by status")
    priority: Optional[ProjectPriority] = Field(None, description="Filter by priority")
    org_id: Optional[str] = Field(None, alias="orgId", description="Filter by organization")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Filter by division")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default="updated_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")


class ProjectMember(BaseModel):
    """Project member information."""
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., alias="userId", description="User ID")
    role: ProjectMemberRole = Field(..., description="Member role")
    invited_at: Optional[datetime] = Field(None, alias="invitedAt", description="Invitation timestamp")
    joined_at: Optional[datetime] = Field(None, alias="joinedAt", description="Join timestamp")


class ProjectMemberAddRequest(BaseModel):
    """Request model for adding a member to a project."""
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(..., min_length=1, description="User ID to add as member")
    role: ProjectMemberRole = Field(..., description="Role to assign to the member")

    @validator('user_id')
    def validate_user_id(cls, v):
        if not v or not v.strip():
            raise ValueError('User ID cannot be empty')
        return v.strip()


class ProjectMemberUpdateRequest(BaseModel):
    """Request model for updating a project member's role."""
    model_config = ConfigDict(populate_by_name=True)

    role: ProjectMemberRole = Field(..., description="New role for the member")


class WorkspaceView(BaseModel):
    """Workspace view configuration."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="View identifier")
    type: ViewType = Field(..., description="View type")
    name: str = Field(..., min_length=1, max_length=255, description="View name")
    is_default: bool = Field(default=False, alias="isDefault", description="Whether this is the default view")
    settings: Dict[str, Any] = Field(default_factory=dict, description="View-specific settings")
    created_by: Optional[str] = Field(None, alias="createdBy", description="Creator user ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt", description="Last update timestamp")


class WorkspaceViewCreateRequest(BaseModel):
    """Request model for creating workspace views."""
    model_config = ConfigDict(populate_by_name=True)

    type: ViewType = Field(..., description="View type")
    name: str = Field(..., min_length=1, max_length=255, description="View name")
    is_default: bool = Field(default=False, alias="isDefault", description="Whether this is the default view")
    settings: Dict[str, Any] = Field(default_factory=dict, description="View-specific settings")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('View name cannot be empty')
        return v.strip()


class WorkspaceViewUpdateRequest(BaseModel):
    """Request model for updating workspace views."""
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated view name")
    is_default: Optional[bool] = Field(None, alias="isDefault", description="Updated default status")
    settings: Optional[Dict[str, Any]] = Field(None, description="Updated view settings")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('View name cannot be empty')
        return v.strip() if v else v


class ProjectCapabilities(BaseModel):
    """Project capabilities for the current user."""
    can_manage_project: bool = Field(default=False, alias="canManageProject", description="Can manage project settings")
    can_manage_views: bool = Field(default=False, alias="canManageViews", description="Can manage workspace views")
    can_manage_members: bool = Field(default=False, alias="canManageMembers", description="Can manage project members")
    can_create_tasks: bool = Field(default=False, alias="canCreateTasks", description="Can create tasks")
    can_delete_project: bool = Field(default=False, alias="canDeleteProject", description="Can delete project")


class ProjectFeatureFlags(BaseModel):
    """Project-specific feature flags."""
    project_workspace: bool = Field(default=True, alias="projectWorkspace", description="Project workspace feature enabled")
    project_sidebar: bool = Field(default=False, alias="projectSidebar", description="Project sidebar feature enabled")
    advanced_views: bool = Field(default=False, alias="advancedViews", description="Advanced views feature enabled")
    real_time_collaboration: bool = Field(default=True, alias="realTimeCollaboration", description="Real-time collaboration enabled")


class ProjectWorkspaceSnapshot(BaseModel):
    """Complete project workspace snapshot for UI initialization."""
    model_config = ConfigDict(populate_by_name=True)

    project: ProjectDetails = Field(..., description="Project details")
    members: List[ProjectMember] = Field(default_factory=list, description="Project members")
    views: List[WorkspaceView] = Field(default_factory=list, description="Available workspace views")
    capabilities: ProjectCapabilities = Field(..., description="User capabilities for this project")
    feature_flags: ProjectFeatureFlags = Field(..., description="Project feature flags")
    active_view_id: Optional[str] = Field(None, alias="activeViewId", description="Currently active view ID")


class WorkspaceViewsList(BaseModel):
    """Response model for workspace views list."""
    views: List[WorkspaceView] = Field(default_factory=list, description="List of workspace views")
    total: int = Field(..., description="Total number of views")
    default_view_id: Optional[str] = Field(None, alias="defaultViewId", description="Default view ID")


# Legacy compatibility aliases
Project = ProjectDetails
