# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Huddles REST endpoints.
"""

from fastapi import APIRouter, Depends

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_huddle_service
from .schemas import HuddleListResponse
from .service import HuddleService

router = APIRouter(prefix="/api/huddles", tags=["huddles"])


@router.get("", response_model=HuddleListResponse)
async def list_huddles(
    principal: CurrentPrincipal = Depends(require_current_principal),
    service: HuddleService = Depends(get_huddle_service),
) -> HuddleListResponse:
    huddles = await service.list_upcoming(principal)
    return HuddleListResponse(results=huddles)
