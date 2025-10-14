"""
Dependency injection for the organizations module.
"""

from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession

from .service import OrganizationService


def get_organization_service(session: AsyncSession) -> OrganizationService:
    """Get an instance of the organization service."""
    return OrganizationService(session)