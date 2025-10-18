"""Persistence layer for user scope preferences."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True, slots=True)
class ScopePreference:
    """Domain object representing the persisted scope preference."""

    user_id: str
    org_id: str
    division_id: Optional[str]
    preference_type: str
    remembered_at: datetime
    updated_at: datetime


class ScopePreferenceRepository:
    """Repository coordinating reads/writes to user_scope_preferences."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_preference(
        self, user_id: str, preference_type: str = "workspace"
    ) -> Optional[ScopePreference]:
        query = text(
            """
            SELECT
                user_id,
                org_id,
                division_id,
                preference_type,
                remembered_at,
                updated_at
            FROM public.user_scope_preferences
            WHERE user_id = :user_id AND preference_type = :preference_type
            LIMIT 1
            """
        )
        result = await self._session.execute(
            query, {"user_id": user_id, "preference_type": preference_type}
        )
        row = result.mappings().first()
        if not row:
            return None
        return ScopePreference(
            user_id=str(row["user_id"]),
            org_id=str(row["org_id"]),
            division_id=str(row["division_id"]) if row["division_id"] else None,
            preference_type=row["preference_type"],
            remembered_at=row["remembered_at"],
            updated_at=row["updated_at"],
        )

    async def upsert_preference(
        self,
        *,
        user_id: str,
        org_id: str,
        division_id: Optional[str],
        preference_type: str = "workspace",
    ) -> ScopePreference:
        query = text(
            """
            INSERT INTO public.user_scope_preferences (
                user_id,
                preference_type,
                org_id,
                division_id,
                remembered_at
            ) VALUES (
                :user_id,
                :preference_type,
                :org_id,
                :division_id,
                NOW()
            )
            ON CONFLICT (user_id, preference_type)
            DO UPDATE SET
                org_id = EXCLUDED.org_id,
                division_id = EXCLUDED.division_id,
                remembered_at = EXCLUDED.remembered_at,
                updated_at = NOW()
            RETURNING
                user_id,
                org_id,
                division_id,
                preference_type,
                remembered_at,
                updated_at
            """
        )
        result = await self._session.execute(
            query,
            {
                "user_id": user_id,
                "preference_type": preference_type,
                "org_id": org_id,
                "division_id": division_id,
            },
        )
        row = result.mappings().first()
        await self._session.commit()
        assert row is not None
        return ScopePreference(
            user_id=str(row["user_id"]),
            org_id=str(row["org_id"]),
            division_id=str(row["division_id"]) if row["division_id"] else None,
            preference_type=row["preference_type"],
            remembered_at=row["remembered_at"],
            updated_at=row["updated_at"],
        )
