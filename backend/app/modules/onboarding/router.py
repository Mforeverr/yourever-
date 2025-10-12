"""Onboarding completion endpoints."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from ..users.di import get_user_service
from ..users.service import UserService
from .errors import OnboardingValidationError
from .schemas import OnboardingCompletionPayload, OnboardingCompletionResponse

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/complete", response_model=OnboardingCompletionResponse)
async def submit_onboarding_completion(
    payload: OnboardingCompletionPayload,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingCompletionResponse:
    try:
        result = await service.complete_onboarding(principal, payload.status, payload.answers)
    except OnboardingValidationError as error:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": error.detail,
                "validation": error.validation.model_dump(),
            },
        )

    return result
