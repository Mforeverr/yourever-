"""Pydantic schemas for organizations and invitation flows."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizationDivision(BaseModel):
    """Division belonging to an organization for API responses."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    key: Optional[str] = None
    description: Optional[str] = None
    org_id: str = Field(validation_alias="orgId")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    user_role: Optional[str] = Field(default=None, alias="userRole")


class DivisionResponse(OrganizationDivision):
    """Alias schema used by the repository layer."""

    pass


class OrganizationSummary(BaseModel):
    """Summary representation of an organization."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = Field(default=None, alias="logoUrl")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    divisions: List[OrganizationDivision]
    user_role: Optional[str] = Field(default=None, alias="userRole")


class OrganizationResponse(OrganizationSummary):
    """Detailed organization payload returned after mutations."""

    pass


class OrganizationCreate(BaseModel):
    """Payload submitted when creating a new organization."""

    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    division_name: str = Field(alias="divisionName")
    division_key: Optional[str] = Field(default=None, alias="divisionKey")
    template_id: Optional[str] = Field(default=None, alias="templateId")


class InvitationResponse(BaseModel):
    """Represents an invitation row."""

    id: str
    email: EmailStr
    org_id: Optional[str] = Field(default=None, alias="orgId")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    role: str
    message: Optional[str] = None
    status: str
    token: Optional[str] = None
    inviter_id: Optional[str] = Field(default=None, alias="inviterId")
    inviter_name: Optional[str] = Field(default=None, alias="inviterName")
    org_name: Optional[str] = Field(default=None, alias="orgName")
    division_name: Optional[str] = Field(default=None, alias="divisionName")
    created_at: datetime = Field(alias="createdAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
    expires_at: Optional[datetime] = Field(default=None, alias="expiresAt")
    accepted_at: Optional[datetime] = Field(default=None, alias="acceptedAt")
    declined_at: Optional[datetime] = Field(default=None, alias="declinedAt")


class InvitationListResponse(BaseModel):
    """Envelope for returning pending invitations."""

    invitations: List[InvitationResponse]


class InvitationCreatePayload(BaseModel):
    """Single invitation request."""

    email: EmailStr
    role: str = Field(default="member")
    division_id: Optional[str] = Field(default=None, alias="divisionId")
    message: Optional[str] = None
    expires_at: Optional[datetime] = Field(default=None, alias="expiresAt")


class InvitationBatchCreateRequest(BaseModel):
    """Batch invitation request body."""

    invitations: List[InvitationCreatePayload]


class InvitationBatchCreateResponse(BaseModel):
    """Response for batch creation of invitations."""

    invitations: List[InvitationResponse]
    skipped: List[str] = Field(default_factory=list, description="Emails that were skipped due to existing pending invites")


class TemplateResponse(BaseModel):
    """Workspace template definition."""

    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    tools: dict = Field(default_factory=dict)
    functions: dict = Field(default_factory=dict)
    intents: dict = Field(default_factory=dict)
    is_active: bool = Field(alias="isActive")
    created_at: datetime = Field(alias="createdAt")


class SlugAvailability(BaseModel):
    """Slug availability result with optional suggestions."""

    slug: str
    is_available: bool = Field(alias="isAvailable")
    suggestions: List[str] = Field(default_factory=list)
