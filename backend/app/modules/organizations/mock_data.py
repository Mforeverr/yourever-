"""Mock organization payloads used as a development fallback.

The frontend already ships with the same placeholder organizations inside
`src/lib/mock-users.ts`. We mirror a lightweight subset here so that the
backend can respond with deterministic data when the database layer is not
available yet. This keeps the workspace hub functional during local
development before the real persistence layer is wired up.
"""

from __future__ import annotations

from typing import Final, Iterable, List

from ...dependencies import CurrentPrincipal
from .schemas import OrganizationSummary


_DEFAULT_KEY: Final[str] = "__default__"


# NOTE: Keep this structure aligned with the mock users shipped in the
# frontend (src/lib/mock-users.ts) so that both sides expose the same demo
# experience. Only the fields surfaced by OrganizationSummary/Division are
# mirrored here to avoid unnecessary duplication.
_FALLBACK_ORGANIZATIONS: Final[dict[str, list[dict]]] = {
    "dev@yourever.com": [
        {
            "id": "acme",
            "name": "Acme Corp",
            "slug": "acme",
            "description": "Mock organization for development",
            "user_role": "owner",
            "divisions": [
                {"id": "marketing", "name": "Marketing", "org_id": "acme"},
                {"id": "engineering", "name": "Engineering", "org_id": "acme"},
                {"id": "design", "name": "Design", "org_id": "acme"},
            ],
        },
        {
            "id": "yourever",
            "name": "Yourever Labs",
            "slug": "yourever",
            "description": "Mock organization for internal testing",
            "user_role": "admin",
            "divisions": [
                {"id": "product", "name": "Product", "org_id": "yourever"},
                {"id": "research", "name": "Research", "org_id": "yourever"},
            ],
        },
    ],
    "member@yourever.com": [
        {
            "id": "yourever",
            "name": "Yourever Labs",
            "slug": "yourever",
            "description": "Mock organization for internal testing",
            "user_role": "member",
            "divisions": [
                {"id": "product", "name": "Product", "org_id": "yourever"},
                {"id": "research", "name": "Research", "org_id": "yourever"},
            ],
        }
    ],
    _DEFAULT_KEY: [
        {
            "id": "yourever",
            "name": "Yourever Labs",
            "slug": "yourever",
            "description": "Mock organization for internal testing",
            "user_role": "member",
            "divisions": [
                {"id": "product", "name": "Product", "org_id": "yourever"},
                {"id": "research", "name": "Research", "org_id": "yourever"},
            ],
        }
    ],
}


def _select_dataset(principal: CurrentPrincipal) -> Iterable[dict]:
    email = (principal.email or "").strip().lower()
    if email:
        dataset = _FALLBACK_ORGANIZATIONS.get(email)
        if dataset is not None:
            return dataset
    return _FALLBACK_ORGANIZATIONS.get(_DEFAULT_KEY, [])


def build_fallback_organizations(principal: CurrentPrincipal) -> List[OrganizationSummary]:
    """Materialize fallback organizations for the provided principal."""

    return [
        OrganizationSummary.model_validate(organization)
        for organization in _select_dataset(principal)
    ]


__all__ = ["build_fallback_organizations"]

