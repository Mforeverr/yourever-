# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Router registry for modular FastAPI packages.
"""

from fastapi import APIRouter

from .health.router import router as health_router
from .huddles.router import router as huddles_router
from .projects.router import router as projects_router
from .users.router import router as users_router
from .onboarding.router import router as onboarding_router

MODULE_ROUTERS: tuple[APIRouter, ...] = (
    health_router,
    huddles_router,
    projects_router,
    onboarding_router,
    users_router,
)

__all__ = ["MODULE_ROUTERS"]
