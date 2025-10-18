"""Template builders that seed example workspace data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Sequence

from ..organizations.schemas import OrganizationResponse, OrganizationDivision


@dataclass(slots=True)
class DivisionContext:
    id: str
    name: str
    slug: str


COLOR_PALETTE = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-fuchsia-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-indigo-500",
]


def slugify(value: str) -> str:
    value = value.lower().strip()
    sanitized = "".join(ch if ch.isalnum() or ch in {" ", "-"} else " " for ch in value)
    normalized = "-".join(part for part in sanitized.replace("_", " ").split() if part)
    return normalized[:40] or "workspace"


def build_division_context(divisions: Sequence[OrganizationDivision]) -> list[DivisionContext]:
    context: list[DivisionContext] = []
    for division in divisions:
        context.append(
            DivisionContext(
                id=division.id,
                name=division.name,
                slug=slugify(division.name),
            )
        )
    return context


def build_template_payload(
    organization: OrganizationResponse,
    divisions: Sequence[OrganizationDivision],
) -> dict[str, list[dict[str, object]]]:
    """Construct template records keyed by entity type."""

    division_context = build_division_context(divisions)
    palette_cycle = iter(COLOR_PALETTE)

    def next_color() -> str:
        nonlocal palette_cycle
        try:
            return next(palette_cycle)
        except StopIteration:
            palette_cycle = iter(COLOR_PALETTE)
            return next(palette_cycle)

    now = datetime.now(timezone.utc)

    projects: list[dict[str, object]] = [
        {
            "name": f"{organization.name} Launch Hub",
            "description": "Track the first wins for your new workspace.",
            "badge_count": 4,
            "dot_color": "bg-indigo-500",
            "division_id": None,
        },
    ]
    tasks: list[dict[str, object]] = [
        {
            "name": "Review the getting started checklist",
            "priority": "Medium",
            "badge_variant": "secondary",
            "dot_color": "bg-sky-500",
            "division_id": None,
            "project_name": f"{organization.name} Launch Hub",
            "due_at": (now + timedelta(days=3)).isoformat(),
        }
    ]
    docs: list[dict[str, object]] = [
        {
            "name": "Workspace playbook",
            "url": "https://example.com/playbook",
            "summary": "Guidelines and rituals to keep everyone aligned.",
            "division_id": None,
        }
    ]
    channels: list[dict[str, object]] = [
        {
            "slug": "general",
            "name": "general",
            "channel_type": "public",
            "topic": "Company-wide announcements and daily chatter",
            "description": "Welcome teammates, share wins, and keep the culture vibrant.",
            "division_id": None,
        },
        {
            "slug": "announcements",
            "name": "announcements",
            "channel_type": "public",
            "topic": "Important updates from leadership",
            "description": "Pin releases, launch notes, and all-hands agendas.",
            "division_id": None,
        },
    ]
    activities: list[dict[str, object]] = [
        {
            "activity_type": "post",
            "content": f"{organization.name} workspace is live! Explore the sidebar and make it yours.",
            "metadata": {
                "tags": ["welcome", "launch"],
            },
            "division_id": None,
        }
    ]

    for index, division in enumerate(division_context):
        color = next_color()
        projects.append(
            {
                "name": f"{division.name} Kickoff",
                "description": f"First priorities for the {division.name} team.",
                "badge_count": 3,
                "dot_color": color,
                "division_id": division.id,
            }
        )
        due_offset = -1 if index == 0 else index + 2
        tasks.append(
            {
                "name": f"Meet your {division.name} collaborators",
                "priority": "High" if index == 0 else "Medium",
                "badge_variant": "secondary" if index % 2 == 0 else "destructive",
                "dot_color": color,
                "division_id": division.id,
                "project_name": f"{division.name} Kickoff",
                "due_at": (now + timedelta(days=due_offset)).isoformat(),
            }
        )
        docs.append(
            {
                "name": f"{division.name} rituals",
                "summary": f"How the {division.name} crew plans, syncs, and ships.",
                "division_id": division.id,
            }
        )
        channels.append(
            {
                "slug": f"{division.slug}-team",
                "name": f"{division.slug}-team",
                "channel_type": "private" if index % 2 else "public",
                "topic": f"Day-to-day coordination for {division.name}",
                "description": f"Coordinate priorities, share resources, and celebrate {division.name} wins.",
                "division_id": division.id,
            }
        )
        activities.append(
            {
                "activity_type": "status",
                "content": f"{division.name} Kickoff board created. Assign owners and update milestones.",
                "metadata": {
                    "division": division.name,
                    "tags": [division.slug, "templates"],
                },
                "division_id": division.id,
            }
        )

    return {
        "projects": projects,
        "tasks": tasks,
        "docs": docs,
        "channels": channels,
        "activities": activities,
    }
