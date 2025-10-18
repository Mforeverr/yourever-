"""REST endpoints for reading and updating workspace scope."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, Request

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_scope_service
from .schemas import ScopeState, ScopeUpdateRequest, ScopeUpdateResponse
from .service import ScopeService

router = APIRouter(prefix="/api/scope", tags=["scope"])


@router.get("", response_model=ScopeState)
async def read_scope(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ScopeService = Depends(get_scope_service),
) -> ScopeState:
    return await service.get_scope(principal)


@router.post("", response_model=ScopeUpdateResponse)
async def update_scope(
    payload: ScopeUpdateRequest,
    request: Request,
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: ScopeService = Depends(get_scope_service),
) -> ScopeUpdateResponse:
    correlation_id = request.headers.get("x-request-id") or str(uuid4())
    state = await service.update_scope(
        principal,
        payload,
        request=request,
        correlation_id=correlation_id,
    )
    return ScopeUpdateResponse(**state.model_dump())
