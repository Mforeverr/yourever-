"""Dependency injection helpers for the scope module."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import db_session_dependency
from ..users.di import get_user_service
from ..users.service import UserService
from .repository import ScopePreferenceRepository
from .service import (
    LoggingScopeEventPublisher,
    ScopeCache,
    ScopeEventPublisher,
    ScopeRateLimiter,
    ScopeService,
)


async def get_scope_cache() -> ScopeCache:
    return ScopeCache(ttl_seconds=180)


async def get_scope_rate_limiter() -> ScopeRateLimiter:
    return ScopeRateLimiter(max_events=30, window_seconds=60)


async def get_scope_event_publisher() -> ScopeEventPublisher:
    return LoggingScopeEventPublisher()


async def get_scope_repository(
    session: AsyncSession = Depends(db_session_dependency),
) -> ScopePreferenceRepository:
    return ScopePreferenceRepository(session=session)


async def get_scope_service(
    user_service: UserService = Depends(get_user_service),
    repository: ScopePreferenceRepository = Depends(get_scope_repository),
    cache: ScopeCache = Depends(get_scope_cache),
    event_publisher: ScopeEventPublisher = Depends(get_scope_event_publisher),
    rate_limiter: ScopeRateLimiter = Depends(get_scope_rate_limiter),
) -> ScopeService:
    return ScopeService(
        user_service=user_service,
        repository=repository,
        cache=cache,
        event_publisher=event_publisher,
        rate_limiter=rate_limiter,
    )
