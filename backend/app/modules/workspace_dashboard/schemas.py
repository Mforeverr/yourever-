"""Pydantic schemas for workspace dashboard payloads."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, validator

from ..workspace.schemas import (
    WorkspaceActivity,
    WorkspaceDoc,
    WorkspaceProject,
)


class DashboardKpi(BaseModel):
    """Key performance indicator surfaced on the dashboard."""

    id: Literal["onTrack", "stuck", "overdue"]
    label: str
    count: int = Field(ge=0)
    delta: float | None = None
    delta_direction: Literal["up", "down", "flat"] = Field(default="flat", alias="deltaDirection")

    model_config = ConfigDict(populate_by_name=True)


class DashboardPresenceMember(BaseModel):
    """Lightweight presence information for organization teammates."""

    id: str
    name: str
    avatar: Optional[str] = None
    role: Optional[str] = None
    status: Optional[Literal["online", "away", "offline"]] = None


class DashboardSummary(BaseModel):
    """Aggregate payload returned to the dashboard page."""

    org_id: str = Field(alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    generated_at: datetime = Field(alias="generatedAt")
    kpis: list[DashboardKpi]
    projects: list[WorkspaceProject]
    docs: list[WorkspaceDoc]
    activity: list[WorkspaceActivity]
    presence: list[DashboardPresenceMember]
    has_templates: bool = Field(alias="hasTemplates")

    model_config = ConfigDict(populate_by_name=True)


class DashboardWidgetType(BaseModel):
    """Represents a dashboard widget type configuration."""

    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    default_config: dict = Field(default_factory=dict)
    required_permissions: list[str] = Field(default_factory=list)


class DashboardWidget(BaseModel):
    """Base dashboard widget entity."""

    id: str
    org_id: str = Field(alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    widget_type: str = Field(alias="widgetType")
    title: str
    description: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position: Optional[dict] = None
    is_active: bool = Field(default=True, alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: Optional[str] = Field(default=None, alias="createdBy")

    model_config = ConfigDict(populate_by_name=True)


class DashboardWidgetCreateRequest(BaseModel):
    """Request schema for creating a dashboard widget."""

    widget_type: str = Field(alias="widgetType")
    title: str
    description: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position: Optional[dict] = None

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

    @validator('widget_type')
    def validate_widget_type(cls, v):
        if not v or not v.strip():
            raise ValueError('Widget type cannot be empty')
        return v.strip()

    model_config = ConfigDict(populate_by_name=True)


class DashboardWidgetResponse(BaseModel):
    """Response schema for dashboard widget data."""

    id: str
    org_id: str = Field(alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    widget_type: str = Field(alias="widgetType")
    title: str
    description: Optional[str] = None
    config: dict = Field(default_factory=dict)
    position: Optional[dict] = None
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    created_by: Optional[str] = Field(default=None, alias="createdBy")

    @classmethod
    def from_entity(cls, widget: DashboardWidget) -> "DashboardWidgetResponse":
        """Create a response schema from a widget entity."""
        return cls(
            id=widget.id,
            orgId=widget.org_id,
            divisionId=widget.division_id,
            widgetType=widget.widget_type,
            title=widget.title,
            description=widget.description,
            config=widget.config,
            position=widget.position,
            isActive=widget.is_active,
            createdAt=widget.created_at,
            updatedAt=widget.updated_at,
            createdBy=widget.created_by,
        )

    model_config = ConfigDict(populate_by_name=True)


class DashboardUpdateRequest(BaseModel):
    """Request schema for updating a dashboard."""

    title: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[dict] = None
    widgets: Optional[list[dict]] = None

    @validator('title')
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Title cannot be empty if provided')
        return v.strip() if v else None

    model_config = ConfigDict(populate_by_name=True)
