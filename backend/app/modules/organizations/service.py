"""Service layer for organization endpoints."""

from __future__ import annotations

import logging
from typing import List

from fastapi import HTTPException, status

from ...core import get_settings
from ...dependencies import CurrentPrincipal
from ..users.schemas import WorkspaceDivision, WorkspaceOrganization
from ..users.service import UserService
from ..workspace.service import WorkspaceTemplateService
from .mock_data import build_fallback_organizations
from .repository import (
    DivisionDuplicateError,
    DivisionValidationError,
    OrganizationRepository,
    SlugConflictError,
    SlugValidationError,
)
from .schemas import (
    InvitationBatchCreateRequest,
    InvitationBatchCreateResponse,
    InvitationCreatePayload,
    InvitationListResponse,
    InvitationResponse,
    OrganizationCreate,
    OrganizationDivision,
    OrganizationResponse,
    OrganizationSummary,
    SlugAvailability,
    WorkspaceCreationResponse,
)


logger = logging.getLogger(__name__)


class OrganizationService:
    """Provides organization data scoped to the authenticated principal."""

    def __init__(
        self,
        user_service: UserService,
        repository: OrganizationRepository,
        workspace_template_service: WorkspaceTemplateService | None = None,
    ) -> None:
        self._user_service = user_service
        self._repository = repository
        self._settings = get_settings()
        self._workspace_template_service = workspace_template_service

    async def create(
        self,
        principal: CurrentPrincipal,
        payload: OrganizationCreate,
    ) -> WorkspaceCreationResponse:
        """Create an organization and optionally send invitations."""

        user = await self._user_service.get_current_user(principal)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )

        try:
            organization, divisions = await self._repository.create_organization(
                user_id=user.id,
                create_data=payload,
            )
        except SlugValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(error),
            ) from error
        except SlugConflictError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(error),
            ) from error
        except DivisionValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(error),
            ) from error
        except DivisionDuplicateError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(error),
            ) from error

        invitations_response = InvitationBatchCreateResponse(
            invitations=[],
            skipped=[],
        )

        if payload.invitations:
            normalized_invites: list[InvitationCreatePayload] = []
            for invitation in payload.invitations:
                # Default to first division if no division specified
                default_division_id = divisions[0].id if divisions else None
                normalized_invites.append(
                    InvitationCreatePayload(
                        email=invitation.email,
                        role=invitation.role or "member",
                        division_id=invitation.division_id or default_division_id,
                        message=invitation.message,
                        expires_at=invitation.expires_at,
                    )
                )

            batch_request = InvitationBatchCreateRequest(
                invitations=normalized_invites,
            )

            try:
                invitations_response = await self._repository.create_invitations(
                    org_id=organization.id,
                    inviter_id=user.id,
                    batch=batch_request,
                )
            except Exception as error:  # pragma: no cover - defensive logging
                logger.error(
                    "organizations.create.invitation_failure",
                    exc_info=error,
                    extra={
                        "org_id": organization.id,
                        "user_id": user.id,
                    },
                )

        if self._workspace_template_service:
            try:
                await self._workspace_template_service.seed_for_organization(
                    organization=organization,
                    divisions=divisions,
                    seeded_by=user.id if user else None,
                )
            except Exception as error:  # pragma: no cover - safety log
                logger.warning(
                    "organizations.create.workspace_seed_failed",
                    exc_info=error,
                    extra={
                        "org_id": organization.id,
                        "user_id": user.id if user else None,
                    },
                )

        return WorkspaceCreationResponse(
            organization=organization,
            user_role="owner",
            template_applied=payload.template_id,
            active_invitations=invitations_response.invitations,
            skipped_invites=invitations_response.skipped,
        )

    async def check_slug_availability(self, slug: str) -> SlugAvailability:
        """Return slug availability and suggestions for conflicts."""

        normalized = self._repository.generate_slug(slug)
        if not normalized:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Slug must include at least one alphanumeric character.",
            )

        is_available = await self._repository.check_slug_availability(normalized)
        suggestions: list[str] = []

        if not is_available:
            suggestions = await self._repository.suggest_slug_variants(normalized)

        return SlugAvailability(
            slug=normalized,
            is_available=is_available,
            suggestions=suggestions,
        )

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


class OrganizationInvitationService:
    """Coordinates invitation workflows spanning persistence and membership state."""

    def __init__(
        self,
        repository: OrganizationRepository,
        user_service: UserService,
    ) -> None:
        self._repository = repository
        self._user_service = user_service

    async def list_for_principal(
        self, principal: CurrentPrincipal
    ) -> InvitationListResponse:
        """Return pending invitations for the authenticated principal."""

        user = await self._user_service.get_current_user(principal)
        email = (user.email or principal.email or "").strip()
        if not email:
            return InvitationListResponse(invitations=[])

        invitations = await self._repository.get_pending_invitations(email)
        return InvitationListResponse(invitations=invitations)

    async def accept(
        self,
        principal: CurrentPrincipal,
        invitation_id: str,
    ) -> OrganizationResponse:
        """Accept an invitation, returning the hydrated organization."""

        user = await self._user_service.get_current_user(principal)
        email = (user.email or principal.email or "").strip()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to accept invitations without a confirmed email",
            )

        organization = await self._repository.accept_invitation(
            invitation_id=invitation_id,
            user_id=user.id,
            user_email=email,
        )

        if not organization:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or already actioned",
            )

        return organization

    async def decline(
        self,
        principal: CurrentPrincipal,
        invitation_id: str,
    ) -> InvitationResponse:
        """Decline an invitation and return its latest state."""

        user = await self._user_service.get_current_user(principal)
        email = (user.email or principal.email or "").strip()
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decline invitations without a confirmed email",
            )

        invitation = await self._repository.decline_invitation(
            invitation_id=invitation_id,
            user_email=email,
        )

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or already actioned",
            )

        return invitation

    async def create(
        self,
        principal: CurrentPrincipal,
        org_id: str,
        payload: InvitationBatchCreateRequest,
    ) -> InvitationBatchCreateResponse:
        """Create invitations scoped to an organization the user manages."""

        user = await self._user_service.get_current_user(principal)
        membership = next(
            (organization for organization in user.organizations if organization.id == org_id),
            None,
        )

        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this organization",
            )

        allowed_roles = {"owner", "admin"}
        if membership.userRole not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization admins can send invitations",
            )

        return await self._repository.create_invitations(
            org_id=org_id,
            inviter_id=user.id,
            batch=payload,
        )
