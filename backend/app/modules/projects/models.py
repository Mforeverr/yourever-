# Author: Eldrie (CTO Dev)
# Date: 2025-10-22
# Role: Backend

"""
SQLAlchemy models for projects domain with comprehensive schema support.

This module defines the complete database model for projects with all required fields
to support the frontend expectations and proper multi-tenant data isolation.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String, Boolean, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from ...db.base import Base


class ProjectModel(Base):
    """
    Complete project model matching the database schema.

    This model represents the canonical project entity with all required fields
    for proper project management, workspace functionality, and multi-tenant
    data isolation.
    """
    __tablename__ = "projects"

    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())

    # Organization and division scoping for multi-tenant isolation
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    division_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Basic project information
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="active", index=True)
    priority = Column(Text, nullable=False, default="medium", index=True)

    # Ownership and metadata (skip metadata field to avoid reserved word conflict)
    owner_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    # Note: metadata field skipped due to SQLAlchemy reserved word conflict
    # Can be accessed via direct SQL if needed
    settings = Column(JSON, nullable=False, default={})

    # Template functionality
    is_template = Column(Boolean, nullable=False, default=False, index=True)
    template_source = Column(Text, nullable=True)

    # Soft delete support
    archived_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Audit timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now(), index=True)

    def __repr__(self) -> str:
        return f"<ProjectModel(id={self.id}, name='{self.name}', org_id={self.org_id}, status='{self.status}')>"

    @property
    def is_active(self) -> bool:
        """Check if project is active (not archived)."""
        return self.archived_at is None and self.status == "active"

    @property
    def is_archived(self) -> bool:
        """Check if project is archived."""
        return self.archived_at is not None


class ProjectMemberModel(Base):
    """Model for project membership tracking."""
    __tablename__ = "project_members"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    role = Column(String, nullable=False, default="member")
    invited_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    joined_at = Column(DateTime(timezone=True), nullable=True)
    invited_by = Column(UUID(as_uuid=True), nullable=True)
    permissions = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationship to project
    project = relationship("ProjectModel", backref="members")


class ProjectWorkspaceViewModel(Base):
    """Model for project workspace views."""
    __tablename__ = "project_workspace_views"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    view_type = Column(String, nullable=False)  # Using 'view_type' instead of 'type' to avoid conflicts
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=True)  # Using 'config' instead of 'settings'
    filter_config = Column(JSON, nullable=True)
    sort_config = Column(JSON, nullable=True)
    layout_config = Column(JSON, nullable=True)
    is_default = Column(Boolean, nullable=True, default=False)
    is_public = Column(Boolean, nullable=True, default=True)
    is_active = Column(Boolean, nullable=True, default=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship to project
    project = relationship("ProjectModel", backref="workspace_views")
