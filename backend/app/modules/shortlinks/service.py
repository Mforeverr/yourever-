"""Service layer for resolving shortlinks into canonical workspace URLs."""

from __future__ import annotations

import logging

from .repository import ShortlinkRepository
from .schemas import ShortlinkResolution, ShortlinkType

logger = logging.getLogger(__name__)


class ShortlinkNotFoundError(ValueError):
    """Raised when the requested shortlink target cannot be located."""


class ShortlinkScopeError(ValueError):
    """Raised when a shortlink target lacks the information required to scope it."""


_SEGMENT_BY_TYPE: dict[ShortlinkType, str] = {
    ShortlinkType.PROJECT: "p",
    ShortlinkType.TASK: "t",
    ShortlinkType.CHANNEL: "c",
}


class ShortlinkService:
    """Coordinates repository lookups and produces canonical URLs."""

    def __init__(self, repository: ShortlinkRepository) -> None:
        self._repository = repository

    async def resolve(self, shortlink_type: ShortlinkType, entity_id: str) -> ShortlinkResolution:
        """Resolve a shortlink to its scoped workspace URL."""

        resolver = {
            ShortlinkType.PROJECT: self._repository.fetch_project_scope,
            ShortlinkType.TASK: self._repository.fetch_task_scope,
            ShortlinkType.CHANNEL: self._repository.fetch_channel_scope,
        }[shortlink_type]

        scope = await resolver(entity_id)
        if scope is None:
            logger.info(
                "shortlinks.resolve.not_found",
                extra={"type": shortlink_type.value, "entity_id": entity_id},
            )
            raise ShortlinkNotFoundError("Shortlink target was not found.")

        org_slug, division_key = scope
        if not org_slug or not division_key:
            logger.warning(
                "shortlinks.resolve.missing_scope",
                extra={"type": shortlink_type.value, "entity_id": entity_id},
            )
            raise ShortlinkScopeError(
                "Shortlink target is missing division context for routing.",
            )

        segment = _SEGMENT_BY_TYPE[shortlink_type]
        scoped_url = f"/{org_slug}/{division_key}/{segment}/{entity_id}"
        return ShortlinkResolution(scoped_url=scoped_url)
