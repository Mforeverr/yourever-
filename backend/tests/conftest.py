"""
Pytest configuration and shared fixtures.
"""

import asyncio
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


@pytest.fixture(scope="session")
def event_loop() -> asyncio.AbstractEventLoop:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_db_engine():
    """Create a test database engine."""
    # Use a separate test database if configured, otherwise use the main one
    test_database_url = get_settings().database_url

    # Ensure we're using asyncpg driver for async tests
    if test_database_url.startswith("postgresql://"):
        test_database_url = test_database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(
        test_database_url,
        echo=False,
        future=True,
    )

    yield engine

    await engine.dispose()


@pytest.fixture
async def test_db_session(test_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    session_factory = sessionmaker(
        test_db_engine,
        expire_on_commit=False,
        autoflush=False,
        class_=AsyncSession
    )

    async with session_factory() as session:
        yield session


@pytest.fixture
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client."""
    async with AsyncClient(base_url="http://localhost:8000") as client:
        yield client


@pytest.fixture
def mock_principal():
    """Mock authenticated principal."""
    from app.dependencies import CurrentPrincipal

    return CurrentPrincipal(
        id="test-user-id",
        email="test@example.com",
        role="user",
    )