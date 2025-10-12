# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Dependency wiring for huddles module.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from .repository import HuddleRepository, SQLAlchemyHuddleRepository
from .service import HuddleService


async def get_huddle_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> HuddleRepository:
    return SQLAlchemyHuddleRepository(session=session)


async def get_huddle_service(
    repository: HuddleRepository = Depends(get_huddle_repository),
) -> HuddleService:
    return HuddleService(repository=repository)
