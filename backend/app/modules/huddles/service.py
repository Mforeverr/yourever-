# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Huddle service with comprehensive scope validation and security.

This service implements secure huddle management operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access.
"""

from datetime import datetime
from typing import Optional, List
import uuid

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from .repository import HuddleRepository
from .schemas import (
    HuddleSummary,
    HuddleDetails,
    HuddleCreateRequest,
    HuddleUpdateRequest,
    HuddleResponse
)


class HuddleService(ScopedService):
    """
    Encapsulates secure huddle domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all huddle operations respect organization
    and division boundaries.
    """

    def __init__(self, repository: HuddleRepository) -> None:
        super().__init__()
        self._repository = repository

    # Legacy method for backward compatibility
    async def list_upcoming(self, principal: CurrentPrincipal) -> list[HuddleSummary]:
        """
        Legacy method - returns all upcoming huddles the principal can access.

        DEPRECATED: Use scoped methods instead for better security.
        """
        return await self._repository.list_upcoming(principal)

    # Organization-scoped methods
    async def list_huddles_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str
    ) -> List[HuddleSummary]:
        """
        List all huddles within a specific organization.

        This method validates that the principal has access to the specified
        organization before returning huddles, preventing cross-organization
        data access.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:read"}
        )

        return await self._repository.list_for_organization(organization_id)

    async def list_upcoming_huddles_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str
    ) -> List[HuddleSummary]:
        """
        List upcoming huddles within a specific organization.

        This method validates organization access and returns only
        huddles that are scheduled for the future.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:read"}
        )

        return await self._repository.list_upcoming_for_organization(organization_id)

    async def create_huddle_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        huddle_request: HuddleCreateRequest
    ) -> HuddleDetails:
        """
        Create a new huddle within a specific organization.

        Validates organization access and associates the huddle with the
        validated organization scope.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:create"}
        )

        huddle_data = {
            "id": str(uuid.uuid4()),
            "title": huddle_request.title,
            "description": huddle_request.description,
            "status": "scheduled",  # Initial status
            "huddle_type": huddle_request.huddle_type,
            "scheduled_at": huddle_request.scheduled_at,
            "duration_minutes": huddle_request.duration_minutes,
            "org_id": organization_id,
            "division_id": None,
            "owner_id": principal.id,
            "attendee_ids": huddle_request.attendee_ids or [],
            "meeting_url": huddle_request.meeting_url,
            "location": huddle_request.location,
            "agenda": huddle_request.agenda,
            "metadata": huddle_request.metadata or {},
            "settings": huddle_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.create(huddle_data)

    async def get_huddle_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        huddle_id: str
    ) -> Optional[HuddleDetails]:
        """
        Get a specific huddle within an organization.

        Validates both organization access and huddle ownership
        within that organization.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:read"}
        )

        huddle = await self._repository.get_by_id(huddle_id)

        # Ensure huddle belongs to the validated organization
        if huddle and huddle.org_id == organization_id:
            return huddle

        return None

    async def update_huddle_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        huddle_id: str,
        huddle_request: HuddleUpdateRequest
    ) -> Optional[HuddleDetails]:
        """
        Update a huddle within an organization.

        Validates organization access and ensures the huddle belongs
        to that organization before updating.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:update"}
        )

        # Verify huddle exists and belongs to organization
        existing_huddle = await self._repository.get_by_id(huddle_id)
        if not existing_huddle or existing_huddle.org_id != organization_id:
            return None

        update_data = {}
        if huddle_request.title is not None:
            update_data["title"] = huddle_request.title
        if huddle_request.description is not None:
            update_data["description"] = huddle_request.description
        if huddle_request.status is not None:
            update_data["status"] = huddle_request.status
        if huddle_request.huddle_type is not None:
            update_data["huddle_type"] = huddle_request.huddle_type
        if huddle_request.scheduled_at is not None:
            update_data["scheduled_at"] = huddle_request.scheduled_at
        if huddle_request.duration_minutes is not None:
            update_data["duration_minutes"] = huddle_request.duration_minutes
        if huddle_request.attendee_ids is not None:
            update_data["attendee_ids"] = huddle_request.attendee_ids
        if huddle_request.meeting_url is not None:
            update_data["meeting_url"] = huddle_request.meeting_url
        if huddle_request.location is not None:
            update_data["location"] = huddle_request.location
        if huddle_request.agenda is not None:
            update_data["agenda"] = huddle_request.agenda
        if huddle_request.metadata is not None:
            update_data["metadata"] = huddle_request.metadata
        if huddle_request.settings is not None:
            update_data["settings"] = huddle_request.settings

        update_data["updated_at"] = datetime.utcnow()

        return await self._repository.update(huddle_id, update_data)

    async def delete_huddle_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        huddle_id: str
    ) -> bool:
        """
        Delete a huddle within an organization.

        Validates organization access and ensures the huddle belongs
        to that organization before deletion.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"huddle:delete"}
        )

        # Verify huddle exists and belongs to organization
        existing_huddle = await self._repository.get_by_id(huddle_id)
        if not existing_huddle or existing_huddle.org_id != organization_id:
            return False

        return await self._repository.delete(huddle_id)

    # Division-scoped methods
    async def list_huddles_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str
    ) -> List[HuddleSummary]:
        """
        List all huddles within a specific division.

        This method validates both organization and division access before
        returning huddles, preventing cross-division data access.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:read"}
        )

        return await self._repository.list_for_division(organization_id, division_id)

    async def list_upcoming_huddles_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str
    ) -> List[HuddleSummary]:
        """
        List upcoming huddles within a specific division.

        This method validates division access and returns only
        huddles that are scheduled for the future.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:read"}
        )

        return await self._repository.list_upcoming_for_division(organization_id, division_id)

    async def create_huddle_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        huddle_request: HuddleCreateRequest
    ) -> HuddleDetails:
        """
        Create a new huddle within a specific division.

        Validates division access and associates the huddle with the
        validated division scope.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:create"}
        )

        huddle_data = {
            "id": str(uuid.uuid4()),
            "title": huddle_request.title,
            "description": huddle_request.description,
            "status": "scheduled",  # Initial status
            "huddle_type": huddle_request.huddle_type,
            "scheduled_at": huddle_request.scheduled_at,
            "duration_minutes": huddle_request.duration_minutes,
            "org_id": organization_id,
            "division_id": division_id,
            "owner_id": principal.id,
            "attendee_ids": huddle_request.attendee_ids or [],
            "meeting_url": huddle_request.meeting_url,
            "location": huddle_request.location,
            "agenda": huddle_request.agenda,
            "metadata": huddle_request.metadata or {},
            "settings": huddle_request.settings or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return await self._repository.create(huddle_data)

    async def get_huddle_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        huddle_id: str
    ) -> Optional[HuddleDetails]:
        """
        Get a specific huddle within a division.

        Validates both division access and huddle ownership
        within that division.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:read"}
        )

        huddle = await self._repository.get_by_id(huddle_id)

        # Ensure huddle belongs to the validated division
        if (huddle and
            huddle.org_id == organization_id and
            huddle.division_id == division_id):
            return huddle

        return None

    async def update_huddle_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        huddle_id: str,
        huddle_request: HuddleUpdateRequest
    ) -> Optional[HuddleDetails]:
        """
        Update a huddle within a division.

        Validates division access and ensures the huddle belongs
        to that division before updating.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:update"}
        )

        # Verify huddle exists and belongs to division
        existing_huddle = await self._repository.get_by_id(huddle_id)
        if (not existing_huddle or
            existing_huddle.org_id != organization_id or
            existing_huddle.division_id != division_id):
            return None

        update_data = {}
        if huddle_request.title is not None:
            update_data["title"] = huddle_request.title
        if huddle_request.description is not None:
            update_data["description"] = huddle_request.description
        if huddle_request.status is not None:
            update_data["status"] = huddle_request.status
        if huddle_request.huddle_type is not None:
            update_data["huddle_type"] = huddle_request.huddle_type
        if huddle_request.scheduled_at is not None:
            update_data["scheduled_at"] = huddle_request.scheduled_at
        if huddle_request.duration_minutes is not None:
            update_data["duration_minutes"] = huddle_request.duration_minutes
        if huddle_request.attendee_ids is not None:
            update_data["attendee_ids"] = huddle_request.attendee_ids
        if huddle_request.meeting_url is not None:
            update_data["meeting_url"] = huddle_request.meeting_url
        if huddle_request.location is not None:
            update_data["location"] = huddle_request.location
        if huddle_request.agenda is not None:
            update_data["agenda"] = huddle_request.agenda
        if huddle_request.metadata is not None:
            update_data["metadata"] = huddle_request.metadata
        if huddle_request.settings is not None:
            update_data["settings"] = huddle_request.settings

        update_data["updated_at"] = datetime.utcnow()

        return await self._repository.update(huddle_id, update_data)

    async def delete_huddle_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        huddle_id: str
    ) -> bool:
        """
        Delete a huddle within a division.

        Validates division access and ensures the huddle belongs
        to that division before deletion.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"huddle:delete"}
        )

        # Verify huddle exists and belongs to division
        existing_huddle = await self._repository.get_by_id(huddle_id)
        if (not existing_huddle or
            existing_huddle.org_id != organization_id or
            existing_huddle.division_id != division_id):
            return False

        return await self._repository.delete(huddle_id)
