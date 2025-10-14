"""Service layer for organization endpoints."""

from __future__ import annotations

import logging
from typing import List

from fastapi import HTTPException

from ...core import get_settings
from ...dependencies import CurrentPrincipal
from ..users.schemas import WorkspaceDivision, WorkspaceOrganization
from ..users.service import UserService
from .mock_data import build_fallback_organizations
from .schemas import OrganizationDivision, OrganizationSummary


logger = logging.getLogger(__name__)


class OrganizationService:
    """Provides organization data scoped to the authenticated principal."""

    def __init__(self, user_service: UserService) -> None:
        self._user_service = user_service
        self._settings = get_settings()

    async def list_for_principal(self, principal: CurrentPrincipal) -> List[OrganizationSummary]:
        """Return organizations available to the authenticated principal."""

        try:
            user = await self._user_service.get_current_user(principal)
            organizations = user.organizations if user else []

            if organizations:
                return [self._to_summary(organization) for organization in organizations]

            # User has no organizations, check if fallback is enabled
            if not self._settings.enable_mock_organization_fallback:
                return []

            logger.info(
                "organizations.list.fallback_due_to_empty_memberships",
                extra={"user_id": principal.id, "user_email": principal.email},
            )
            return build_fallback_organizations(principal)

        except HTTPException:
            # Propagate intentional API responses (e.g. auth failures).
            raise
        except Exception as error:  # pragma: no cover - defensive path
            if not self._settings.enable_mock_organization_fallback:
                raise

            logger.warning(
                "organizations.list.fallback_due_to_error",
                extra={
                    "user_id": principal.id,
                    "user_email": principal.email,
                    "reason": str(error),
                },
            )
            return build_fallback_organizations(principal)

    def _to_summary(self, organization: WorkspaceOrganization) -> OrganizationSummary:
        return OrganizationSummary(
            id=organization.id,
            name=organization.name,
            slug=organization.slug,
            description=organization.description,
            divisions=[
                self._to_division(organization.id, division)
                for division in organization.divisions
            ],
            user_role=organization.userRole,
        )

    @staticmethod
    def _to_division(org_id: str, division: WorkspaceDivision) -> OrganizationDivision:
        return OrganizationDivision(
            id=division.id,
            name=division.name,
            key=division.key,
            description=division.description,
            org_id=division.orgId or org_id,
            user_role=division.userRole,
        )
