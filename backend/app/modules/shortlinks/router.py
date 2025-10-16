"""REST endpoints for resolving entity shortlinks."""

from fastapi import APIRouter, Depends, HTTPException, status

from ...dependencies import CurrentPrincipal, require_current_principal
from .di import get_shortlink_service
from .schemas import ShortlinkResolution, ShortlinkType
from .service import ShortlinkNotFoundError, ShortlinkScopeError, ShortlinkService

router = APIRouter(prefix="/api/shortlinks", tags=["shortlinks"])


@router.get("/resolve/{shortlink_type}/{entity_id}", response_model=ShortlinkResolution)
async def resolve_shortlink(
    shortlink_type: ShortlinkType,
    entity_id: str,
    _principal: CurrentPrincipal = Depends(require_current_principal),
    service: ShortlinkService = Depends(get_shortlink_service),
) -> ShortlinkResolution:
    """Resolve a shortlink to its scoped workspace URL."""

    try:
        return await service.resolve(shortlink_type, entity_id)
    except ShortlinkNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ShortlinkScopeError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
