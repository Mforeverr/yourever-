"""
Pydantic schemas for organization management.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime

from pydantic import BaseModel, Field, EmailStr, ConfigDict


class OrganizationCreate(BaseModel):
    """Schema for creating a new organization."""
    name: str = Field(..., min_length=1, max_length=255, description="Organization name")
    slug: Optional[str] = Field(None, max_length=100, description="URL-friendly slug (optional)")
    description: Optional[str] = Field(None, max_length=500, description="Organization description")
    division_name: str = Field(..., min_length=1, max_length=255, description="Primary division name")
    division_key: Optional[str] = Field(None, max_length=100, description="Division key")
    template_id: Optional[str] = Field(None, description="Template ID to apply")


class DivisionResponse(BaseModel):
    """Schema for division response data."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    key: Optional[str]
    description: Optional[str]
    org_id: str
    created_at: datetime
    user_role: Optional[str] = None


class OrganizationResponse(BaseModel):
    """Schema for organization response data."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: Optional[str]
    logo_url: Optional[str]
    created_at: datetime
    divisions: List[DivisionResponse]
    user_role: str


class OrganizationUpdate(BaseModel):
    """Schema for updating organization details."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[str] = None


class InvitationResponse(BaseModel):
    """Schema for invitation response data."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    org_name: Optional[str]
    division_name: Optional[str]
    role: str
    message: Optional[str]
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    inviter_name: Optional[str]


class InvitationAccept(BaseModel):
    """Schema for accepting an invitation."""
    token: str = Field(..., description="Invitation token")


class SlugAvailability(BaseModel):
    """Schema for slug availability check."""
    slug: str = Field(..., max_length=100)
    is_available: bool
    suggestions: List[str] = Field(default_factory=list)


class OrganizationSettings(BaseModel):
    """Schema for organization settings."""
    default_tools: Dict[str, Any] = Field(default_factory=dict)
    invitation_token: Optional[str] = None
    onboarding_complete: bool = False


class TemplateResponse(BaseModel):
    """Schema for template response data."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str]
    category: Optional[str]
    tools: Dict[str, Any] = Field(default_factory=dict)
    functions: Dict[str, Any] = Field(default_factory=dict)
    intents: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_at: datetime


class WorkspaceCreationResult(BaseModel):
    """Schema for workspace creation result."""
    organization: OrganizationResponse
    user_role: str
    template_applied: Optional[str] = None
    active_invitations: List[InvitationResponse] = Field(default_factory=list)