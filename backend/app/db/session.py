# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Database session management relying on SQLAlchemy AsyncEngine.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from ..core import get_settings

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def _ensure_engine() -> AsyncEngine:
    global _engine, _session_factory
    if _engine is not None and _session_factory is not None:
        return _engine

    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("Database URL is not configured. Set YOUREVER_DATABASE_URL or DATABASE_URL.")

    # Convert postgresql:// to postgresql+asyncpg:// for async connections
    database_url = settings.database_url
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    _engine = create_async_engine(database_url, echo=settings.database_echo, future=True)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False, autoflush=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        _ensure_engine()
    assert _session_factory is not None
    return _session_factory


def get_engine() -> AsyncEngine:
    """Return the singleton AsyncEngine used across the application."""

    if _engine is None:
        _ensure_engine()
    assert _engine is not None
    return _engine


@asynccontextmanager
async def get_db_session() -> AsyncIterator[AsyncSession]:
    """
    Yield an AsyncSession tied to the application engine.

    Usage:
        async with get_db_session() as session:
            ...
    """

    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def db_session_dependency() -> AsyncIterator[AsyncSession]:
    """
    FastAPI dependency wrapper that provides a clean session for manual transaction management.

    The repository methods manage their own transactions with begin(), commit(), and rollback().
    """
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        await session.close()
