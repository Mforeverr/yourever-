"""Pydantic schemas for workspace dashboard payloads."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

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
