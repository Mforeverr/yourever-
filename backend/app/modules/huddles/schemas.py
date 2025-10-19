# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Pydantic schemas for huddles with comprehensive scope validation.

This module defines the data models for huddle management operations with
proper validation, serialization, and security considerations.
"""

from datetime import datetime
from typing import Optional, Any, Dict, List
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, validator


class HuddleStatus(str, Enum):
    """Huddle status enumeration for type safety."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HuddleType(str, Enum):
    """Huddle type enumeration for categorization."""
    MEETING = "meeting"
    STANDUP = "standup"
    RETROSPECTIVE = "retrospective"
    PLANNING = "planning"
    REVIEW = "review"
    OTHER = "other"


class HuddleSummary(BaseModel):
    """Lightweight huddle summary for list views and references."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Stable huddle identifier")
    title: str = Field(..., min_length=1, max_length=255, description="Huddle title")
    description: Optional[str] = Field(None, max_length=1000, description="Huddle description")
    status: HuddleStatus = Field(default=HuddleStatus.SCHEDULED, description="Current huddle status")
    huddle_type: HuddleType = Field(default=HuddleType.MEETING, alias="huddleType", description="Type of huddle")
    scheduled_at: datetime = Field(alias="scheduledAt", description="Scheduled start time")
    duration_minutes: Optional[int] = Field(default=60, description="Duration in minutes")
    org_id: Optional[str] = Field(default=None, alias="orgId", description="Organization ID")
    division_id: Optional[str] = Field(default=None, alias="divisionId", description="Division ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt", description="Last update timestamp")

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Huddle title cannot be empty')
        return v.strip()

    @validator('duration_minutes')
    def validate_duration(cls, v):
        if v is not None and (v <= 0 or v > 480):  # Max 8 hours
            raise ValueError('Duration must be between 1 and 480 minutes')
        return v


class HuddleDetails(HuddleSummary):
    """Complete huddle details with additional metadata."""
    owner_id: Optional[str] = Field(default=None, alias="ownerId", description="Huddle organizer ID")
    attendee_ids: List[str] = Field(default_factory=list, alias="attendeeIds", description="List of attendee IDs")
    meeting_url: Optional[str] = Field(None, alias="meetingUrl", description="Video conference URL")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")
    agenda: Optional[str] = Field(None, max_length=2000, description="Meeting agenda")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional huddle metadata")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Huddle-specific settings")


class HuddleCreateRequest(BaseModel):
    """Request model for creating new huddles."""
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(..., min_length=1, max_length=255, description="Huddle title")
    description: Optional[str] = Field(None, max_length=1000, description="Huddle description")
    huddle_type: HuddleType = Field(default=HuddleType.MEETING, alias="huddleType", description="Type of huddle")
    scheduled_at: datetime = Field(alias="scheduledAt", description="Scheduled start time")
    duration_minutes: Optional[int] = Field(default=60, description="Duration in minutes")
    attendee_ids: List[str] = Field(default_factory=list, alias="attendeeIds", description="List of attendee IDs")
    meeting_url: Optional[str] = Field(None, alias="meetingUrl", description="Video conference URL")
    location: Optional[str] = Field(None, max_length=255, description="Physical location")
    agenda: Optional[str] = Field(None, max_length=2000, description="Meeting agenda")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional huddle metadata")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Huddle-specific settings")

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError('Huddle title cannot be empty')
        return v.strip()

    @validator('duration_minutes')
    def validate_duration(cls, v):
        if v is not None and (v <= 0 or v > 480):  # Max 8 hours
            raise ValueError('Duration must be between 1 and 480 minutes')
        return v

    @validator('scheduled_at')
    def validate_scheduled_time(cls, v):
        if v <= datetime.utcnow():
            raise ValueError('Scheduled time must be in the future')
        return v


class HuddleUpdateRequest(BaseModel):
    """Request model for updating existing huddles."""
    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Updated huddle title")
    description: Optional[str] = Field(None, max_length=1000, description="Updated huddle description")
    status: Optional[HuddleStatus] = Field(None, description="Updated huddle status")
    huddle_type: Optional[HuddleType] = Field(None, alias="huddleType", description="Updated huddle type")
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt", description="Updated scheduled start time")
    duration_minutes: Optional[int] = Field(None, description="Updated duration in minutes")
    attendee_ids: Optional[List[str]] = Field(None, alias="attendeeIds", description="Updated list of attendee IDs")
    meeting_url: Optional[str] = Field(None, alias="meetingUrl", description="Updated video conference URL")
    location: Optional[str] = Field(None, max_length=255, description="Updated physical location")
    agenda: Optional[str] = Field(None, max_length=2000, description="Updated meeting agenda")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Updated huddle metadata")
    settings: Optional[Dict[str, Any]] = Field(None, description="Updated huddle settings")

    @validator('title')
    def validate_title(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Huddle title cannot be empty')
        return v.strip() if v else v

    @validator('duration_minutes')
    def validate_duration(cls, v):
        if v is not None and (v <= 0 or v > 480):  # Max 8 hours
            raise ValueError('Duration must be between 1 and 480 minutes')
        return v

    @validator('scheduled_at')
    def validate_scheduled_time(cls, v):
        if v is not None and v <= datetime.utcnow():
            raise ValueError('Scheduled time must be in the future')
        return v


class HuddleResponse(BaseModel):
    """Response model for huddle operations with complete details."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(..., description="Huddle identifier")
    title: str = Field(..., description="Huddle title")
    description: Optional[str] = Field(None, description="Huddle description")
    status: HuddleStatus = Field(..., description="Huddle status")
    huddle_type: HuddleType = Field(..., alias="huddleType", description="Huddle type")
    scheduled_at: datetime = Field(..., alias="scheduledAt", description="Scheduled start time")
    duration_minutes: Optional[int] = Field(None, description="Duration in minutes")
    org_id: Optional[str] = Field(None, alias="orgId", description="Organization ID")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Division ID")
    owner_id: Optional[str] = Field(None, alias="ownerId", description="Huddle organizer ID")
    attendee_ids: List[str] = Field(default_factory=list, alias="attendeeIds", description="List of attendee IDs")
    meeting_url: Optional[str] = Field(None, alias="meetingUrl", description="Video conference URL")
    location: Optional[str] = Field(None, description="Physical location")
    agenda: Optional[str] = Field(None, description="Meeting agenda")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Huddle metadata")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Huddle settings")
    created_at: datetime = Field(..., alias="createdAt", description="Creation timestamp")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update timestamp")

    @classmethod
    def from_entity(cls, entity: Any) -> "HuddleResponse":
        """Create response from a huddle entity (for future ORM integration)."""
        if hasattr(entity, 'dict'):
            return cls(**entity.dict())
        elif hasattr(entity, '__dict__'):
            return cls(**entity.__dict__)
        else:
            # Handle dict-like entities
            return cls(**entity)


