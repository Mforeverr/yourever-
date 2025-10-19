"""Pydantic schemas for shortlink resolution."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ShortlinkType(str, Enum):
    """Supported shortlink entity types."""

    PROJECT = "project"
    TASK = "task"
    CHANNEL = "channel"


class Shortlink(BaseModel):
    """Shortlink entity model."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    short_code: str = Field(..., alias="shortCode")
    entity_type: ShortlinkType = Field(..., alias="entityType")
    entity_id: str = Field(..., alias="entityId")
    org_id: str = Field(..., alias="orgId")
    division_id: Optional[str] = Field(None, alias="divisionId")
    created_by: str = Field(..., alias="createdBy")
    created_at: str = Field(..., alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")
    expires_at: Optional[str] = Field(None, alias="expiresAt")


class ShortlinkCreateRequest(BaseModel):
    """Request payload for creating a shortlink."""

    model_config = ConfigDict(populate_by_name=True)

    entity_type: ShortlinkType = Field(..., alias="entityType")
    entity_id: str = Field(..., alias="entityId")
    expires_at: Optional[str] = Field(None, alias="expiresAt")


class ShortlinkUpdateRequest(BaseModel):
    """Request payload for updating a shortlink."""

    model_config = ConfigDict(populate_by_name=True)

    expires_at: Optional[str] = Field(None, alias="expiresAt")


class ShortlinkResponse(BaseModel):
    """Response payload for a single shortlink."""

    model_config = ConfigDict(populate_by_name=True)

    shortlink: Shortlink


class ShortlinkListResponse(BaseModel):
    """Response payload for a list of shortlinks."""

    model_config = ConfigDict(populate_by_name=True)

    shortlinks: List[Shortlink]
    total: int


class ShortlinkResolution(BaseModel):
    """Response payload containing the canonical workspace URL."""

    model_config = ConfigDict(populate_by_name=True)

    scoped_url: str = Field(..., alias="scopedUrl")
