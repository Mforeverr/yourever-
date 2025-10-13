"""Onboarding endpoints exposed to clients."""

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from ..users.di import get_user_service
from ..users.service import UserService
from .errors import OnboardingRevisionConflict, OnboardingValidationError
from .di import get_onboarding_manifest_service
from .schemas import (
    OnboardingCompletionPayload,
    OnboardingCompletionResponse,
    OnboardingManifestResponse,
)
from .service import OnboardingManifestService

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


@router.get("/manifest", response_model=OnboardingManifestResponse)
async def get_onboarding_manifest(
    service: OnboardingManifestService = Depends(get_onboarding_manifest_service),
) -> OnboardingManifestResponse:
    """Expose the server-configured onboarding step manifest."""

    manifest = await service.get_manifest()
    steps = [
        {
            "id": step.id,
            "title": step.title,
            "description": step.description,
            "path": step.path,
            "required": step.required,
            "canSkip": step.can_skip,
        }
        for step in manifest.steps
    ]

    return OnboardingManifestResponse(
        version=manifest.version,
        variant=manifest.variant,
        updatedAt=manifest.updated_at,
        steps=steps,
    )


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
    except OnboardingRevisionConflict as error:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": error.detail,
                "conflict": error.context,
            },
        )

    return result
