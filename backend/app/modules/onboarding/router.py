"""Onboarding completion endpoints."""

from fastapi import APIRouter, Depends

from ...dependencies import CurrentPrincipal, require_current_principal
from ..users.di import get_user_service
from ..users.service import UserService
from .schemas import OnboardingCompletionPayload, OnboardingCompletionResponse

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.post("/complete", response_model=OnboardingCompletionResponse)
async def submit_onboarding_completion(
    payload: OnboardingCompletionPayload,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: UserService = Depends(get_user_service),
) -> OnboardingCompletionResponse:
    session = await service.complete_onboarding(principal, payload.status, payload.answers)
    return OnboardingCompletionResponse(session=session)
