# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Dependency wiring for the users module.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from .repository import UserRepository
from .service import UserService


async def get_user_repository(session: AsyncSession = Depends(db_session_dependency)) -> UserRepository:
    return UserRepository(session=session)


async def get_user_service(repository: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repository=repository)
