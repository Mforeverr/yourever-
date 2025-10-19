# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Huddle repository backed by SQLAlchemy.
"""

from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .models import HuddleModel
from .schemas import HuddleSummary


class HuddleRepository(Protocol):
    async def list_upcoming(self, principal: CurrentPrincipal) -> list[HuddleSummary]:
        ...


class SQLAlchemyHuddleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_upcoming(self, principal: CurrentPrincipal) -> list[HuddleSummary]:
        """
        CRITICAL SECURITY FIX: Apply proper scope filtering to prevent multi-tenant data leakage.

        This method was previously returning ALL huddles in the database without filtering
        by organization or division scope - a critical security vulnerability.
        """
        if not principal.org_ids:
            # User has no organization access - return empty list
            return []

        # Build query with organization scope filtering
        query = select(HuddleModel).where(HuddleModel.org_id.in_(principal.org_ids))

        # Apply division scope filtering if active division is set
        if principal.active_division_id:
            query = query.where(HuddleModel.division_id == principal.active_division_id)

        # Order by scheduled time
        query = query.order_by(HuddleModel.scheduled_at.asc())

        result = await self._session.execute(query)
        records = result.scalars().all()
        return [self._to_summary(record) for record in records]

    @staticmethod
    def _to_summary(record: HuddleModel) -> HuddleSummary:
        return HuddleSummary(
            id=record.id,
            title=record.title,
            description=record.description,
            scheduled_at=record.scheduled_at,
            org_id=record.org_id,
            division_id=record.division_id,
            updated_at=record.updated_at,
        )
