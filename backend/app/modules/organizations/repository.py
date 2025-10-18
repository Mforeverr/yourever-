"""
Repository functions for organization management.
"""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import bindparam, text, null, JSON
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import (
    DivisionCreate,
    DivisionResponse,
    InvitationBatchCreateRequest,
    InvitationBatchCreateResponse,
    InvitationCreatePayload,
    InvitationResponse,
    OrganizationCreate,
    OrganizationResponse,
    TemplateResponse,
)

logger = logging.getLogger(__name__)


class SlugError(ValueError):
    """Base error for slug validation issues."""


class SlugValidationError(SlugError):
    """Raised when a slug fails validation rules."""


class SlugConflictError(SlugError):
    """Raised when attempting to use a slug that already exists."""


class DivisionValidationError(ValueError):
    """Raised when division validation fails."""


class DivisionDuplicateError(DivisionValidationError):
    """Raised when duplicate division names or keys are detected."""


MAX_SLUG_LENGTH = 63


class OrganizationRepository:
    """Repository for managing organizations, divisions, and invitations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _reset_transaction(self) -> None:
        """Ensure the session is ready for an explicit transaction."""

        if self._session.in_transaction():
            await self._session.rollback()

    @staticmethod
    def _map_invitation(row: Dict[str, Any]) -> InvitationResponse:
        """Normalize invitation rows returned from SQL queries."""

        return InvitationResponse(
            id=str(row["id"]),
            token=None,
            email=row["email"],
            org_id=str(row.get("org_id")) if row.get("org_id") else None,
            division_id=str(row.get("division_id")) if row.get("division_id") else None,
            role=row.get("role", "member"),
            message=row.get("message"),
            status=row.get("status", "pending"),
            expires_at=row.get("expires_at"),
            created_at=row.get("created_at", datetime.utcnow()),
            updated_at=row.get("updated_at"),
            accepted_at=row.get("accepted_at"),
            declined_at=row.get("declined_at"),
            inviter_id=str(row.get("inviter_id")) if row.get("inviter_id") else None,
            inviter_name=row.get("inviter_name"),
            org_name=row.get("org_name"),
            division_name=row.get("division_name"),
            token_hash=row.get("token_hash"),
        )

    @staticmethod
    def _hash_token(raw_token: str) -> str:
        digest = hashlib.sha256(raw_token.encode("utf-8"))
        return digest.hexdigest()

    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate a URL-friendly slug from organization name."""
        # Convert to lowercase and replace spaces/underscores with hyphens
        slug = name.lower()
        slug = re.sub(r'[\s_]+', '-', slug)
        # Remove special characters except hyphens
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        # Remove consecutive hyphens
        slug = re.sub(r'-+', '-', slug)
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        if len(slug) > MAX_SLUG_LENGTH:
            slug = slug[:MAX_SLUG_LENGTH]
            slug = slug.strip('-')
        return slug

    async def check_slug_availability(self, slug: str) -> bool:
        """Check if a slug is available for use."""
        query = text(
            """
            SELECT COUNT(*) as count
            FROM public.organizations
            WHERE slug = :slug AND deleted_at IS NULL
            """
        )
        result = await self._session.execute(query, {"slug": slug})
        count = result.scalar()
        return count == 0

    async def generate_unique_slug(self, base_name: str) -> str:
        """Generate a unique slug from base name."""
        base_slug = self.generate_slug(base_name)

        if not base_slug:
            raise SlugValidationError(
                "Slug must include at least one alphanumeric character.",
            )

        if await self.check_slug_availability(base_slug):
            return base_slug

        # Add numeric suffix if slug is taken
        counter = 1
        while True:
            suffix = f"-{counter}"
            trimmed_base = base_slug
            if len(trimmed_base) + len(suffix) > MAX_SLUG_LENGTH:
                trimmed_base = trimmed_base[: MAX_SLUG_LENGTH - len(suffix)]
                trimmed_base = trimmed_base.rstrip('-')
            if not trimmed_base:
                raise SlugValidationError(
                    "Unable to generate unique slug from the provided name.",
                )
            candidate_slug = f"{trimmed_base}{suffix}"
            if await self.check_slug_availability(candidate_slug):
                return candidate_slug
            counter += 1
            if counter > 1000:  # Safety limit
                raise ValueError("Unable to generate unique slug")

    def _validate_divisions(self, divisions: List[DivisionCreate]) -> None:
        """Validate divisions for uniqueness and proper format."""
        if not divisions:
            raise DivisionValidationError("At least one division must be provided")

        # Check for duplicate division names
        division_names = [d.name.lower().strip() for d in divisions]
        if len(division_names) != len(set(division_names)):
            raise DivisionDuplicateError("Division names must be unique within an organization")

        # Check for duplicate division keys
        division_keys = []
        for division in divisions:
            if division.key:
                key = self.generate_slug(division.key)
                if not key:
                    raise DivisionValidationError(f"Division key '{division.key}' is invalid")
                division_keys.append(key)

        if len(division_keys) != len(set(division_keys)):
            raise DivisionDuplicateError("Division keys must be unique within an organization")

    def _prepare_division_data(self, divisions: List[DivisionCreate]) -> List[Dict[str, Any]]:
        """Prepare division data for database insertion."""
        prepared_divisions = []
        for division in divisions:
            # Generate division key if not provided
            division_key = division.key or self.generate_slug(division.name)
            if not division_key:
                raise DivisionValidationError(
                    f"Division key for '{division.name}' must include at least one alphanumeric character."
                )

            # Normalize the key
            division_key = self.generate_slug(division_key)

            prepared_divisions.append({
                "id": str(uuid.uuid4()),
                "name": division.name.strip(),
                "key": division_key,
                "description": division.description.strip() if division.description else None
            })

        return prepared_divisions

    async def suggest_slug_variants(self, slug: str, limit: int = 3) -> list[str]:
        """Generate a list of available slug suggestions."""

        suggestions: list[str] = []
        base_slug = slug or ""
        counter = 1
        max_attempts = max(limit * 5, 5)

        while len(suggestions) < limit and counter <= max_attempts:
            candidate = f"{base_slug}-{counter}"
            if await self.check_slug_availability(candidate):
                suggestions.append(candidate)
            counter += 1

        return suggestions

    async def get_user_organizations(self, user_id: str) -> List[OrganizationResponse]:
        """Get all organizations for a user with their roles."""
        query = text(
            """
            SELECT
                o.id,
                o.name,
                o.slug,
                o.description,
                o.logo_url,
                o.created_at,
                om.role AS user_role
            FROM public.organizations o
            INNER JOIN public.org_memberships om ON o.id = om.org_id
            WHERE om.user_id = :user_id AND o.deleted_at IS NULL
            ORDER BY om.role, o.created_at
            """
        )
        result = await self._session.execute(query, {"user_id": user_id})
        rows = result.mappings().all()

        org_ids = [str(row["id"]) for row in rows]
        metrics_by_org = await self._load_hub_metrics(org_ids)

        organizations = []
        for row in rows:
            # Get divisions for this organization
            divisions = await self._get_organization_divisions(row["id"], user_id)

            metrics = metrics_by_org.get(str(row["id"]), {})

            organizations.append(
                OrganizationResponse(
                    id=str(row["id"]),
                    name=row["name"],
                    slug=row["slug"],
                    description=row["description"],
                    logo_url=row["logo_url"],
                    created_at=row["created_at"],
                    divisions=divisions,
                    user_role=row["user_role"],
                    member_count=metrics.get("member_count"),
                    active_projects=metrics.get("active_projects"),
                    last_active_at=metrics.get("last_active_at"),
                )
            )

        return organizations

    async def _get_organization_divisions(self, org_id: str, user_id: str) -> List[DivisionResponse]:
        """Get divisions for an organization with user's role."""
        query = text(
            """
            SELECT
                d.id,
                d.name,
                d.key,
                d.description,
                d.org_id,
                d.created_at,
                dm.role AS user_role
            FROM public.divisions d
            LEFT JOIN public.division_memberships dm
                ON d.id = dm.division_id AND dm.user_id = :user_id
            WHERE d.org_id = :org_id AND d.deleted_at IS NULL
            ORDER BY d.created_at
            """
        )
        result = await self._session.execute(query, {"org_id": org_id, "user_id": user_id})
        rows = result.mappings().all()

        return [
            DivisionResponse(
                id=str(row["id"]),
                name=row["name"],
                key=row["key"],
                description=row["description"],
                org_id=str(row["org_id"]),
                created_at=row["created_at"],
                user_role=row["user_role"]
            )
            for row in rows
        ]

    async def _load_hub_metrics(self, org_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Load aggregated metrics used by the workspace hub."""

        if not org_ids:
            return {}

        metrics_query = text(
            """
            WITH member_counts AS (
                SELECT org_id, COUNT(*) AS member_count
                FROM public.org_memberships
                WHERE org_id = ANY(:org_ids)
                GROUP BY org_id
            ),
            project_stats AS (
                SELECT
                    org_id,
                    COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS active_projects,
                    MAX(updated_at) AS last_project_activity
                FROM public.projects
                WHERE org_id = ANY(:org_ids)
                GROUP BY org_id
            ),
            channel_stats AS (
                SELECT
                    org_id,
                    MAX(updated_at) AS last_channel_activity
                FROM public.channels
                WHERE org_id = ANY(:org_ids)
                GROUP BY org_id
            )
            SELECT
                o.id,
                COALESCE(mc.member_count, 0) AS member_count,
                COALESCE(ps.active_projects, 0) AS active_projects,
                GREATEST(
                    COALESCE(ps.last_project_activity, to_timestamp(0)),
                    COALESCE(cs.last_channel_activity, to_timestamp(0)),
                    COALESCE(o.updated_at, to_timestamp(0))
                ) AS last_active_at
            FROM public.organizations o
            LEFT JOIN member_counts mc ON mc.org_id = o.id
            LEFT JOIN project_stats ps ON ps.org_id = o.id
            LEFT JOIN channel_stats cs ON cs.org_id = o.id
            WHERE o.id = ANY(:org_ids)
            """
        ).bindparams(bindparam("org_ids", expanding=True))

        result = await self._session.execute(metrics_query, {"org_ids": org_ids})
        metrics: Dict[str, Dict[str, Any]] = {}
        for row in result.mappings():
            metrics[str(row["id"])] = {
                "member_count": row["member_count"],
                "active_projects": row["active_projects"],
                "last_active_at": row["last_active_at"],
            }

        return metrics

    async def create_organization(
        self,
        user_id: str,
        create_data: OrganizationCreate
    ) -> Tuple[OrganizationResponse, List[DivisionResponse]]:
        """Create a new organization with multiple divisions."""

        # Generate or validate slug
        if create_data.slug:
            slug = self.generate_slug(create_data.slug)
            if not slug:
                raise SlugValidationError(
                    "Slug must include at least one alphanumeric character.",
                )
            if not await self.check_slug_availability(slug):
                raise SlugConflictError(f"Slug '{slug}' is already taken")
        else:
            slug = await self.generate_unique_slug(create_data.name)

        # Get and validate divisions
        divisions_to_create = create_data.get_divisions_to_create()
        self._validate_divisions(divisions_to_create)
        prepared_divisions = self._prepare_division_data(divisions_to_create)

        try:
            # Start transaction
            await self._reset_transaction()
            await self._session.begin()

            # Create organization
            org_query = text(
                """
                INSERT INTO public.organizations (
                    id, name, slug, description, logo_url, created_at
                ) VALUES (
                    :id, :name, :slug, :description, :logo_url, NOW()
                )
                RETURNING id, name, slug, description, logo_url, created_at
                """
            )

            org_id = str(uuid.uuid4())
            org_result = await self._session.execute(org_query, {
                "id": org_id,
                "name": create_data.name,
                "slug": slug,
                "description": create_data.description,
                "logo_url": None
            })
            org_row = org_result.mappings().first()

            # Create divisions
            division_rows = []
            for division_data in prepared_divisions:
                division_query = text(
                    """
                    INSERT INTO public.divisions (
                        id, org_id, name, key, description, created_at
                    ) VALUES (
                        :id, :org_id, :name, :key, :description, NOW()
                    )
                    RETURNING id, name, key, description, org_id, created_at
                    """
                )

                division_result = await self._session.execute(division_query, {
                    "id": division_data["id"],
                    "org_id": org_id,
                    "name": division_data["name"],
                    "key": division_data["key"],
                    "description": division_data["description"]
                })
                division_rows.append(division_result.mappings().first())

            # Create organization membership (owner)
            membership_query = text(
                """
                INSERT INTO public.org_memberships (org_id, user_id, role, joined_at)
                VALUES (:org_id, :user_id, 'owner', NOW())
                """
            )
            await self._session.execute(membership_query, {
                "org_id": org_id,
                "user_id": user_id
            })

            # Create division memberships (lead for first division, member for others)
            for i, division_row in enumerate(division_rows):
                role = "lead" if i == 0 else "contributor"
                div_membership_query = text(
                    """
                    INSERT INTO public.division_memberships (division_id, user_id, role, joined_at)
                    VALUES (:division_id, :user_id, :role, NOW())
                    """
                )
                await self._session.execute(div_membership_query, {
                    "division_id": division_row["id"],
                    "user_id": user_id,
                    "role": role
                })

            # Create organization settings
            settings_query = text(
                """
                INSERT INTO public.organization_settings (
                    id, org_id, default_tools, invitation_token, created_at, updated_at
                ) VALUES (
                    :id, :org_id, :default_tools, :invitation_token, NOW(), NOW()
                )
                """
            )

            settings_id = str(uuid.uuid4())
            invitation_token = str(uuid.uuid4())
            default_tools = {}

            # Apply template if specified
            if create_data.template_id:
                template = await self.get_template(create_data.template_id)
                if template:
                    default_tools = template.tools

            # Handle JSON field properly - use None for empty dict to avoid encoding issues
            if not default_tools:
                default_tools = None

            await self._session.execute(settings_query, {
                "id": settings_id,
                "org_id": org_id,
                "default_tools": default_tools,
                "invitation_token": invitation_token
            })

            # Commit transaction
            await self._session.commit()

            # Create response objects
            division_responses = []
            for i, division_row in enumerate(division_rows):
                role = "lead" if i == 0 else "contributor"
                division_responses.append(DivisionResponse(
                    id=str(division_row["id"]),
                    name=division_row["name"],
                    key=division_row["key"],
                    description=division_row["description"],
                    org_id=str(division_row["org_id"]),
                    created_at=division_row["created_at"],
                    user_role=role
                ))

            organization = OrganizationResponse(
                id=str(org_row["id"]),
                name=org_row["name"],
                slug=org_row["slug"],
                description=org_row["description"],
                logo_url=org_row["logo_url"],
                created_at=org_row["created_at"],
                divisions=division_responses,
                user_role="owner"
            )

            return organization, division_responses

        except Exception as e:
            await self._session.rollback()
            logger.error(f"Error creating organization: {e}")
            raise

    async def get_pending_invitations(self, user_email: str) -> List[InvitationResponse]:
        """Get pending invitations for a user's email."""

        query = text(
            """
            SELECT
                i.id,
                i.email,
                i.org_id,
                i.division_id,
                i.role,
                i.message,
                i.status,
                i.expires_at,
                i.created_at,
                i.updated_at,
                i.accepted_at,
                i.declined_at,
                i.inviter_id,
                i.token_hash,
                o.name AS org_name,
                d.name AS division_name,
                u.display_name AS inviter_name
            FROM public.invitations i
            LEFT JOIN public.organizations o ON i.org_id = o.id
            LEFT JOIN public.divisions d ON i.division_id = d.id
            LEFT JOIN public.users u ON i.inviter_id = u.id
            WHERE LOWER(i.email) = LOWER(:email)
                AND i.status = 'pending'
                AND (i.expires_at IS NULL OR i.expires_at > NOW())
                AND i.deleted_at IS NULL
                AND (o.id IS NULL OR o.deleted_at IS NULL)
            ORDER BY i.created_at DESC
            """
        )
        result = await self._session.execute(query, {"email": user_email})
        rows = result.mappings().all()

        return [self._map_invitation(dict(row)) for row in rows]

    async def expire_stale_invitations(self) -> int:
        """Mark invitations as expired when their deadline passes."""

        query = text(
            """
            UPDATE public.invitations
            SET status = 'expired', updated_at = NOW()
            WHERE status = 'pending'
              AND deleted_at IS NULL
              AND expires_at IS NOT NULL
              AND expires_at <= NOW()
            """
        )

        await self._reset_transaction()
        await self._session.begin()
        try:
            result = await self._session.execute(query)
            await self._session.commit()
            return result.rowcount or 0
        except Exception as error:
            await self._session.rollback()
            logger.error("Error expiring invitations", exc_info=error)
            raise

    async def accept_invitation(
        self,
        invitation_id: str,
        user_id: str,
        user_email: str,
    ) -> Optional[OrganizationResponse]:
        """Accept an invitation and join the organization."""

        try:
            await self._reset_transaction()
            await self._session.begin()

            inv_query = text(
                """
                SELECT id, email, org_id, division_id, role
                FROM public.invitations
                WHERE id = :invitation_id
                    AND status = 'pending'
                    AND deleted_at IS NULL
                    AND (expires_at IS NULL OR expires_at > NOW())
                    AND LOWER(email) = LOWER(:email)
                FOR UPDATE
                """
            )
            inv_result = await self._session.execute(
                inv_query,
                {"invitation_id": invitation_id, "email": user_email},
            )
            inv_row = inv_result.mappings().first()

            if not inv_row:
                await self._session.rollback()
                return None

            update_inv_query = text(
                """
                UPDATE public.invitations
                SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
                WHERE id = :id
                """
            )
            await self._session.execute(update_inv_query, {"id": inv_row["id"]})

            org_membership_query = text(
                """
                INSERT INTO public.org_memberships (org_id, user_id, role, joined_at)
                VALUES (:org_id, :user_id, :role, NOW())
                ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role
                """
            )
            await self._session.execute(
                org_membership_query,
                {
                    "org_id": inv_row["org_id"],
                    "user_id": user_id,
                    "role": inv_row["role"],
                },
            )

            if inv_row["division_id"]:
                div_membership_query = text(
                    """
                    INSERT INTO public.division_memberships (division_id, user_id, role, joined_at)
                    VALUES (:division_id, :user_id, :role, NOW())
                    ON CONFLICT (division_id, user_id) DO UPDATE SET role = EXCLUDED.role
                    """
                )
                await self._session.execute(
                    div_membership_query,
                    {
                        "division_id": inv_row["division_id"],
                        "user_id": user_id,
                        "role": inv_row["role"],
                    },
                )

            await self._session.commit()

            organizations = await self.get_user_organizations(user_id)
            return next((org for org in organizations if org.id == str(inv_row["org_id"])), None)

        except Exception as error:
            await self._session.rollback()
            logger.error("Error accepting invitation", exc_info=error)
            raise

    async def decline_invitation(
        self,
        invitation_id: str,
        user_email: str,
    ) -> Optional[InvitationResponse]:
        """Decline an invitation, marking it as no longer pending."""

        try:
            await self._reset_transaction()
            await self._session.begin()

            query = text(
                """
                SELECT id, email, org_id, division_id, role, message, status, expires_at,
                       created_at, updated_at, accepted_at, declined_at, inviter_id
                FROM public.invitations
                WHERE id = :invitation_id
                    AND status = 'pending'
                    AND deleted_at IS NULL
                    AND LOWER(email) = LOWER(:email)
                FOR UPDATE
                """
            )
            result = await self._session.execute(
                query,
                {"invitation_id": invitation_id, "email": user_email},
            )
            row = result.mappings().first()

            if not row:
                await self._session.rollback()
                return None

            update_query = text(
                """
                UPDATE public.invitations
                SET status = 'declined', declined_at = NOW(), updated_at = NOW()
                WHERE id = :invitation_id
                RETURNING id, token, email, org_id, division_id, role, message, status,
                          expires_at, created_at, updated_at, accepted_at, declined_at, inviter_id,
                          token_hash
                """
            )
            updated = await self._session.execute(
                update_query,
                {"invitation_id": invitation_id},
            )
            updated_row = updated.mappings().first()

            await self._session.commit()

            if not updated_row:
                return None

            return self._map_invitation(dict(updated_row))

        except Exception as error:
            await self._session.rollback()
            logger.error("Error declining invitation", exc_info=error)
            raise

    async def create_invitations(
        self,
        org_id: str,
        inviter_id: str,
        batch: InvitationBatchCreateRequest,
    ) -> InvitationBatchCreateResponse:
        """Persist a batch of invitations for an organization."""

        if not batch.invitations:
            return InvitationBatchCreateResponse(invitations=[], skipped=[])

        normalized: Dict[str, InvitationCreatePayload] = {}
        for invitation in batch.invitations:
            normalized_email = invitation.email.lower()
            normalized[normalized_email] = invitation

        existing_query = text(
            """
            SELECT email
            FROM public.invitations
            WHERE org_id = :org_id
              AND status = 'pending'
              AND LOWER(email) = ANY(:emails)
            """
        ).bindparams(bindparam("emails", expanding=True))
        emails_array = list(normalized.keys())
        result = await self._session.execute(
            existing_query,
            {"org_id": org_id, "emails": emails_array},
        )
        existing = {row["email"].lower() for row in result}

        to_insert: List[Dict[str, Any]] = []
        skipped: List[str] = []

        for email, payload in normalized.items():
            if email in existing:
                skipped.append(payload.email)
                continue

            token = str(uuid.uuid4())
            to_insert.append(
                {
                    "id": str(uuid.uuid4()),
                    "token": token,
                    "token_hash": self._hash_token(token),
                    "email": email,
                    "org_id": org_id,
                    "division_id": payload.division_id,
                    "role": payload.role,
                    "message": payload.message,
                    "inviter_id": inviter_id,
                    "expires_at": payload.expires_at,
                }
            )

        if not to_insert:
            return InvitationBatchCreateResponse(invitations=[], skipped=skipped)

        insert_query = text(
            """
            INSERT INTO public.invitations (
                id, token, token_hash, email, org_id, division_id, role, message, status,
                inviter_id, created_at, updated_at, expires_at
            ) VALUES (
                :id, :token, :token_hash, :email, :org_id, :division_id, :role, :message, 'pending',
                :inviter_id, NOW(), NOW(), :expires_at
            )
            RETURNING id, token, email, org_id, division_id, role, message, status,
                      expires_at, created_at, updated_at, accepted_at, declined_at, inviter_id,
                      token_hash
            """
        )

        inserted: List[InvitationResponse] = []
        await self._reset_transaction()
        await self._session.begin()
        try:
            for record in to_insert:
                result = await self._session.execute(insert_query, record)
                inserted_row = result.mappings().first()
                if inserted_row:
                    inserted.append(self._map_invitation(dict(inserted_row)))
            await self._session.commit()
        except Exception as error:
            await self._session.rollback()
            logger.error("Error creating invitations", exc_info=error)
            raise

        return InvitationBatchCreateResponse(invitations=inserted, skipped=skipped)

    async def get_template(self, template_id: str) -> Optional[TemplateResponse]:
        """Get a template by ID."""
        query = text(
            """
            SELECT id, name, description, category, tools, functions, intents, is_active, created_at
            FROM public.onboarding_templates
            WHERE id = :template_id AND is_active = true
            """
        )
        result = await self._session.execute(query, {"template_id": template_id})
        row = result.mappings().first()

        if not row:
            return None

        return TemplateResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row["description"],
            category=row["category"],
            tools=row["tools"] or {},
            functions=row["functions"] or {},
            intents=row["intents"] or {},
            is_active=row["is_active"],
            created_at=row["created_at"]
        )

    async def get_available_templates(self) -> List[TemplateResponse]:
        """Get all available templates."""
        query = text(
            """
            SELECT id, name, description, category, tools, functions, intents, is_active, created_at
            FROM public.onboarding_templates
            WHERE is_active = true
            ORDER BY category, name
            """
        )
        result = await self._session.execute(query)
        rows = result.mappings().all()

        return [
            TemplateResponse(
                id=str(row["id"]),
                name=row["name"],
                description=row["description"],
                category=row["category"],
                tools=row["tools"] or {},
                functions=row["functions"] or {},
                intents=row["intents"] or {},
                is_active=row["is_active"],
                created_at=row["created_at"]
            )
            for row in rows
        ]
