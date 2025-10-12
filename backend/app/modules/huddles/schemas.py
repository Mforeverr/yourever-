# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Pydantic schemas for huddles.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class HuddleSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: Optional[str] = None
    scheduled_at: datetime = Field(alias="scheduledAt")
    org_id: Optional[str] = Field(default=None, alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    updated_at: datetime = Field(alias="updatedAt")


class HuddleListResponse(BaseModel):
    results: list[HuddleSummary]
