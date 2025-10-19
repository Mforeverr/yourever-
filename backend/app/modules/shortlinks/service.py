# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Shortlink service with comprehensive scope validation and security.

This service implements secure shortlink resolution operations that respect
organization and division boundaries while following the Open/Closed Principle.
All operations are scoped to prevent cross-tenant data access.
"""

from __future__ import annotations

import logging
from typing import Optional

from ...dependencies import CurrentPrincipal
from ...core.scope_integration import ScopedService
from ...core.scope import ScopeContext
from .repository import ShortlinkRepository
from .schemas import ShortlinkResolution, ShortlinkType

logger = logging.getLogger(__name__)


class ShortlinkNotFoundError(ValueError):
    """Raised when the requested shortlink target cannot be located."""


class ShortlinkScopeError(ValueError):
    """Raised when a shortlink target lacks the information required to scope it."""


_SEGMENT_BY_TYPE: dict[ShortlinkType, str] = {
    ShortlinkType.PROJECT: "p",
    ShortlinkType.TASK: "t",
    ShortlinkType.CHANNEL: "c",
}


class ShortlinkService(ScopedService):
    """
    Encapsulates secure shortlink domain behaviors with scope validation.

    This service extends ScopedService to automatically integrate with the
    scope guard system, ensuring all shortlink operations respect organization
    and division boundaries.
    """

    def __init__(self, repository: ShortlinkRepository) -> None:
        super().__init__()
        self._repository = repository

    # Legacy method for backward compatibility - resolves without validation
    async def resolve(self, shortlink_type: ShortlinkType, entity_id: str) -> ShortlinkResolution:
        """
        Legacy method - resolve a shortlink without scope validation.

        DEPRECATED: Use scoped methods instead for better security.
        """
        resolver = {
            ShortlinkType.PROJECT: self._repository.fetch_project_scope,
            ShortlinkType.TASK: self._repository.fetch_task_scope,
            ShortlinkType.CHANNEL: self._repository.fetch_channel_scope,
        }[shortlink_type]

        scope = await resolver(entity_id)
        if scope is None:
            logger.info(
                "shortlinks.resolve.not_found",
                extra={"type": shortlink_type.value, "entity_id": entity_id},
            )
            raise ShortlinkNotFoundError("Shortlink target was not found.")

        org_slug, division_key = scope
        if not org_slug or not division_key:
            logger.warning(
                "shortlinks.resolve.missing_scope",
                extra={"type": shortlink_type.value, "entity_id": entity_id},
            )
            raise ShortlinkScopeError(
                "Shortlink target is missing division context for routing.",
            )

        segment = _SEGMENT_BY_TYPE[shortlink_type]
        scoped_url = f"/{org_slug}/{division_key}/{segment}/{entity_id}"
        return ShortlinkResolution(scoped_url=scoped_url)

    # Organization-scoped methods
    async def resolve_for_organization(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        shortlink_type: ShortlinkType,
        entity_id: str
    ) -> ShortlinkResolution:
        """
        Resolve a shortlink within a specific organization with scope validation.

        This method validates that the principal has access to the specified
        organization before resolving the shortlink, preventing cross-organization
        resource access.
        """
        # Validate organization access
        scope_ctx = await self.validate_organization_access(
            principal, organization_id, {"shortlink:read"}
        )

        # Get the entity scope from repository
        resolver = {
            ShortlinkType.PROJECT: self._repository.fetch_project_scope,
            ShortlinkType.TASK: self._repository.fetch_task_scope,
            ShortlinkType.CHANNEL: self._repository.fetch_channel_scope,
        }[shortlink_type]

        scope = await resolver(entity_id)
        if scope is None:
            logger.info(
                "shortlinks.resolve.not_found",
                extra={"type": shortlink_type.value, "entity_id": entity_id, "organization_id": organization_id},
            )
            raise ShortlinkNotFoundError("Shortlink target was not found.")

        org_slug, division_key = scope
        if not org_slug or not division_key:
            logger.warning(
                "shortlinks.resolve.missing_scope",
                extra={"type": shortlink_type.value, "entity_id": entity_id, "organization_id": organization_id},
            )
            raise ShortlinkScopeError(
                "Shortlink target is missing division context for routing.",
            )

        # Additional validation: ensure the resolved entity belongs to the validated organization
        # This would require repository methods to verify entity-organization relationship
        if not await self._repository.verify_entity_in_organization(entity_id, shortlink_type, organization_id):
            raise ShortlinkNotFoundError("Shortlink target not found in specified organization.")

        segment = _SEGMENT_BY_TYPE[shortlink_type]
        scoped_url = f"/{org_slug}/{division_key}/{segment}/{entity_id}"
        return ShortlinkResolution(scoped_url=scoped_url)

    # Division-scoped methods
    async def resolve_for_division(
        self,
        principal: CurrentPrincipal,
        organization_id: str,
        division_id: str,
        shortlink_type: ShortlinkType,
        entity_id: str
    ) -> ShortlinkResolution:
        """
        Resolve a shortlink within a specific division with scope validation.

        This method validates both organization and division access before
        resolving the shortlink, preventing cross-division resource access.
        """
        # Validate division access
        scope_ctx = await self.validate_division_access(
            principal, organization_id, division_id, {"shortlink:read"}
        )

        # Get the entity scope from repository
        resolver = {
            ShortlinkType.PROJECT: self._repository.fetch_project_scope,
            ShortlinkType.TASK: self._repository.fetch_task_scope,
            ShortlinkType.CHANNEL: self._repository.fetch_channel_scope,
        }[shortlink_type]

        scope = await resolver(entity_id)
        if scope is None:
            logger.info(
                "shortlinks.resolve.not_found",
                extra={
                    "type": shortlink_type.value,
                    "entity_id": entity_id,
                    "organization_id": organization_id,
                    "division_id": division_id
                },
            )
            raise ShortlinkNotFoundError("Shortlink target was not found.")

        org_slug, division_key = scope
        if not org_slug or not division_key:
            logger.warning(
                "shortlinks.resolve.missing_scope",
                extra={
                    "type": shortlink_type.value,
                    "entity_id": entity_id,
                    "organization_id": organization_id,
                    "division_id": division_id
                },
            )
            raise ShortlinkScopeError(
                "Shortlink target is missing division context for routing.",
            )

        # Additional validation: ensure the resolved entity belongs to the validated division
        if not await self._repository.verify_entity_in_division(entity_id, shortlink_type, division_id):
            raise ShortlinkNotFoundError("Shortlink target not found in specified division.")

        segment = _SEGMENT_BY_TYPE[shortlink_type]
        scoped_url = f"/{org_slug}/{division_key}/{segment}/{entity_id}"
        return ShortlinkResolution(scoped_url=scoped_url)
