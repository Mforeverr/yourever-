"""
Repository functions for organization management.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .schemas import (
    OrganizationCreate,
    OrganizationResponse,
    DivisionResponse,
    InvitationResponse,
    TemplateResponse,
    SlugAvailability,
)

logger = logging.getLogger(__name__)


class OrganizationRepository:
    """Repository for managing organizations, divisions, and invitations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

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

        if await self.check_slug_availability(base_slug):
            return base_slug

        # Add numeric suffix if slug is taken
        counter = 1
        while True:
            candidate_slug = f"{base_slug}-{counter}"
            if await self.check_slug_availability(candidate_slug):
                return candidate_slug
            counter += 1
            if counter > 1000:  # Safety limit
                raise ValueError("Unable to generate unique slug")

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

        organizations = []
        for row in rows:
            # Get divisions for this organization
            divisions = await self._get_organization_divisions(row["id"], user_id)

            organizations.append(OrganizationResponse(
                id=str(row["id"]),
                name=row["name"],
                slug=row["slug"],
                description=row["description"],
                logo_url=row["logo_url"],
                created_at=row["created_at"],
                divisions=divisions,
                user_role=row["user_role"]
            ))

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

    async def create_organization(
        self,
        user_id: str,
        create_data: OrganizationCreate
    ) -> Tuple[OrganizationResponse, DivisionResponse]:
        """Create a new organization with a primary division."""

        # Generate or validate slug
        if create_data.slug:
            slug = create_data.slug.lower()
            if not await self.check_slug_availability(slug):
                raise ValueError(f"Slug '{slug}' is already taken")
        else:
            slug = await self.generate_unique_slug(create_data.name)

        # Generate division key
        division_key = create_data.division_key or self.generate_slug(create_data.division_name)

        try:
            # Start transaction
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

            # Create primary division
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

            division_id = str(uuid.uuid4())
            division_result = await self._session.execute(division_query, {
                "id": division_id,
                "org_id": org_id,
                "name": create_data.division_name,
                "key": division_key,
                "description": f"Primary division for {create_data.name}"
            })
            division_row = division_result.mappings().first()

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

            # Create division membership (lead)
            div_membership_query = text(
                """
                INSERT INTO public.division_memberships (division_id, user_id, role, joined_at)
                VALUES (:division_id, :user_id, 'lead', NOW())
                """
            )
            await self._session.execute(div_membership_query, {
                "division_id": division_id,
                "user_id": user_id
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

            await self._session.execute(settings_query, {
                "id": settings_id,
                "org_id": org_id,
                "default_tools": default_tools,
                "invitation_token": invitation_token
            })

            # Commit transaction
            await self._session.commit()

            # Create response objects
            organization = OrganizationResponse(
                id=str(org_row["id"]),
                name=org_row["name"],
                slug=org_row["slug"],
                description=org_row["description"],
                logo_url=org_row["logo_url"],
                created_at=org_row["created_at"],
                divisions=[DivisionResponse(
                    id=str(division_row["id"]),
                    name=division_row["name"],
                    key=division_row["key"],
                    description=division_row["description"],
                    org_id=str(division_row["org_id"]),
                    created_at=division_row["created_at"],
                    user_role="lead"
                )],
                user_role="owner"
            )

            division = DivisionResponse(
                id=str(division_row["id"]),
                name=division_row["name"],
                key=division_row["key"],
                description=division_row["description"],
                org_id=str(division_row["org_id"]),
                created_at=division_row["created_at"],
                user_role="lead"
            )

            return organization, division

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
                o.name AS org_name,
                d.name AS division_name,
                u.display_name AS inviter_name
            FROM public.invitations i
            LEFT JOIN public.organizations o ON i.org_id = o.id
            LEFT JOIN public.divisions d ON i.division_id = d.id
            LEFT JOIN public.users u ON i.inviter_id = u.id
            WHERE i.email = LOWER(:email)
                AND i.status = 'pending'
                AND (i.expires_at IS NULL OR i.expires_at > NOW())
            ORDER BY i.created_at DESC
            """
        )
        result = await self._session.execute(query, {"email": user_email.lower()})
        rows = result.mappings().all()

        return [
            InvitationResponse(
                id=str(row["id"]),
                email=row["email"],
                org_name=row["org_name"],
                division_name=row["division_name"],
                role=row["role"],
                message=row["message"],
                status=row["status"],
                expires_at=row["expires_at"],
                created_at=row["created_at"],
                inviter_name=row["inviter_name"]
            )
            for row in rows
        ]

    async def accept_invitation(self, token: str, user_id: str) -> Optional[OrganizationResponse]:
        """Accept an invitation and join the organization."""
        try:
            await self._session.begin()

            # Find and validate invitation
            inv_query = text(
                """
                SELECT id, email, org_id, division_id, role, expires_at
                FROM public.invitations
                WHERE token = :token
                    AND status = 'pending'
                    AND (expires_at IS NULL OR expires_at > NOW())
                FOR UPDATE
                """
            )
            inv_result = await self._session.execute(inv_query, {"token": token})
            inv_row = inv_result.mappings().first()

            if not inv_row:
                await self._session.rollback()
                return None

            # Update invitation status
            update_inv_query = text(
                """
                UPDATE public.invitations
                SET status = 'accepted', accepted_at = NOW()
                WHERE id = :id
                """
            )
            await self._session.execute(update_inv_query, {"id": inv_row["id"]})

            # Create organization membership
            org_membership_query = text(
                """
                INSERT INTO public.org_memberships (org_id, user_id, role, joined_at)
                VALUES (:org_id, :user_id, :role, NOW())
                ON CONFLICT (org_id, user_id) DO NOTHING
                """
            )
            await self._session.execute(org_membership_query, {
                "org_id": inv_row["org_id"],
                "user_id": user_id,
                "role": inv_row["role"]
            })

            # Create division membership if division specified
            if inv_row["division_id"]:
                div_membership_query = text(
                    """
                    INSERT INTO public.division_memberships (division_id, user_id, role, joined_at)
                    VALUES (:division_id, :user_id, :role, NOW())
                    ON CONFLICT (division_id, user_id) DO NOTHING
                    """
                )
                await self._session.execute(div_membership_query, {
                    "division_id": inv_row["division_id"],
                    "user_id": user_id,
                    "role": inv_row["role"]
                })

            await self._session.commit()

            # Return updated organization list
            organizations = await self.get_user_organizations(user_id)
            return next((org for org in organizations if org.id == str(inv_row["org_id"])), None)

        except Exception as e:
            await self._session.rollback()
            logger.error(f"Error accepting invitation: {e}")
            raise

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