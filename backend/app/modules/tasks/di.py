# Author: Eldrie (CTO Dev)
# Date: 2025-10-20
# Role: Backend

"""
Dependency injection configuration for tasks module.

This module provides dependency injection setup for the tasks module
following the existing patterns in the codebase. It includes database
session management, service instantiation, and proper lifecycle handling.

Key Features:
- Database session injection
- Service layer dependencies
- Repository pattern implementation
- Request-scoped lifecycle management
- Testing support with override capabilities
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from ...db.session import get_db_session
from .service import TasksService
from .repository import TasksRepository


# Database session dependency
DatabaseSession = Annotated[any, Depends(get_db_session)]


# Repository dependency with caching
@lru_cache(maxsize=1)
def get_tasks_repository(db_session: DatabaseSession) -> TasksRepository:
    """
    Get tasks repository instance.

    Uses LRU cache to ensure singleton behavior within the application
    while maintaining database session injection for request scoping.
    """
    return TasksRepository(db_session)


# Service dependency with repository injection
def get_tasks_service(
    repository: Annotated[TasksRepository, Depends(get_tasks_repository)]
) -> TasksService:
    """
    Get tasks service instance with repository dependency injection.

    The service automatically integrates with the scope guard system
    for security validation and audit logging.
    """
    return TasksService(repository)


# Export dependencies for use in routers
__all__ = [
    "get_tasks_service",
    "get_tasks_repository",
    "DatabaseSession"
]