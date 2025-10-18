"""Dependency wiring for the organizations module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from ..users.di import get_user_service
from ..users.service import UserService
from ..workspace.di import get_workspace_template_service
from ..workspace.service import WorkspaceTemplateService
from .hub_service import (
    HubEventPublisher,
    InvitationActionRateLimiter,
    OrganizationHubService,
)
from .repository import OrganizationRepository
from .service import OrganizationInvitationService, OrganizationService


async def get_organization_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> OrganizationRepository:
    return OrganizationRepository(session=session)


async def get_organization_service(
    user_service: UserService = Depends(get_user_service),
    repository: OrganizationRepository = Depends(get_organization_repository),
    workspace_template_service: WorkspaceTemplateService = Depends(get_workspace_template_service),
) -> OrganizationService:
    return OrganizationService(
        user_service=user_service,
        repository=repository,
        workspace_template_service=workspace_template_service,
    )


async def get_organization_invitation_service(
    repository: OrganizationRepository = Depends(get_organization_repository),
    user_service: UserService = Depends(get_user_service),
) -> OrganizationInvitationService:
    return OrganizationInvitationService(
        repository=repository,
        user_service=user_service,
    )


async def get_invitation_rate_limiter() -> InvitationActionRateLimiter:
    return InvitationActionRateLimiter(max_events=10, window_seconds=60)


async def get_hub_event_publisher() -> HubEventPublisher:
    return HubEventPublisher()


async def get_organization_hub_service(
    repository: OrganizationRepository = Depends(get_organization_repository),
    user_service: UserService = Depends(get_user_service),
    invitation_service: OrganizationInvitationService = Depends(get_organization_invitation_service),
    rate_limiter: InvitationActionRateLimiter = Depends(get_invitation_rate_limiter),
    event_publisher: HubEventPublisher = Depends(get_hub_event_publisher),
) -> OrganizationHubService:
    return OrganizationHubService(
        repository=repository,
        user_service=user_service,
        invitation_service=invitation_service,
        rate_limiter=rate_limiter,
        event_publisher=event_publisher,
    )
