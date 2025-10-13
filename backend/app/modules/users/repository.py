# Author: Codex (Senior Backend Scaffold)
# Date: 2025-10-11
# Role: Backend

"""
Repository functions for user profile and onboarding session persistence.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Mapping, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ...dependencies import CurrentPrincipal
from .constants import (
    CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION,
    coerce_onboarding_answer_schema_version,
    coerce_onboarding_status_version,
)
from .checksums import compute_status_checksum
from .publishers import (
    NullOnboardingAnswerPublisher,
    OnboardingAnswerMessage,
    OnboardingAnswerPublisher,
)
from .schemas import (
    OnboardingSession,
    StoredOnboardingStatus,
    WorkspaceDivision,
    WorkspaceOrganization,
    WorkspaceUser,
    new_onboarding_revision,
)


logger = logging.getLogger(__name__)


class UserRepository:
    def __init__(
        self,
        session: AsyncSession,
        answer_publisher: OnboardingAnswerPublisher | None = None,
    ) -> None:
        self._session = session
        self._answer_publisher: OnboardingAnswerPublisher = (
            answer_publisher or NullOnboardingAnswerPublisher()
        )

    @staticmethod
    def _ensure_mapping(value: Any) -> Dict[str, Any]:
        if isinstance(value, dict):
            return value
        if isinstance(value, Mapping):
            return dict(value)
        return {}

    def _serialize_status(self, status: StoredOnboardingStatus) -> tuple[dict, str]:
        status_payload = status.model_dump()
        data_payload = self._ensure_mapping(status_payload.get("data"))
        status_payload["data"] = data_payload
        checksum = compute_status_checksum(data_payload)
        status_payload["checksum"] = checksum
        return status_payload, checksum

    async def get_user(self, user_id: str) -> Optional[WorkspaceUser]:
        user_query = text(
            """
            SELECT
                id,
                email,
                COALESCE(name, '') AS name,
                COALESCE(display_name, '') AS display_name,
                COALESCE(full_name, '') AS full_name,
                avatar_url,
                timezone,
                role,
                created_at,
                updated_at
            FROM public.users
            WHERE id = :user_id
            """
        )
        user_result = await self._session.execute(user_query, {"user_id": user_id})
        row = user_result.mappings().first()
        if not row:
            return None

        organizations = await self._load_organizations(user_id)
        names = self._split_name(row["display_name"] or row["name"] or row["email"])

        return WorkspaceUser(
            id=str(row["id"]),
            email=row["email"],
            firstName=names["first_name"],
            lastName=names["last_name"],
            fullName=names["full_name"],
            displayName=names["display_name"],
            avatar=row["avatar_url"],
            avatarUrl=row["avatar_url"],
            role=row["role"],
            timezone=row["timezone"],
            organizations=organizations,
            createdAt=row["created_at"].isoformat() if row["created_at"] else None,
            updatedAt=row["updated_at"].isoformat() if row["updated_at"] else None,
        )

    async def create_user(self, principal: CurrentPrincipal) -> WorkspaceUser:
        email = principal.email or f"user_{principal.id}@example.com"
        username = email.split("@")[0]
        generated_name = username.replace(".", " ").replace("_", " ").title() or email
        names = self._split_name(generated_name)

        insert_query = text(
            """
            INSERT INTO public.users (
                id,
                email,
                name,
                display_name,
                full_name,
                username,
                role,
                timezone,
                created_at,
                updated_at
            ) VALUES (
                :id,
                :email,
                :name,
                :display_name,
                :full_name,
                :username,
                :role,
                :timezone,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING
            RETURNING id, email, name, display_name, full_name, avatar_url, timezone, role, created_at, updated_at
            """
        )

        result = await self._session.execute(
            insert_query,
            {
                "id": principal.id,
                "email": email,
                "name": names["full_name"] or generated_name,
                "display_name": names["display_name"] or generated_name,
                "full_name": names["full_name"] or generated_name,
                "username": username,
                "role": principal.role or "member",
                "timezone": "UTC",
            },
        )
        row = result.mappings().first()
        if not row:
            # Row already existed, fetch via get_user to normalise
            return await self.get_user(principal.id)  # type: ignore[return-value]

        await self._session.commit()
        organizations: List[WorkspaceOrganization] = []
        names = self._split_name(row["display_name"] or row["name"] or row["email"])
        return WorkspaceUser(
            id=str(row["id"]),
            email=row["email"],
            firstName=names["first_name"],
            lastName=names["last_name"],
            fullName=names["full_name"],
            displayName=names["display_name"],
            avatar=row["avatar_url"],
            avatarUrl=row["avatar_url"],
            role=principal.role or "member",
            timezone=row["timezone"],
            organizations=organizations,
            createdAt=row["created_at"].isoformat() if row["created_at"] else None,
            updatedAt=row["updated_at"].isoformat() if row["updated_at"] else None,
        )

    async def _load_organizations(self, user_id: str) -> List[WorkspaceOrganization]:
        membership_query = text(
            """
            SELECT
                om.org_id,
                om.role AS membership_role,
                org.name,
                org.slug,
                org.description
            FROM public.org_memberships AS om
            INNER JOIN public.organizations AS org ON org.id = om.org_id
            WHERE om.user_id = :user_id
            """
        )
        membership_result = await self._session.execute(membership_query, {"user_id": user_id})
        membership_rows = membership_result.mappings().all()

        if not membership_rows:
            return []

        org_ids = [row["org_id"] for row in membership_rows]
        divisions_by_org = await self._load_divisions(org_ids)
        division_memberships = await self._load_division_memberships(user_id)

        organizations: List[WorkspaceOrganization] = []
        for row in membership_rows:
            org_divisions = divisions_by_org.get(row["org_id"], [])
            user_divisions = division_memberships.get(row["org_id"], [])
            merged_divisions = self._merge_divisions(org_divisions, user_divisions)

            organizations.append(
                WorkspaceOrganization(
                    id=str(row["org_id"]),
                    name=row["name"],
                    slug=row["slug"],
                    description=row["description"],
                    divisions=merged_divisions,
                    userRole=row["membership_role"],
                )
            )

        return organizations

    async def _load_divisions(self, org_ids: List[str]) -> Dict[str, List[WorkspaceDivision]]:
        divisions_by_org: Dict[str, List[WorkspaceDivision]] = {}
        if not org_ids:
            return divisions_by_org

        divisions_query = text(
            """
            SELECT id, name, key, description, org_id
            FROM public.divisions
            WHERE org_id = :org_id
            """
        )

        for org_id in org_ids:
            result = await self._session.execute(divisions_query, {"org_id": org_id})
            for row in result.mappings():
                divisions_by_org.setdefault(org_id, []).append(
                    WorkspaceDivision(
                        id=str(row["id"]),
                        name=row["name"],
                        key=row["key"],
                        description=row["description"],
                        orgId=org_id,
                    )
                )

        return divisions_by_org

    async def _load_division_memberships(self, user_id: str) -> Dict[str, List[WorkspaceDivision]]:
        membership_query = text(
            """
            SELECT
                dm.role,
                dm.division_id,
                div.id,
                div.name,
                div.key,
                div.description,
                div.org_id
            FROM public.division_memberships AS dm
            INNER JOIN public.divisions AS div ON div.id = dm.division_id
            WHERE dm.user_id = :user_id
            """
        )
        result = await self._session.execute(membership_query, {"user_id": user_id})
        divisions_by_org: Dict[str, List[WorkspaceDivision]] = {}
        for row in result.mappings():
            org_id = row["org_id"]
            divisions_by_org.setdefault(org_id, []).append(
                WorkspaceDivision(
                    id=str(row["id"]),
                    name=row["name"],
                    key=row["key"],
                    description=row["description"],
                    orgId=org_id,
                    userRole=row["role"],
                )
            )
        return divisions_by_org

    async def get_or_create_onboarding_session(self, user_id: str) -> OnboardingSession:
        select_query = text(
            """
            SELECT id, user_id, current_step, is_completed, data, started_at, completed_at
            FROM public.onboarding_sessions
            WHERE user_id = :user_id
            """
        )
        result = await self._session.execute(select_query, {"user_id": user_id})
        row = result.mappings().first()

        if not row:
            insert_query = text(
                """
                INSERT INTO public.onboarding_sessions (user_id, current_step, is_completed, data)
                VALUES (:user_id, :current_step, :is_completed, CAST(:data AS jsonb))
                ON CONFLICT (user_id) DO NOTHING
                RETURNING id, user_id, current_step, is_completed, data, started_at, completed_at
                """
            )
            status = StoredOnboardingStatus(revision=new_onboarding_revision())
            result = await self._session.execute(
                insert_query,
                {
                    "user_id": user_id,
                    "current_step": status.lastStep or "profile",
                    "is_completed": status.completed,
                    "data": json.dumps(self._build_status_envelope(status)),
                },
            )
            row = result.mappings().first()
            await self._session.commit()

            if not row:
                # If the insert didn't return (row existed), fetch again
                result = await self._session.execute(select_query, {"user_id": user_id})
                row = result.mappings().first()

        return self._to_onboarding_session(row)

    async def update_onboarding_status(
        self,
        user_id: str,
        status: StoredOnboardingStatus,
    ) -> OnboardingSession:
        update_query = text(
            """
            UPDATE public.onboarding_sessions
            SET
                current_step = :current_step,
                is_completed = :is_completed,
                data = CAST(:data AS jsonb),
                completed_at = CASE WHEN :is_completed THEN NOW() ELSE NULL END
            WHERE user_id = :user_id
            RETURNING id, user_id, current_step, is_completed, data, started_at, completed_at
            """
        )

        result = await self._session.execute(
            update_query,
            {
                "user_id": user_id,
                "current_step": status.lastStep or "profile",
                "is_completed": status.completed,
                "data": json.dumps(
                    self._build_status_envelope(status),
                ),
            },
        )
        row = result.mappings().first()

        if not row:
            # No session existed; create it
            return await self.get_or_create_onboarding_session(user_id)

        await self._session.commit()
        return self._to_onboarding_session(row)

    async def _publish_completion(
        self, row, answers: Optional[Dict[str, Any]]
    ) -> None:
        """Forward the finalized onboarding payload to the aggregation queue."""

        if not row:
            return

        completed_at = row.get("completed_at")
        if not completed_at:
            logger.warning(
                "onboarding.answers.publisher.missing_completed_at",
                extra={"session_id": row.get("id"), "user_id": row.get("user_id")},
            )
            return

        stored_answers: Dict[str, Any] = {}
        schema_version = CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION
        if answers:
            stored_answers = dict(answers)
        else:
            raw_data = row.get("data")
            if isinstance(raw_data, str):
                try:
                    raw_data = json.loads(raw_data)
                except json.JSONDecodeError:
                    raw_data = {}
            if isinstance(raw_data, dict):
                stored_answers = raw_data.get("answers") or {}
                schema_version_value = (
                    raw_data.get("answer_schema_version")
                    or raw_data.get("answerSchemaVersion")
                )
                if schema_version_value is not None:
                    schema_version = coerce_onboarding_answer_schema_version(
                        schema_version_value
                    )
        if stored_answers and not isinstance(stored_answers, dict):
            stored_answers = dict(stored_answers)

        message = OnboardingAnswerMessage(
            user_id=str(row.get("user_id")),
            session_id=str(row.get("id")),
            completed_at=completed_at,
            answers=stored_answers,
            answer_schema_version=schema_version,
        )

        try:
            await self._answer_publisher.publish(message)
        except Exception:
            # Publishing failures should not block onboarding completion.
            logger.exception(
                "onboarding.answers.publisher.error",
                extra={"session_id": message.session_id, "user_id": message.user_id},
            )

    async def complete_onboarding(
        self,
        user_id: str,
        status: StoredOnboardingStatus,
        answers: Optional[Dict[str, Any]] = None,
    ) -> OnboardingSession:
        """Mark onboarding as complete and persist the final payload."""

        # Ensure a session exists before attempting to update completion state.
        await self.get_or_create_onboarding_session(user_id)

        last_step = (
            status.lastStep
            or (status.completedSteps[-1] if status.completedSteps else None)
            or "workspace-hub"
        )
        final_status = status.model_copy(
            update={
                "completed": True,
                "lastStep": last_step,
            }
        )

        payload: Dict[str, Any] = self._build_status_envelope(final_status)
        payload["answerSchemaVersion"] = CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION
        payload["answer_schema_version"] = CURRENT_ONBOARDING_ANSWER_SCHEMA_VERSION
        if answers:
            payload["answers"] = answers

        update_query = text(
            """
            UPDATE public.onboarding_sessions
            SET
                current_step = :current_step,
                is_completed = TRUE,
                data = CAST(:data AS jsonb),
                completed_at = NOW()
            WHERE user_id = :user_id
            RETURNING id, user_id, current_step, is_completed, data, started_at, completed_at
            """
        )

        result = await self._session.execute(
            update_query,
            {
                "user_id": user_id,
                "current_step": last_step,
                "data": json.dumps(payload),
            },
        )
        row = result.mappings().first()

        if not row:
            # Fallback to ensure we always return a session snapshot.
            return await self.get_or_create_onboarding_session(user_id)

        await self._session.commit()
        await self._publish_completion(row, answers)
        return self._to_onboarding_session(row)

    def _merge_divisions(
        self,
        base_divisions: List[WorkspaceDivision],
        membership_divisions: List[WorkspaceDivision],
    ) -> List[WorkspaceDivision]:
        merged: Dict[str, WorkspaceDivision] = {division.id: division for division in base_divisions}
        for division in membership_divisions:
            if division.id in merged:
                base = merged[division.id]
                merged[division.id] = WorkspaceDivision(
                    id=base.id,
                    name=base.name,
                    key=base.key,
                    description=base.description,
                    orgId=base.orgId,
                    userRole=division.userRole or base.userRole,
                )
            else:
                merged[division.id] = division
        return list(merged.values())

    def _to_onboarding_session(self, row) -> OnboardingSession:
        if not row:
            raise ValueError("Onboarding session row is required")

        raw_data = row["data"] or {}
        if isinstance(raw_data, str):
            try:
                raw_data = json.loads(raw_data)
            except json.JSONDecodeError:
                raw_data = {}
        checksum_hint = None
        if isinstance(raw_data, dict):
            checksum_hint = raw_data.get("statusChecksum") or raw_data.get("status_checksum")

        status_payload = raw_data.get("status") if isinstance(raw_data, dict) else {}
        if isinstance(status_payload, dict):
            status_payload = self._normalize_status_payload(status_payload, checksum_hint)
        status = StoredOnboardingStatus(**status_payload) if status_payload else StoredOnboardingStatus()

        return OnboardingSession(
            id=str(row["id"]),
            userId=str(row["user_id"]),
            currentStep=row["current_step"] or status.lastStep or "profile",
            isCompleted=bool(row["is_completed"]),
            startedAt=row["started_at"].isoformat() if row["started_at"] else None,
            completedAt=row["completed_at"].isoformat() if row["completed_at"] else None,
            status=status,
        )

    @staticmethod
    def _split_name(display_name: str) -> dict:
        tokens = (display_name or "").strip().split()
        first_name = tokens[0] if tokens else ""
        last_name = " ".join(tokens[1:]) if len(tokens) > 1 else ""
        full_name = display_name or f"{first_name} {last_name}".strip() or first_name or last_name
        final_display = display_name or full_name or first_name or last_name
        return {
            "first_name": first_name or full_name or final_display or "",
            "last_name": last_name,
            "full_name": full_name or final_display or "",
            "display_name": final_display or full_name or "",
        }

    @staticmethod
    def _normalize_status_payload(payload: dict, checksum_hint: Optional[str] = None) -> dict:
        normalized = payload.copy()
        if "completed_steps" in normalized and "completedSteps" not in normalized:
            normalized["completedSteps"] = normalized.pop("completed_steps")
        if "skipped_steps" in normalized and "skippedSteps" not in normalized:
            normalized["skippedSteps"] = normalized.pop("skipped_steps")
        if "last_step" in normalized and "lastStep" not in normalized:
            normalized["lastStep"] = normalized.pop("last_step")
        normalized["version"] = coerce_onboarding_status_version(normalized.get("version"))
        revision = normalized.get("revision")
        if isinstance(revision, str):
            revision = revision.strip() or None
        elif revision is not None:
            revision = None
        normalized["revision"] = revision
        checksum_candidate = (
            (checksum_hint or normalized.get("checksum") or "")
            if isinstance(checksum_hint, str) or isinstance(normalized.get("checksum"), str)
            else ""
        )
        checksum_value = checksum_candidate.strip()
        if checksum_value:
            normalized["checksum"] = checksum_value
        else:
            normalized["checksum"] = compute_status_checksum(
                UserRepository._ensure_mapping(normalized.get("data"))
            )
        return normalized

    def _build_status_envelope(self, status: StoredOnboardingStatus) -> Dict[str, Any]:
        status_payload, status_checksum = self._serialize_status(status)
        return {
            "status": status_payload,
            "statusChecksum": status_checksum,
            "status_checksum": status_checksum,
        }
