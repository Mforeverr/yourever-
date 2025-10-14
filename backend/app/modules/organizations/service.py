"""Service layer for organization endpoints."""

from __future__ import annotations

from typing import List

from ...dependencies import CurrentPrincipal
from ..users.schemas import WorkspaceDivision, WorkspaceOrganization
from ..users.service import UserService
from .schemas import OrganizationDivision, OrganizationSummary


class OrganizationService:
    """Provides organization data scoped to the authenticated principal."""

    def __init__(self, user_service: UserService) -> None:
        self._user_service = user_service

    async def list_for_principal(self, principal: CurrentPrincipal) -> List[OrganizationSummary]:
        """Return organizations available to the authenticated principal."""

        user = await self._user_service.get_current_user(principal)
        return [self._to_summary(organization) for organization in user.organizations]

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
