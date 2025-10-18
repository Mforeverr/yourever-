# 09 — Organization & Division Scope Stabilization Plan

## Objective
Guarantee reliable propagation of organization/division scope across the workspace shell, routing, and backend APIs. Ensure every component can trust `currentOrgId`/`currentDivisionId` with strong consistency, and that users can seamlessly persist and restore scope across sessions.

## Success Metrics
- Scope resolution latency under 300 ms (p95) after authentication.
- Zero reported incidents of phantom redirects or stale scope.
- Clear audit trail whenever scope changes.

## Architecture Blueprint
1. **Domain Contracts**
   - Define `ScopeContext` interface encapsulating `{ orgId, divisionId, role, permissions, lastUpdatedAt }`.
   - Document REST endpoints:
     - `GET /api/scope` → returns available organizations/divisions + active selection.
     - `POST /api/scope` → update active organization/division.
   - Extend Prisma schema with additive tables if needed (e.g., `user_division_preferences`).

2. **Backend Services**
   - Add `ScopeController` (REST) delegating to `ScopeService` interface.
   - Implement `DefaultScopeService` using repositories:
     - `OrganizationRepository` (existing) for membership queries.
     - `DivisionRepository` for division metadata.
     - `UserPreferenceRepository` for persistence.
   - Store per-user scope preference (`org_id`, `division_id`, `remembered_at`). Use composite unique index `(user_id, preference_type)`.
   - Validate access rights on update (ensure user belongs to org/division) before committing to DB.
   - Publish domain event `scope.changed` with payload (userId, oldScope, newScope, context) for audit/logging.
   - Cache active scope per user in Redis keyed by `scope:user:{id}` with short TTL + invalidation on updates.

3. **Frontend ScopeProvider Refinement**
   - Refactor `ScopeProvider` to consume `useScopeQuery` (React Query) hitting `/api/scope` on boot.
   - Provide explicit state machine: `idle → loading → ready | error`.
   - Synchronize with URL parameters via `next/router`: when route includes `[orgId]/[divisionId]`, cross-check with provider; if mismatch, call `POST /api/scope` and update context.
   - Persist selection in `localStorage` only as optimistic cache; rely on server as source of truth.
   - Expose `setScope` method returning promise and handling concurrency via mutex (e.g., `await scopeMutex.runExclusive`).
   - Update `useProtectedRoute` to wait for `ScopeProvider.status === 'ready'` before redirect decisions.

4. **Shell & Navigation Integration**
   - Standardize route builders `buildOrgRoute(orgId)` and `buildDivisionRoute(orgId, divisionId)` in a `routing` utility module.
   - Ensure sidebar, tabs, and breadcrumbs read from `ScopeContext` only, removing direct URL parsing.
   - Add optimistic UI updates with rollback if backend rejects scope change.
   - Introduce feature flag `scope.sync.enabled` controlling new provider behavior.

5. **State Management & Caching**
   - Use React Query with caching strategy: stale time 10 s, background refetch on window focus.
   - Provide selectors for common derived data (current organization name, available divisions, permissions).
   - Keep Zustand store minimal—only derived view state, no duplication of canonical scope data.

6. **Security & Compliance**
   - Enforce authorization in backend by verifying `userId` belongs to target org/division.
   - Log all scope changes with correlation IDs + request metadata (IP, agent) for auditing.
   - Rate limit scope switching if abuse detected (e.g., 30 changes/min per user).
   - Ensure error responses avoid leaking org metadata to unauthorized users.

7. **Error Handling & Resilience**
   - Gracefully handle `404` when division missing; show actionable message with CTA to select valid division.
   - Implement retry with exponential backoff for network errors (max 3 attempts) when fetching scope.
   - Display inline toast notifications for scope switch failures with error codes.

8. **Testing Strategy**
   - Unit tests for `ScopeService` covering happy path, unauthorized access, invalid division.
   - Integration tests verifying DB persistence + cache invalidation.
   - Frontend RTL tests ensuring `ScopeProvider` updates context and re-renders dependents.
   - Playwright e2e: user logs in, selects different org/division, refreshes page, scope persists.

9. **Observability**
   - Add metrics: `scope_resolution_time`, `scope_switch_failure_count`.
   - Dashboard showing scope switch volume, success rate.
   - Alert on sudden spike of failures or cache misses.

10. **Rollout Plan**
    - Deploy backend endpoints first, behind feature flag.
    - Release frontend provider in canary environment with synthetic tests.
    - Monitor logs for two release cycles before enabling for all users.

## Dependencies
- Completed authentication bootstrap.
- Organization/division data accuracy.
- Redis cluster for caching (shared with auth).

## Acceptance Criteria
- ScopeProvider always resolves within SLA.
- No reliance on mock data for scope decisions.
- Documented runbook for troubleshooting scope issues.
