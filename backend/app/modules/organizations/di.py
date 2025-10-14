"""Dependency wiring for the organizations module."""

from fastapi import Depends

from ..users.di import get_user_service
from ..users.service import UserService
from .service import OrganizationService


async def get_organization_service(
    user_service: UserService = Depends(get_user_service),
) -> OrganizationService:
    return OrganizationService(user_service=user_service)
