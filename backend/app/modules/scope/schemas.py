"""Pydantic contracts for scope queries and mutations."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..users.schemas import WorkspaceOrganization


class ScopeContext(BaseModel):
    """Represents the active organization/division scope for a user."""

    model_config = ConfigDict(populate_by_name=True)

    orgId: str
    divisionId: Optional[str] = None
    role: Optional[str] = None
    divisionRole: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    lastUpdatedAt: Optional[datetime] = None


class ScopeState(BaseModel):
    """Response payload describing scope availability and the current selection."""

    userId: str
    organizations: List[WorkspaceOrganization] = Field(default_factory=list)
    active: Optional[ScopeContext] = None
    rememberedAt: Optional[datetime] = None
    cachedAt: Optional[datetime] = None


class ScopeUpdateRequest(BaseModel):
    """Request body for updating the active scope."""

    orgId: str
    divisionId: Optional[str] = None
    reason: str = Field(default="manual-selection")


class ScopeUpdateResponse(ScopeState):
    """Alias for responses returned after an update operation."""

    pass
