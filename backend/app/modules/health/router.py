# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Lightweight health endpoints to verify auth and service readiness.
"""

from fastapi import APIRouter, Depends

from ...dependencies import CurrentPrincipal, require_current_principal

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def root_probe() -> dict:
    """Compatibility health endpoint for legacy probes."""

    return {"status": "ok"}


@router.get("/live")
async def live_probe() -> dict:
    """Simple liveness check without authentication."""

    return {"status": "ok"}


@router.get("/auth")
async def auth_probe(principal: CurrentPrincipal = Depends(require_current_principal)) -> dict:
    """Verify bearer token validation end-to-end."""

    return {"status": "ok", "userId": principal.id}
