"""Admin endpoints exposing onboarding answer analytics."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_admin_onboarding_answers_service
from .schemas import (
    OnboardingAnswerListResponse,
    OnboardingAnswerUserResponse,
)
from .service import AdminOnboardingAnswersService
from ..users.exporter import snapshot_to_dict

router = APIRouter(prefix="/api/admin", tags=["admin"])


_ALLOWED_ADMIN_ROLES = {"admin", "owner", "super_admin", "superadmin"}


async def require_admin_principal(
    principal: CurrentPrincipal = Depends(require_current_principal),
) -> CurrentPrincipal:
    if principal.role and principal.role.lower() in _ALLOWED_ADMIN_ROLES:
        return principal
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


@router.get("/onboarding/answers", response_model=OnboardingAnswerListResponse)
async def list_onboarding_answers(
    page: int = Query(1, ge=1, description="1-based page index"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by normalized profile role"),
    workspace_id: Optional[UUID] = Query(None, description="Filter by workspace UUID"),
    completed_from: Optional[datetime] = Query(None, description="Inclusive submitted_at lower bound"),
    completed_to: Optional[datetime] = Query(None, description="Inclusive submitted_at upper bound"),
    _: CurrentPrincipal = Depends(require_admin_principal),
    service: AdminOnboardingAnswersService = Depends(get_admin_onboarding_answers_service),
) -> OnboardingAnswerListResponse:
    workspace_filter = str(workspace_id) if workspace_id else None
    items, total = await service.list_answers(
        page=page,
        page_size=page_size,
        role=role,
        workspace_id=workspace_filter,
        completed_from=completed_from,
        completed_to=completed_to,
    )
    return OnboardingAnswerListResponse.build(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/onboarding/answers/{user_id}", response_model=OnboardingAnswerUserResponse)
async def get_user_onboarding_answers(
    user_id: UUID,
    _: CurrentPrincipal = Depends(require_admin_principal),
    service: AdminOnboardingAnswersService = Depends(get_admin_onboarding_answers_service),
) -> OnboardingAnswerUserResponse:
    snapshots = await service.list_user_answers(str(user_id))
    return OnboardingAnswerUserResponse.build(user_id=str(user_id), items=snapshots)


@router.get("/onboarding/answers/export")
async def export_onboarding_answers(
    batch_size: int = Query(500, ge=1, le=2000, description="Number of records fetched per batch"),
    _: CurrentPrincipal = Depends(require_admin_principal),
    service: AdminOnboardingAnswersService = Depends(get_admin_onboarding_answers_service),
) -> StreamingResponse:
    async def line_iterator():
        async for snapshot in service.stream_all_snapshots(batch_size=batch_size):
            payload = snapshot_to_dict(snapshot)
            line = json.dumps(payload, separators=(",", ":"))
            yield (line + "\n").encode("utf-8")

    filename = f"onboarding-answers-{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.ndjson"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(line_iterator(), media_type="application/x-ndjson", headers=headers)
