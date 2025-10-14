"""Pydantic schemas for organization API responses."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class OrganizationDivision(BaseModel):
    """Division belonging to an organization for API responses."""

    id: str
    name: str
    key: Optional[str] = None
    description: Optional[str] = None
    org_id: str
    created_at: Optional[str] = None
    user_role: Optional[str] = None


class OrganizationSummary(BaseModel):
    """Summary representation of an organization."""

    id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: Optional[str] = None
    divisions: List[OrganizationDivision]
    user_role: Optional[str] = None
