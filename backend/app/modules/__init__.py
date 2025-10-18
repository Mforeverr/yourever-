# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Router registry for modular FastAPI packages.
"""

from fastapi import APIRouter

from .admin.router import router as admin_router
from .auth.router import router as auth_router
from .health.router import router as health_router
from .huddles.router import router as huddles_router
from .projects.router import router as projects_router
from .shortlinks.router import router as shortlinks_router
from .users.router import router as users_router
from .onboarding.router import router as onboarding_router
from .organizations.router import router as organizations_router
from .scope.router import router as scope_router
from .workspace.router import router as workspace_router
from .workspace_dashboard.router import router as workspace_dashboard_router

MODULE_ROUTERS: tuple[APIRouter, ...] = (
    health_router,
    auth_router,
    admin_router,
    huddles_router,
    projects_router,
    shortlinks_router,
    organizations_router,
    scope_router,
    workspace_router,
    workspace_dashboard_router,
    onboarding_router,
    users_router,
)

__all__ = ["MODULE_ROUTERS"]
