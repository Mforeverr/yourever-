# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Pydantic schemas for the projects module with comprehensive scope validation.

This module defines the data models for project management operations with
proper validation, serialization, and security considerations.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, validator


class ProjectStatus(str, Enum):
    """Project status enumeration for type safety."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    PENDING = "pending"


class ProjectPriority(str, Enum):
    """Project priority enumeration for task management."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


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


class ProjectCreateRequest(BaseModel):
    """Request model for creating new projects."""
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=1000, description="Project description")
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, description="Initial project status")
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM, description="Project priority")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional project metadata")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Project-specific settings")

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

    @classmethod
    def from_entity(cls, entity: Any) -> "ProjectResponse":
        """Create response from a project entity (for future ORM integration)."""
        if hasattr(entity, 'dict'):
            return cls(**entity.dict())
        elif hasattr(entity, '__dict__'):
            return cls(**entity.__dict__)
        else:
            # Handle dict-like entities
            return cls(**entity)


class ProjectListResponse(BaseModel):
    """Response model for project list operations."""
    results: list[ProjectSummary] = Field(default_factory=list, description="List of projects")
    total: Optional[int] = Field(None, description="Total count of projects (for pagination)")
    page: Optional[int] = Field(None, description="Current page number")
    per_page: Optional[int] = Field(None, description="Items per page")
    has_next: Optional[bool] = Field(None, description="Whether there are more pages")


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


# Legacy compatibility aliases
Project = ProjectDetails
