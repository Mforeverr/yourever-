"""Dependency wiring for the auth façade."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from ..users.di import get_user_service
from ..users.service import UserService
from .repository import AuthEventRepository
from .service import AuthService, AuthSessionCache


async def get_auth_event_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> AuthEventRepository:
    return AuthEventRepository(session=session)


async def get_auth_session_cache() -> AuthSessionCache:
    return AuthSessionCache(ttl_seconds=300)


async def get_auth_service(
    user_service: UserService = Depends(get_user_service),
    repository: AuthEventRepository = Depends(get_auth_event_repository),
    cache: AuthSessionCache = Depends(get_auth_session_cache),
) -> AuthService:
    return AuthService(user_service=user_service, event_repository=repository, cache=cache)