class HuddleListResponse(BaseModel):
    """Response model for huddle list operations."""
    results: list[HuddleSummary] = Field(default_factory=list, description="List of huddles")
    total: Optional[int] = Field(None, description="Total count of huddles (for pagination)")
    page: Optional[int] = Field(None, description="Current page number")
    per_page: Optional[int] = Field(None, description="Items per page")
    has_next: Optional[bool] = Field(None, description="Whether there are more pages")


class HuddleSearchRequest(BaseModel):
    """Request model for huddle search operations."""
    query: Optional[str] = Field(None, min_length=1, max_length=255, description="Search query")
    status: Optional[HuddleStatus] = Field(None, description="Filter by status")
    huddle_type: Optional[HuddleType] = Field(None, alias="huddleType", description="Filter by huddle type")
    org_id: Optional[str] = Field(None, alias="orgId", description="Filter by organization")
    division_id: Optional[str] = Field(None, alias="divisionId", description="Filter by division")
    date_from: Optional[datetime] = Field(None, alias="dateFrom", description="Filter by start date")
    date_to: Optional[datetime] = Field(None, alias="dateTo", description="Filter by end date")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default="scheduled_at", description="Sort field")
    sort_order: Optional[str] = Field(default="asc", pattern="^(asc|desc)$", description="Sort order")


# Legacy compatibility aliases
Huddle = HuddleDetails
