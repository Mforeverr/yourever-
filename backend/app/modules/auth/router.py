"""REST façade bridging Supabase auth with Workspace services."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_auth_service
from .schemas import AuthLogoutResponse, AuthRefreshResponse, AuthSessionSnapshot
from .service import AuthService


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/session", response_model=AuthSessionSnapshot)
async def get_session(
    request: Request,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionSnapshot:
    snapshot = await service.get_session_snapshot(principal)
    return snapshot


@router.post("/refresh", response_model=AuthRefreshResponse)
async def refresh_session(
    request: Request,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: AuthService = Depends(get_auth_service),
) -> AuthRefreshResponse:
    await service.track_refresh(principal, request)
    snapshot = await service.refresh_session(principal)
    return AuthRefreshResponse(**snapshot.model_dump())


@router.post("/logout", response_model=AuthLogoutResponse)
async def logout(
    request: Request,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: AuthService = Depends(get_auth_service),
) -> AuthLogoutResponse:
    await service.track_logout(principal, request)
    return AuthLogoutResponse()


@router.post("/revoke", status_code=status.HTTP_202_ACCEPTED)
async def revoke_session() -> JSONResponse:
    """Placeholder endpoint for future session revocation flows."""

    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"accepted": True})

