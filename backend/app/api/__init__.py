# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
API router aggregator. All module routers are mounted here before being
included in the FastAPI application.
"""

from fastapi import APIRouter

from ..modules import MODULE_ROUTERS

api_router = APIRouter()

for router in MODULE_ROUTERS:
    api_router.include_router(router)

__all__ = ["api_router"]
