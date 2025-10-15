"""Dependency wiring for the organizations module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from ..users.di import get_user_service
from ..users.service import UserService
from .repository import OrganizationRepository
from .service import OrganizationInvitationService, OrganizationService


async def get_organization_service(
    user_service: UserService = Depends(get_user_service),
) -> OrganizationService:
    return OrganizationService(user_service=user_service)


async def get_organization_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> OrganizationRepository:
    return OrganizationRepository(session=session)


async def get_organization_invitation_service(
    repository: OrganizationRepository = Depends(get_organization_repository),
    user_service: UserService = Depends(get_user_service),
) -> OrganizationInvitationService:
    return OrganizationInvitationService(
        repository=repository,
        user_service=user_service,
    )
