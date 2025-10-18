"""Pydantic schemas for the authentication façade endpoints."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..users.schemas import WorkspaceUser


class AuthSessionMetadata(BaseModel):
    """Metadata describing the current Supabase-backed session."""

    model_config = ConfigDict(populate_by_name=True)

    userId: str
    sessionId: Optional[str] = None
    issuedAt: Optional[datetime] = None
    expiresAt: Optional[datetime] = None
    provider: str = Field(default="supabase")
    audience: Optional[str] = None
    roles: list[str] = Field(default_factory=list)
    claims: Dict[str, Any] = Field(default_factory=dict)


class AuthSessionSnapshot(BaseModel):
    """Full payload returned to frontend consumers."""

    user: Optional[WorkspaceUser] = None
    session: AuthSessionMetadata
    featureFlags: Dict[str, bool] = Field(default_factory=dict)


class AuthLogoutResponse(BaseModel):
    """Structure returned after a logout is registered."""

    success: bool = True


class AuthRefreshResponse(AuthSessionSnapshot):
    """Response emitted after a refresh request."""

    pass

