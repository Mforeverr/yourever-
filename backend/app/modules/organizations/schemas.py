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


class DivisionCreate(BaseModel):
    """Payload for creating a single division during organization creation."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=100)
    key: Optional[str] = Field(default=None, alias="divisionKey", min_length=1, max_length=63)
    description: Optional[str] = Field(default=None, max_length=500)


class DivisionCreateRequest(BaseModel):
    """Request payload for creating multiple divisions."""

    divisions: List[DivisionCreate] = Field(..., min_items=1, max_items=10)


class OrganizationCreate(BaseModel):
    """Payload submitted when creating a new organization."""

    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    division_name: str = Field(default=None, alias="divisionName")
    division_key: Optional[str] = Field(default=None, alias="divisionKey")
    divisions: Optional[List[DivisionCreate]] = None
    template_id: Optional[str] = Field(default=None, alias="templateId")
    invitations: Optional[List[InvitationCreatePayload]] = None

    def get_divisions_to_create(self) -> List[DivisionCreate]:
        """Get the list of divisions to create, handling backward compatibility."""
        if self.divisions:
            return self.divisions

        # Backward compatibility: if no divisions array, use single division fields
        if self.division_name:
            return [DivisionCreate(
                name=self.division_name,
                key=self.division_key,
                description=None
            )]

        raise ValueError("Either 'divisions' array or 'division_name' must be provided")


class WorkspaceCreationResponse(BaseModel):
    """Response envelope returned when creating a workspace."""

    model_config = ConfigDict(populate_by_name=True)

    organization: OrganizationResponse
    user_role: str = Field(alias="userRole")
    template_applied: Optional[str] = Field(default=None, alias="templateApplied")
    active_invitations: List[InvitationResponse] = Field(
        default_factory=list, alias="activeInvitations"
    )
    skipped_invites: List[str] = Field(
        default_factory=list, alias="skippedInvites"
    )


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
    token_hash: Optional[str] = Field(default=None, alias="tokenHash")
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


class HubInvitation(InvitationResponse):
    """Hub-specific invitation view with hashed token metadata."""

    pass


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

    model_config = ConfigDict(populate_by_name=True)

    slug: str
    is_available: bool = Field(alias="isAvailable")
    suggestions: List[str] = Field(default_factory=list)


class HubOrganization(OrganizationResponse):
    """Hub representation of an organization with optional analytics fields."""

    industry: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    member_count: Optional[int] = Field(default=None, alias="memberCount")
    active_projects: Optional[int] = Field(default=None, alias="activeProjects")
    last_active_at: Optional[datetime] = Field(default=None, alias="lastActiveAt")
    tags: Optional[List[str]] = None
    accent_color: Optional[str] = Field(default=None, alias="accentColor")


class HubStats(BaseModel):
    """Metrics describing hub readiness."""

    total_organizations: int = Field(alias="totalOrganizations")
    pending_invitations: int = Field(alias="pendingInvitations")
    last_updated_at: datetime = Field(alias="lastUpdatedAt")


class HubOverview(BaseModel):
    """Aggregated payload returned to the workspace hub."""

    organizations: List[HubOrganization] = Field(default_factory=list)
    invitations: List[HubInvitation] = Field(default_factory=list)
    stats: HubStats


class InvitationActionRequest(BaseModel):
    """Payload for accepting or declining an invitation from the hub."""

    invitation_id: str = Field(..., alias="invitationId", min_length=1)
