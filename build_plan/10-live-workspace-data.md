# 10 — Live Workspace Data Enablement Plan

## Objective
Replace mock workspace, activity, and conversation data sources with production-ready services wired to real backend APIs and persistent stores, ensuring consistent data integrity across shell components.

## Guiding Principles
- Respect Open/Closed: add new adapters rather than modifying mock providers directly.
- Enforce REST-first APIs with clear contracts and versioning.
- Maintain UX parity during transition via feature flags and graceful fallbacks.

## Workstreams

### 1. Data Contracts & Modeling
- Audit current mock schemas (`useMockWorkspaceStore`, `useMockConversationStore`) and map to canonical backend models.
- Define TypeScript interfaces `WorkspaceSummary`, `Channel`, `Conversation`, `ActivityPanelState` shared via `/src/types/workspace.ts`.
- Publish OpenAPI specs for new endpoints: `GET /api/workspaces/:orgId/overview`, `GET /api/workspaces/:orgId/divisions/:divisionId/channels`, `GET /api/conversations/:conversationId`.
- Ensure pagination metadata (`page`, `pageSize`, `total`) present where applicable.

### 2. Backend Services
- Introduce `WorkspaceController` with routes:
  - `GET /api/workspaces/:orgId/overview`
  - `GET /api/workspaces/:orgId/divisions/:divisionId/channels`
  - `GET /api/workspaces/:orgId/divisions/:divisionId/activities`
- Implement `WorkspaceService` interface and `DefaultWorkspaceService` leveraging repositories (`ChannelRepository`, `ProjectRepository`, `ActivityRepository`).
- Migrate Prisma models:
  - `channels` table (id, org_id, division_id, type, name, created_at, archived_at).
  - `activities` table capturing timeline entries (id, org_id, division_id, actor_id, type, payload JSONB, occurred_at).
- Use additive migrations only; backfill from existing sources if available.
- Implement caching for read-heavy endpoints using Redis with tag-based invalidation on write operations.
- Add domain events (`channel.created`, `activity.logged`) to enable future async processing.

### 3. Frontend Integration
- Create `useWorkspaceOverviewQuery`, `useDivisionChannelsQuery`, `useActivityFeedQuery` using React Query.
- Replace mock stores with composition:
  - Introduce `workspaceStore` Zustand module that consumes query results and maintains UI-specific state (selected channel, panel collapsed state).
  - Deprecate mocks behind feature flag `workspace.liveData` (default off).
- Update components (`SidebarWorkspace`, `ActivitySidebar`, `ConversationList`) to read from hooks/context instead of mocks.
- Implement skeleton loaders and empty states when data is unavailable.
- Ensure components derive URLs using `ScopeContext` to avoid duplication.
- Maintain direct message roster via `src/mocks/data/conversations` until the DM API ships, and surface helper copy so users know items are editable examples.

### 4. Real-time & Synchronization
- Evaluate websocket/SSE integration for live updates (e.g., channel updates, new activities).
- Add optional `GET /api/workspaces/:orgId/events?since=timestamp` for polling fallback.
- Update frontend to subscribe via `WorkspaceEventClient` with reconnection/backoff logic.
- Ensure state reconciliation merges incoming events into React Query cache without violating immutability.

### 5. Security & Permissions
- Guard endpoints with middleware verifying user’s scope membership and channel permissions.
- Implement row-level filtering based on roles (e.g., private channels accessible only to members).
- Sanitize payload data before returning to client (strip internal notes, sensitive metadata).
- Log access attempts, include correlation ID from request headers.

### 6. Error Handling & Resilience
- Standardize API errors with codes (`WORKSPACE_NOT_FOUND`, `CHANNEL_FORBIDDEN`).
- Implement retries for transient failures (HTTP 502/504) with exponential backoff.
- Provide user-facing toasts for recoverable errors and fallback UI for fatal ones.
- Capture errors in Sentry with scope context and request ID.

### 7. Testing Strategy
- Backend unit tests for `WorkspaceService` ensuring filters and pagination correct.
- Integration tests using Prisma test DB verifying migrations and repository queries.
- Contract tests (pact) between frontend and backend to ensure schema stability.
- Frontend RTL tests to confirm components render live data, handle loading/error states.
- Playwright e2e verifying that channels/activity update when switching divisions.

### 8. Observability & Monitoring
- Add metrics: `workspace_overview_latency`, `channel_list_error_rate`.
- Configure Grafana dashboards and alerts on error spikes.
- Instrument backend endpoints with tracing (OpenTelemetry) for end-to-end latency insights.

### 9. Deployment & Rollout
- Deploy backend APIs first, returning mock-backed responses until DB ready.
- Ship frontend toggled by feature flag; enable for internal testers.
- Monitor metrics for regressions before global enablement.
- Prepare rollback plan reverting flag to mocks.

### 10. Documentation
- Update build runbook detailing new endpoints, DB schema, and cache invalidation strategy.
- Provide API usage examples for third-party consumers.

## Dependencies
- Authentication and scope stability to supply valid org/division IDs.
- Redis + message broker (optional) for caching/events.
- Sentry/observability stack.

## Acceptance Criteria
- All shell components display real data for authenticated users.
- No remaining references to `useMockWorkspaceStore` or `useMockConversationStore` in production bundle.
- Automated test suites covering new behavior added to CI.
