# Page Iteration Implementation Report

## Overview
This document captures the work delivered for build plan [12 — Page-by-Page Feature Iteration Plan](../build_plan/12-page-iteration.md).
The goal was to take the first production slice (the workspace dashboard) from mock UI to a live, API-backed experience while
retaining editable starter content for onboarding. The implementation introduces a dedicated backend module for dashboard
aggregations, wires the dashboard page to real data via TanStack Query, preserves sample data fallbacks for new tenants, and
adds automated coverage and documentation for the new surface area.

## Backend implementation
- **Modular service**: New package `app.modules.workspace_dashboard` exposes a repository, service, DI bindings, and router.
  - `DashboardRepository` aggregates KPIs, recent projects, docs, activities, and presence using SQL against
    `workspace_*` tables plus `org_memberships`/`users`. Counts are filtered per organization/division and respect the
    `includeTemplates` flag so template rows can be excluded once users start editing real data.
  - Metadata is normalised for API consumers (e.g., badge counts coerced to `0`, activity metadata parsed as JSON,
    anonymous presence fallbacks) to guarantee schema stability.
  - `DashboardService` reuses the existing `WorkspacePermissionRepository` to enforce organization and division membership
    before serving aggregates, satisfying the plan’s security requirements without duplicating permission logic.
- **Router integration**: `GET /api/workspaces/{orgId}/dashboard` returns a typed `DashboardSummary`. The router is registered in
  `MODULE_ROUTERS`, ensuring the module is part of the application bootstrap without touching existing workspace endpoints.
- **Template enrichment**: Workspace template seeding now stamps realistic `due_at` values so KPI calculations have meaningful
  inputs from day one. The seeding SQL inserts the optional due date when provided, keeping templates editable while powering
  the KPI queries.
- **Tests**:
  - `test_dashboard_service.py` validates that permission guards execute before repository calls and that summaries flow through.
  - `test_dashboard_endpoints.py` exercises the FastAPI route with a stub service, asserting dependency wiring, parameter
    propagation, and JSON response shape.

## Frontend implementation
- **Feature flag**: `workspace.dashboard.api` controls API usage. When disabled or when the API errors, the page falls back to
  curated sample data so first-time users still see a compelling experience.
- **API client & hook**: `fetchWorkspaceDashboardSummary` and `useWorkspaceDashboardQuery` encapsulate REST calls and caching,
  mirroring existing workspace hooks for consistency. Queries share stale time/GC defaults suited for dashboard data and expose
  scope-aware cache keys.
- **Dashboard page**:
  - Rebuilt `DashboardPage` consumes the query hook, surfaces loading skeletons, error states with retry, template onboarding
    notices, and a mock-data badge when samples are displayed.
  - KPIs, recent activity (via `ActivityFeed`), presence (`PresenceAvatarGroup`), pinned docs, and recent projects now hydrate
    from live data while preserving UX affordances (quick actions, refresh button, empty states).
  - Activity items are mapped to the feed component contract, including tag propagation, ensuring compatibility with live
    activity metadata.
- **Mock organisation**: `src/mocks/data/dashboard.ts` centralises the editable starter summary so fallback data stays coherent
  and is easy to delete once the feature flag is permanently enabled.

## State management & security
- Server data remains in TanStack Query caches; UI state (e.g., quick-action selections) stays local, aligning with the plan’s
  state management guidance. Permission checks are enforced server-side before data leaves the API, and the page handles
  unauthorised or unavailable responses gracefully via alerts and fallbacks.

## Observability & rollout
- The dashboard query reuses request metadata logging via `httpRequest` helpers, so existing telemetry (method, endpoint, scope)
  captures usage. Refresh actions call `refetch`, enabling real-time troubleshooting during rollouts. The feature flag allows
  staged enablement per environment or cohort.

## Testing summary
- **Backend**: `pytest` unit and integration suites cover service orchestration and router wiring.
- **Frontend**: `npm run lint` ensures TypeScript, ESLint, and formatting rules are satisfied after the page rewrite.

## Next steps
- Extend the dashboard payload with trend deltas once historical aggregates are available.
- Apply the same pattern to other workspace pages (e.g., Projects, Calendar) behind dedicated feature flags.
- Layer Playwright coverage for the dashboard journey once an end-to-end test environment is provisioned.
