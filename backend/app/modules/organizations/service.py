"""
Service layer for organization management business logic.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .repository import OrganizationRepository
from .schemas import (
    OrganizationCreate,
    OrganizationResponse,
    DivisionResponse,
    InvitationResponse,
    TemplateResponse,
    SlugAvailability,
    WorkspaceCreationResult,
)

logger = logging.getLogger(__name__)


class OrganizationService:
    """Service for managing organizations, divisions, and invitations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = OrganizationRepository(session)

    async def get_user_organizations(self, principal: CurrentPrincipal) -> List[OrganizationResponse]:
        """Get all organizations for the authenticated user."""
        return await self._repository.get_user_organizations(principal.id)

    async def create_organization(
        self,
        principal: CurrentPrincipal,
        create_data: OrganizationCreate
    ) -> WorkspaceCreationResult:
        """Create a new organization for the user."""
        try:
            # Validate template if specified
            template = None
            if create_data.template_id:
                template = await self._repository.get_template(create_data.template_id)
                if not template:
                    raise ValueError(f"Template '{create_data.template_id}' not found")

            # Create organization and primary division
            organization, division = await self._repository.create_organization(
                principal.id,
                create_data
            )

            # Get any pending invitations for the user
            pending_invitations = await self._repository.get_pending_invitations(principal.email)

            logger.info(
                f"Created organization '{organization.name}' for user {principal.id}",
                extra={
                    "org_id": organization.id,
                    "user_id": principal.id,
                    "template_id": create_data.template_id
                }
            )

            return WorkspaceCreationResult(
                organization=organization,
                user_role="owner",
                template_applied=template.id if template else None,
                active_invitations=pending_invitations
            )

        except ValueError as e:
            logger.warning(f"Validation error creating organization: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating organization: {e}")
            raise

    async def check_slug_availability(self, slug: str) -> SlugAvailability:
        """Check if a slug is available and provide suggestions if not."""
        is_available = await self._repository.check_slug_availability(slug)

        if is_available:
            return SlugAvailability(slug=slug, is_available=True, suggestions=[])

        # Generate suggestions
        suggestions = []
        base_parts = slug.split('-')

        # Add numeric suffixes
        for i in range(1, 6):
            candidate = f"{slug}-{i}"
            if await self._repository.check_slug_availability(candidate):
                suggestions.append(candidate)
                if len(suggestions) >= 3:
                    break

        # Add descriptive suffixes
        if len(suggestions) < 3:
            suffixes = ["workspace", "team", "hub", "company", "org"]
            for suffix in suffixes:
                candidate = f"{slug}-{suffix}"
                if await self._repository.check_slug_availability(candidate):
                    suggestions.append(candidate)
                    if len(suggestions) >= 6:
                        break

        return SlugAvailability(
            slug=slug,
            is_available=False,
            suggestions=suggestions[:6]
        )

    async def get_pending_invitations(self, principal: CurrentPrincipal) -> List[InvitationResponse]:
        """Get pending invitations for the authenticated user."""
        return await self._repository.get_pending_invitations(principal.email)

    async def accept_invitation(
        self,
        principal: CurrentPrincipal,
        token: str
    ) -> Optional[OrganizationResponse]:
        """Accept an invitation and return the joined organization."""
        return await self._repository.accept_invitation(token, principal.id)

    async def get_available_templates(self) -> List[TemplateResponse]:
        """Get all available templates for workspace creation."""
        return await self._repository.get_available_templates()

    async def get_template(self, template_id: str) -> Optional[TemplateResponse]:
        """Get a specific template by ID."""
        return await self._repository.get_template(template_id)