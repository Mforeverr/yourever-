"""Persistence helpers for auth audit events."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True, slots=True)
class AuthEvent:
    """Domain object describing an auth event for audit logging."""

    user_id: str
    event_type: str
    ip_hash: Optional[str]
    user_agent: Optional[str]
    metadata: Dict[str, Any]


class AuthEventRepository:
    """Repository dedicated to inserting auth_events rows."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record(self, event: AuthEvent) -> None:
        query = text(
            """
            INSERT INTO public.auth_events (
                id,
                user_id,
                event_type,
                occurred_at,
                ip_hash,
                user_agent,
                metadata_json
            ) VALUES (
                :id,
                :user_id,
                :event_type,
                NOW(),
                :ip_hash,
                :user_agent,
                :metadata_json::jsonb
            )
            """
        )

        payload = {
            "id": str(uuid4()),
            "user_id": event.user_id,
            "event_type": event.event_type,
            "ip_hash": event.ip_hash,
            "user_agent": event.user_agent,
            "metadata_json": json.dumps(event.metadata or {}),
        }

        await self._session.execute(query, payload)
        await self._session.commit()

