# Workspace → “My Workbench” Redesign Plan

## Intent
- Preserve the existing workspace shell (activity bar, tabs, panels) so it still feels like “home”.
- Make the content user-centric: highlight what the signed-in person needs to touch next.
- Keep `/dashboard` as the cross-project leadership overview; `/workspace` becomes the practitioner’s cockpit.

## Scope & Context
- Always respect the current org/division selection.
- All widgets query data with an additional filter for the current user.
- Reuse existing UI components; adjust data adapters and empty states.

## Page States
- **Workbench Mode (no project selected):** render the modules described below; hide project view switcher (Board/List/etc).
- **Project Mode (project selected):** current behavior remains; show project header plus Board/List/Timeline/Calendar/Mindmap/Docs views.
- Navigation between modes continues to rely on `setProjectScope` / `clearProjectScope`.

## Workbench Modules
1. **My Tasks**
   - Fetch tasks with `assignedTo=currentUser` across visible projects.
   - Inline actions: status toggle, due-date edit, quick open.
2. **Mentions & Approvals**
   - Stream of items where the user is mentioned or has pending approvals.
   - Provide “mark as done” or “respond” shortcuts.
3. **Pinned & Recent Projects**
   - Persist user-defined pins.
   - Auto-populate recent projects from tab history or last-opened records.
4. **Today’s Plan**
   - Calendar snapshot filtered to events/deadlines involving the user.
   - Show quick join/open links.
5. **Focus Widgets (optional)**
   - Examples: “Due this week,” “Blocked tasks,” “Time tracking summary,” all scoped to the user.

## Data Considerations
- Extend existing APIs with filters for `assignedTo`, `mentionedUser`, approvals.
- Add persistence for pinned projects per user.
- Ensure calendar/task services expose participant filters.
- Reuse existing project/task DTOs to avoid duplicate types; expose lightweight endpoints if aggregation is heavy.

## UX Notes
- Maintain consistent layout and chroming; only the content modules change.
- Provide rich empty states (e.g., suggest pinning projects, assigning tasks).
- Keep card density lighter than dashboard; prioritize actionability over analytics.

## Rollout Steps
1. Audit APIs for required filters; prioritize any backend gaps.
2. Produce wireframes for the Workbench Mode hero area + each module (desktop + responsive breakpoints).
3. Implement behind a feature flag for internal testing; default to existing workspace until flag is enabled.
4. Gather feedback, iterate, then make “My Workbench” the default workspace view.

## Open Questions / TODO
- Finalize copy for each module’s empty state and quick actions.
- Confirm API performance when aggregating user-scoped data across large orgs/divisions.
- Define telemetry to measure adoption (module views, task actions initiated from workbench).
