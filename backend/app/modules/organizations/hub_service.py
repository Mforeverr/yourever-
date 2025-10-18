"""Workspace Hub orchestration service for organizations and invitations."""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from datetime import datetime, timezone
from typing import Deque, Optional

from fastapi import HTTPException, status

from ...dependencies import CurrentPrincipal
from ..users.service import UserService
from .repository import OrganizationRepository
from .schemas import (
    HubInvitation,
    HubOverview,
    HubStats,
    HubOrganization,
    InvitationActionRequest,
    OrganizationDivision,
)
from .service import OrganizationInvitationService

logger = logging.getLogger(__name__)


class InvitationActionRateLimiter:
    """Simple fixed-window limiter for invitation actions."""

    def __init__(self, *, max_events: int = 20, window_seconds: int = 60) -> None:
        self._max_events = max_events
        self._window = window_seconds
        self._events: dict[str, Deque[float]] = {}
        self._lock = asyncio.Lock()

    async def allow(self, user_id: str) -> bool:
        async with self._lock:
            now = time.monotonic()
            queue = self._events.setdefault(user_id, deque())
            while queue and now - queue[0] > self._window:
                queue.popleft()
            if len(queue) >= self._max_events:
                return False
            queue.append(now)
            return True


class HubEventPublisher:
    """Lightweight event sink to surface hub analytics."""

    async def invitation_accepted(self, *, user_id: str, invitation_id: str, org_id: str) -> None:
        logger.info(
            "hub.invitation.accepted",
            extra={"user_id": user_id, "invitation_id": invitation_id, "org_id": org_id},
        )

    async def invitation_declined(self, *, user_id: str, invitation_id: str, org_id: str) -> None:
        logger.info(
            "hub.invitation.declined",
            extra={"user_id": user_id, "invitation_id": invitation_id, "org_id": org_id},
        )


class OrganizationHubService:
    """Coordinates workspace hub data for organizations and invitations."""

    def __init__(
        self,
        *,
        repository: OrganizationRepository,
        user_service: UserService,
        invitation_service: OrganizationInvitationService,
        event_publisher: Optional[HubEventPublisher] = None,
        rate_limiter: Optional[InvitationActionRateLimiter] = None,
    ) -> None:
        self._repository = repository
        self._user_service = user_service
        self._invitation_service = invitation_service
        self._events = event_publisher or HubEventPublisher()
        self._rate_limiter = rate_limiter or InvitationActionRateLimiter()

    async def get_overview(self, principal: CurrentPrincipal) -> HubOverview:
        user = await self._user_service.get_current_user(principal)
        expired = await self._repository.expire_stale_invitations()
        if expired:
            logger.info(
                "hub.invitations.expired",
                extra={"user_id": principal.id, "expired_count": expired},
            )

        organizations = await self._repository.get_user_organizations(user.id)
        invitations = await self._repository.get_pending_invitations(user.email)

        mapped_orgs = [
            HubOrganization(
                id=organization.id,
                name=organization.name,
                slug=organization.slug,
                description=organization.description,
                logoUrl=organization.logo_url,
                createdAt=organization.created_at,
                userRole=organization.user_role,
                divisions=[
                    OrganizationDivision.model_validate(
                        division.model_dump(by_alias=True)
                    )
                    for division in organization.divisions
                ],
            )
            for organization in organizations
        ]

        mapped_invitations = [
            HubInvitation.model_validate(invitation.model_dump(by_alias=True))
            for invitation in invitations
        ]

        stats = HubStats(
            totalOrganizations=len(mapped_orgs),
            pendingInvitations=len(mapped_invitations),
            lastUpdatedAt=datetime.now(timezone.utc),
        )

        return HubOverview(
            organizations=mapped_orgs,
            invitations=mapped_invitations,
            stats=stats,
        )

    async def list_pending_invitations(
        self, principal: CurrentPrincipal
    ) -> list[HubInvitation]:
        user = await self._user_service.get_current_user(principal)
        expired = await self._repository.expire_stale_invitations()
        if expired:
            logger.info(
                "hub.invitations.expired",
                extra={"user_id": principal.id, "expired_count": expired},
            )

        invitations = await self._repository.get_pending_invitations(user.email)
        return [
            HubInvitation.model_validate(invitation.model_dump(by_alias=True))
            for invitation in invitations
        ]

    async def accept_invitation(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: InvitationActionRequest,
    ) -> HubOrganization:
        await self._guard_rate_limit(principal)

        try:
            organization = await self._invitation_service.accept(principal, payload.invitation_id)
        except HTTPException as error:
            raise self._translate_invitation_error(error) from error
        if organization is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "INVITATION_NOT_FOUND", "message": "Invitation not found"},
            )
        if organization.id != org_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "INVITATION_ORG_MISMATCH", "message": "Invitation does not belong to this organization"},
            )

        await self._events.invitation_accepted(
            user_id=principal.id,
            invitation_id=payload.invitation_id,
            org_id=organization.id,
        )

        return HubOrganization(
            id=organization.id,
            name=organization.name,
            slug=organization.slug,
            description=organization.description,
            logoUrl=organization.logo_url,
            createdAt=organization.created_at,
            userRole=organization.user_role,
            divisions=[
                OrganizationDivision.model_validate(division.model_dump())
                for division in organization.divisions
            ],
        )

    async def decline_invitation(
        self,
        *,
        principal: CurrentPrincipal,
        org_id: str,
        payload: InvitationActionRequest,
    ) -> HubInvitation:
        await self._guard_rate_limit(principal)

        try:
            invitation = await self._invitation_service.decline(principal, payload.invitation_id)
        except HTTPException as error:
            raise self._translate_invitation_error(error) from error
        if invitation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "INVITATION_NOT_FOUND", "message": "Invitation not found"},
            )
        if invitation.org_id and invitation.org_id != org_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "INVITATION_ORG_MISMATCH", "message": "Invitation does not belong to this organization"},
            )

        await self._events.invitation_declined(
            user_id=principal.id,
            invitation_id=payload.invitation_id,
            org_id=org_id,
        )

        return HubInvitation.model_validate(invitation.model_dump(by_alias=True))

    async def _guard_rate_limit(self, principal: CurrentPrincipal) -> None:
        allowed = await self._rate_limiter.allow(principal.id)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "INVITATION_RATE_LIMITED",
                    "message": "Too many invitation actions. Please wait a moment before trying again.",
                },
            )

    def _translate_invitation_error(self, error: HTTPException) -> HTTPException:
        detail = error.detail
        if isinstance(detail, dict) and "code" in detail:
            return error

        if error.status_code == status.HTTP_404_NOT_FOUND:
            return HTTPException(
                status_code=error.status_code,
                detail={
                    "code": "INVITATION_NOT_FOUND",
                    "message": "The invitation is no longer available.",
                },
            )
        if error.status_code == status.HTTP_400_BAD_REQUEST:
            return HTTPException(
                status_code=error.status_code,
                detail={
                    "code": "INVITATION_INVALID",
                    "message": "Invitation cannot be actioned. Please verify your email and try again.",
                },
            )
        if error.status_code == status.HTTP_403_FORBIDDEN:
            return HTTPException(
                status_code=error.status_code,
                detail={
                    "code": "INVITATION_FORBIDDEN",
                    "message": "You do not have permission to manage this invitation.",
                },
            )
        return error
