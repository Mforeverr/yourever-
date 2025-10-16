"""Dependency wiring for the shortlinks module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from .repository import ShortlinkRepository
from .service import ShortlinkService


async def get_shortlink_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> ShortlinkRepository:
    return ShortlinkRepository(session=session)


async def get_shortlink_service(
    repository: ShortlinkRepository = Depends(get_shortlink_repository),
) -> ShortlinkService:
    return ShortlinkService(repository=repository)
