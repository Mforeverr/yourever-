"""Pydantic schemas for shortlink resolution."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ShortlinkType(str, Enum):
    """Supported shortlink entity types."""

    PROJECT = "project"
    TASK = "task"
    CHANNEL = "channel"


class ShortlinkResolution(BaseModel):
    """Response payload containing the canonical workspace URL."""

    model_config = ConfigDict(populate_by_name=True)

    scoped_url: str = Field(..., alias="scopedUrl")
