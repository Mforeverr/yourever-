# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
User profile and onboarding progress endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_user_service
from .schemas import OnboardingProgressUpdate, OnboardingSessionResponse, UserProfileResponse
from .service import UserService
from ..onboarding.errors import OnboardingRevisionConflict

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> UserProfileResponse:
    try:
        user = await service.get_current_user(principal)
    except Exception as e:
        # Log the actual error for debugging
        print(f"ERROR in get_current_user: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User profile not found: {str(e)}") from None
    return UserProfileResponse(user=user)


@router.get("/me/onboarding-progress", response_model=OnboardingSessionResponse)
async def get_onboarding_progress(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingSessionResponse:
    session = await service.get_onboarding_session(principal)
    return OnboardingSessionResponse(session=session)


@router.patch("/me/onboarding-progress", response_model=OnboardingSessionResponse)
async def update_onboarding_progress(
    payload: OnboardingProgressUpdate,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingSessionResponse:
    try:
        session = await service.update_onboarding_progress(principal, payload.status)
    except OnboardingRevisionConflict as error:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": error.detail,
                "conflict": error.context,
            },
        )

    return OnboardingSessionResponse(session=session)
