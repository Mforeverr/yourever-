# Author: Eldrie (CTO Dev)
# Date: 2025-10-24
# Role: Backend

"""
Organization ID resolution service for handling mock and UUID organization IDs.

This module provides a centralized service to resolve mock organization IDs
to real UUIDs during development and testing phases, improving developer
experience while maintaining production security.

Features:
- Mock ID to UUID resolution
- Development-friendly error handling
- Configuration-driven fallback behavior
- Caching for performance optimization
"""

from __future__ import annotations

import logging
from typing import Dict, Optional, Set
from dataclasses import dataclass
from enum import Enum

from ..core.config import get_settings
from ..dependencies import CurrentPrincipal

logger = logging.getLogger(__name__)


class OrganizationIdType(str, Enum):
    """Organization ID type enumeration."""
    UUID = "uuid"
    MOCK = "mock"
    UNKNOWN = "unknown"


@dataclass
class OrganizationResolution:
    """Result of organization ID resolution."""
    resolved_id: str
    original_id: str
    id_type: OrganizationIdType
    is_mock_resolved: bool = False


class OrganizationResolver:
    """
    Service for resolving organization IDs between mock and UUID formats.

    This service handles the mapping between development-friendly mock IDs
    and production-ready UUIDs, with proper fallback behavior.
    """

    def __init__(self, mock_fallback_enabled: Optional[bool] = None):
        """
        Initialize the organization resolver.

        Args:
            mock_fallback_enabled: Override for mock fallback setting
        """
        self._settings = get_settings()
        self._mock_fallback_enabled = (
            mock_fallback_enabled if mock_fallback_enabled is not None
            else self._settings.enable_mock_organization_fallback
        )

        # Mock organization mappings for development
        self._mock_mappings: Dict[str, str] = {
            "yourever": "550e8400-e29b-41d4-a716-446655440000",
            "demo": "550e8400-e29b-41d4-a716-446655440001",
            "test": "550e8400-e29b-41d4-a716-446655440002",
            "dev": "550e8400-e29b-41d4-a716-446655440003",
        }

        # Cache for resolved IDs
        self._resolution_cache: Dict[str, OrganizationResolution] = {}

    def detect_id_type(self, org_id: str) -> OrganizationIdType:
        """
        Detect the type of organization ID.

        Args:
            org_id: Organization ID to analyze

        Returns:
            OrganizationIdType: The detected type
        """
        if not org_id:
            return OrganizationIdType.UNKNOWN

        # Check if it's a UUID format (basic validation)
        if (
            len(org_id) == 36 and
            org_id.count('-') == 3 and
            all(c in '0123456789abcdefABCDEF-' for c in org_id)
        ):
            return OrganizationIdType.UUID

        # Check if it's a known mock ID
        if org_id.lower() in self._mock_mappings:
            return OrganizationIdType.MOCK

        return OrganizationIdType.UNKNOWN

    def resolve_organization_id(
        self,
        org_id: str,
        principal: Optional[CurrentPrincipal] = None
    ) -> OrganizationResolution:
        """
        Resolve an organization ID to its UUID format.

        Args:
            org_id: The organization ID to resolve
            principal: Optional user principal for access validation

        Returns:
            OrganizationResolution: Resolution result with metadata

        Raises:
            ValueError: If the ID cannot be resolved
        """
        if not org_id:
            raise ValueError("Organization ID cannot be empty")

        # Check cache first
        if org_id in self._resolution_cache:
            return self._resolution_cache[org_id]

        id_type = self.detect_id_type(org_id)

        if id_type == OrganizationIdType.UUID:
            resolution = OrganizationResolution(
                resolved_id=org_id,
                original_id=org_id,
                id_type=id_type,
                is_mock_resolved=False
            )
        elif id_type == OrganizationIdType.MOCK:
            if self._mock_fallback_enabled:
                resolved_uuid = self._mock_mappings[org_id.lower()]
                resolution = OrganizationResolution(
                    resolved_id=resolved_uuid,
                    original_id=org_id,
                    id_type=id_type,
                    is_mock_resolved=True
                )
                logger.info(
                    "organization.resolved_mock_to_uuid",
                    extra={
                        "mock_id": org_id,
                        "resolved_uuid": resolved_uuid,
                        "user_id": principal.id if principal else None
                    }
                )
            else:
                raise ValueError(
                    f"Mock organization ID '{org_id}' is not allowed in production mode. "
                    f"Use a valid UUID instead."
                )
        else:
            # Unknown ID type - provide helpful error message
            error_msg = (
                f"Invalid organization ID format: '{org_id}'. "
                f"Expected a UUID (e.g., '550e8400-e29b-41d4-a716-446655440000') "
                f"or a known mock ID."
            )

            if self._mock_fallback_enabled:
                error_msg += (
                    f" Available mock IDs: {', '.join(self._mock_mappings.keys())}"
                )

            raise ValueError(error_msg)

        # Cache the resolution
        self._resolution_cache[org_id] = resolution
        return resolution

    def resolve_principal_organizations(
        self,
        principal: CurrentPrincipal
    ) -> Dict[str, OrganizationResolution]:
        """
        Resolve all organization IDs in a principal's access list.

        Args:
            principal: The user principal

        Returns:
            Dict mapping original IDs to resolutions
        """
        resolved_orgs = {}

        for org_id in principal.org_ids:
            try:
                resolution = self.resolve_organization_id(org_id, principal)
                resolved_orgs[org_id] = resolution
            except ValueError as e:
                logger.warning(
                    "organization.resolution_failed",
                    extra={
                        "org_id": org_id,
                        "user_id": principal.id,
                        "error": str(e)
                    }
                )
                # Continue with other org IDs

        return resolved_orgs

    def validate_organization_access(
        self,
        principal: CurrentPrincipal,
        requested_org_id: str
    ) -> OrganizationResolution:
        """
        Validate that a principal has access to a requested organization.

        Args:
            principal: The user principal
            requested_org_id: The organization ID being requested

        Returns:
            OrganizationResolution: Resolution result

        Raises:
            ValueError: If access is denied or ID is invalid
        """
        # Resolve the requested organization ID
        resolution = self.resolve_organization_id(requested_org_id, principal)

        # Check if principal has access to the resolved UUID
        resolved_uuid = resolution.resolved_id
        accessible_orgs = set(principal.org_ids)

        # If mock fallback is enabled, also check mock IDs
        if self._mock_fallback_enabled:
            accessible_orgs.update(self._mock_mappings.keys())

        if resolution.is_mock_resolved:
            # For mock IDs, check both original and resolved
            has_access = (
                resolution.original_id in principal.org_ids or
                resolved_uuid in principal.org_ids
            )
        else:
            # For UUIDs, check exact match
            has_access = resolved_uuid in principal.org_ids

        if not has_access:
            accessible_list = list(principal.org_ids)[:3]  # Show first 3 for brevity
            error_msg = (
                f"Access denied to organization '{requested_org_id}'. "
                f"Accessible organizations: {accessible_list}"
            )

            if self._mock_fallback_enabled:
                error_msg += (
                    f" (or mock IDs: {', '.join(list(self._mock_mappings.keys())[:3])})"
                )

            raise ValueError(error_msg)

        return resolution

    def add_mock_mapping(self, mock_id: str, uuid: str) -> None:
        """
        Add a new mock ID mapping.

        Args:
            mock_id: Mock organization ID
            uuid: UUID to map to
        """
        self._mock_mappings[mock_id.lower()] = uuid

        # Clear cache to force re-resolution
        self._resolution_cache.clear()

        logger.info(
            "organization.mock_mapping_added",
            extra={
                "mock_id": mock_id,
                "uuid": uuid
            }
        )

    def clear_cache(self) -> None:
        """Clear the resolution cache."""
        self._resolution_cache.clear()

    def get_mock_mappings(self) -> Dict[str, str]:
        """Get all mock ID mappings."""
        return self._mock_mappings.copy()

    def is_enabled(self) -> bool:
        """Check if mock fallback is enabled."""
        return self._mock_fallback_enabled


# Global resolver instance
_default_resolver: Optional[OrganizationResolver] = None


def get_organization_resolver() -> OrganizationResolver:
    """Get or create the default organization resolver instance."""
    global _default_resolver
    if _default_resolver is None:
        _default_resolver = OrganizationResolver()
    return _default_resolver


def set_organization_resolver(resolver: OrganizationResolver) -> None:
    """Set a custom organization resolver instance (useful for testing)."""
    global _default_resolver
    _default_resolver = resolver