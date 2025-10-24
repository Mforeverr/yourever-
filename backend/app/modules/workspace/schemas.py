"""Pydantic schemas for workspace data."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkspaceProject(BaseModel):
    """Lightweight project summary for workspace sidebar."""

    id: Union[str, UUID]
    org_id: Union[str, UUID] = Field(alias="orgId")
    division_id: Optional[Union[str, UUID]] = Field(default=None, alias="divisionId")
    name: str
    description: Optional[str] = None
    badge_count: int = Field(default=0, alias="badgeCount")
    dot_color: str = Field(default="bg-blue-500", alias="dotColor")
    status: str = "active"
    default_view: str = Field(default="board", alias="defaultView")
    is_template: bool = Field(default=False, alias="isTemplate")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("id", mode="before")
    @classmethod
    def _coerce_id(cls, value: object) -> str:
        return str(value) if value is not None else ""

    @field_validator("org_id", mode="before")
    @classmethod
    def _coerce_org_id(cls, value: object) -> str:
        return str(value) if value is not None else ""

    @field_validator("division_id", mode="before")
    @classmethod
    def _coerce_division_id(cls, value: object) -> Optional[str]:
        return str(value) if value is not None else None


class WorkspaceTask(BaseModel):
    """Sidebar task summary."""

    id: Union[str, UUID]
    org_id: Union[str, UUID] = Field(alias="orgId")
    division_id: Optional[Union[str, UUID]] = Field(default=None, alias="divisionId")
    project_id: Optional[Union[str, UUID]] = Field(default=None, alias="projectId")
    name: str
    priority: Literal["Low", "Medium", "High", "Urgent"]
    badge_variant: Literal["secondary", "destructive"] = Field(alias="badgeVariant")
    dot_color: str = Field(default="bg-blue-500", alias="dotColor")
    is_template: bool = Field(default=False, alias="isTemplate")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("id", "org_id", "project_id", mode="before")
    @classmethod
    def _coerce_ids(cls, value: object) -> Optional[str]:
        if value is None:
            return None
        return str(value)

    @field_validator("division_id", mode="before")
    @classmethod
    def _coerce_division_id(cls, value: object) -> Optional[str]:
        return str(value) if value is not None else None


class WorkspaceDoc(BaseModel):
    """Workspace documentation link."""

    id: Union[str, UUID]
    org_id: Union[str, UUID] = Field(alias="orgId")
    division_id: Optional[Union[str, UUID]] = Field(default=None, alias="divisionId")
    name: str
    url: Optional[str] = None
    summary: Optional[str] = None
    is_template: bool = Field(default=False, alias="isTemplate")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("id", "org_id", mode="before")
    @classmethod
    def _coerce_ids(cls, value: object) -> str:
        return str(value) if value is not None else ""

    @field_validator("division_id", mode="before")
    @classmethod
    def _coerce_division_id(cls, value: object) -> Optional[str]:
        return str(value) if value is not None else None


class WorkspaceChannel(BaseModel):
    """Channel metadata for sidebar."""

    id: Union[str, UUID]
    org_id: Union[str, UUID] = Field(alias="orgId")
    division_id: Optional[Union[str, UUID]] = Field(default=None, alias="divisionId")
    slug: str
    name: str
    channel_type: Literal["public", "private"] = Field(alias="channelType")
    topic: Optional[str] = None
    description: Optional[str] = None
    member_count: int = Field(default=0, alias="memberCount")
    is_favorite: bool = Field(default=False, alias="isFavorite")
    is_muted: bool = Field(default=False, alias="isMuted")
    unread_count: int = Field(default=0, alias="unreadCount")
    is_template: bool = Field(default=False, alias="isTemplate")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("id", "org_id", mode="before")
    @classmethod
    def _coerce_ids(cls, value: object) -> str:
        return str(value) if value is not None else ""

    @field_validator("division_id", mode="before")
    @classmethod
    def _coerce_division_id(cls, value: object) -> Optional[str]:
        return str(value) if value is not None else None


class WorkspaceActivityAuthor(BaseModel):
    """Author metadata."""

    id: Optional[str]
    name: str
    role: Optional[str] = None
    avatar: Optional[str] = None


class WorkspaceActivity(BaseModel):
    """Activity timeline entry."""

    id: Union[str, UUID]
    org_id: Union[str, UUID] = Field(alias="orgId")
    division_id: Optional[Union[str, UUID]] = Field(default=None, alias="divisionId")
    activity_type: Literal["post", "comment", "like", "share", "file", "link", "status"] = Field(alias="activityType")
    content: str
    metadata: Optional[dict[str, Any]] = None
    occurred_at: datetime = Field(alias="occurredAt")
    is_template: bool = Field(default=False, alias="isTemplate")
    author: WorkspaceActivityAuthor

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("id", "org_id", mode="before")
    @classmethod
    def _coerce_ids(cls, value: object) -> str:
        return str(value) if value is not None else ""

    @field_validator("division_id", mode="before")
    @classmethod
    def _coerce_division_id(cls, value: object) -> Optional[str]:
        return str(value) if value is not None else None


class WorkspaceOverview(BaseModel):
    """Aggregated payload for workspace landing."""

    org_id: str = Field(alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    projects: list[WorkspaceProject]
    tasks: list[WorkspaceTask]
    docs: list[WorkspaceDoc]
    channels: list[WorkspaceChannel]
    has_templates: bool = Field(alias="hasTemplates")

    model_config = ConfigDict(populate_by_name=True)


class ChannelListResponse(BaseModel):
    """Paginated channel list."""

    items: list[WorkspaceChannel]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")

    model_config = ConfigDict(populate_by_name=True)


class ActivityFeedResponse(BaseModel):
    """Activity feed payload."""

    items: list[WorkspaceActivity]
    next_cursor: Optional[str] = Field(default=None, alias="nextCursor")

    model_config = ConfigDict(populate_by_name=True)


class ProjectCreatePayload(BaseModel):
    name: str
    description: Optional[str] = None
    badge_count: int = Field(default=0, alias="badgeCount")
    dot_color: str = Field(default="bg-blue-500", alias="dotColor")
    division_id: Optional[str] = Field(default=None, alias="divisionId")


class ProjectUpdatePayload(ProjectCreatePayload):
    archived_at: Optional[datetime] = Field(default=None, alias="archivedAt")


class ChannelCreatePayload(BaseModel):
    name: str
    slug: str
    channel_type: Literal["public", "private"] = Field(alias="channelType")
    topic: Optional[str] = None
    description: Optional[str] = None
    division_id: Optional[str] = Field(default=None, alias="divisionId")


class ChannelUpdatePayload(ChannelCreatePayload):
    is_favorite: Optional[bool] = Field(default=None, alias="isFavorite")
    is_muted: Optional[bool] = Field(default=None, alias="isMuted")
    archived_at: Optional[datetime] = Field(default=None, alias="archivedAt")
