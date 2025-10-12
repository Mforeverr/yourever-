# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Pydantic schemas for the projects module.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProjectSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Stable project identifier")
    name: str
    status: str = Field(default="active")
    org_id: Optional[str] = Field(default=None, alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

class ProjectListResponse(BaseModel):
    results: list[ProjectSummary]
