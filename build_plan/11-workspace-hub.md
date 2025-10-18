# 11 — Workspace Hub Data Normalization Plan

## Objective
Align the Workspace Hub experience with live backend data to ensure onboarding flows, organization listings, and invitation handling operate reliably without mocks.

## Desired Outcomes
- Consistent hub UI pulling from authoritative APIs.
- Seamless transitions from hub to workspace shell with correct scope.
- Robust handling of empty states (no orgs, pending invitations).

## Plan of Action

### 1. Requirements & UX Review
- Validate user journeys: first-time user, invited user, multi-organization admin.
- Confirm required data points (organization name, role, invitation status) with product/design.
- Update i18n keys for Hub copy to ensure locale coverage.

### 2. Backend Enhancements
- Expose REST endpoints:
  - `GET /api/organizations` (with membership metadata, pagination, sorting).
  - `GET /api/organizations/pending-invitations`.
  - `POST /api/organizations/:orgId/accept-invitation`.
  - `POST /api/organizations/:orgId/decline-invitation`.
- Implement `OrganizationHubService` orchestrating organization + invitation repositories.
- Ensure data integrity with transactions where invitation acceptance triggers org membership creation.
- Add background job to expire stale invitations (daily cron).
- Emit events `invitation.accepted`, `invitation.declined` for analytics.

### 3. Database & Migrations
- Verify existing tables `organizations`, `organization_members`, `organization_invitations`.
- Add indices to `organization_invitations` on `invitee_email`, `status` for fast lookups.
- Introduce `invitation_token` column hashed with SHA256 for secure acceptance links.
- Ensure soft deletion (`deleted_at`) handled gracefully.

### 4. Frontend Hub Controller Refactor
- Replace mock data in `useWorkspaceHubController` with React Query hooks hitting the new endpoints.
- Implement states: `loading`, `ready`, `empty`, `error`.
- Map API results into view models with derived properties (e.g., `ctaLabel` based on role).
- Handle invitation acceptance/decline with optimistic updates + error rollback.
- Integrate with `ScopeProvider` by calling `POST /api/scope` after user selects organization.
- Add analytics instrumentation when users accept invitations or create orgs.

### 5. UI & Accessibility
- Ensure components use semantic elements, focus management on dialogs (e.g., invitation actions).
- Provide screen reader announcements for success/error toasts.
- Use skeleton loaders matching final layout.

### 6. Security & Compliance
- Authenticate all endpoints using access token middleware.
- Verify user has rights to act on invitations (match invitee email or admin role).
- Implement CSRF protection for POST endpoints if accessed via browser forms; prefer same-site cookies.
- Rate limit invitation acceptance attempts.
- Log actions with correlation IDs; redact sensitive invitation tokens in logs.

### 7. Error Handling
- Return specific error codes (`INVITATION_EXPIRED`, `ORG_NOT_FOUND`).
- Present user-friendly error banners with retry options.
- Capture backend errors in Sentry with user context.

### 8. Testing Strategy
- Backend unit tests for `OrganizationHubService` covering acceptance/decline scenarios.
- Integration tests verifying invitation acceptance creates membership and invalidates token.
- Frontend RTL tests for controller states and CTA behaviors.
- Playwright flow: user accepts invitation → redirected to workspace shell with correct scope.

### 9. Observability
- Metrics: `invitation_accept_rate`, `hub_load_latency`, `hub_error_count`.
- Dashboards correlating invitation outcomes with user activation.
- Alerts on spikes in declines or errors.

### 10. Rollout
- Deploy backend endpoints first; keep frontend behind `hub.liveData` flag.
- Run shadow mode where frontend logs live API responses but still renders mocks for QA validation.
- Gradually enable for internal cohorts, monitor telemetry, then release broadly.

### 11. Documentation
- Update onboarding documentation with new flows.
- Provide runbook for support to troubleshoot invitation issues.

## Dependencies
- Auth + Scope stabilization.
- Accurate organization/invitation data in database.

## Acceptance Criteria
- Hub renders live data in production without mocks.
- Invitation actions succeed end-to-end with audit logs.
- Telemetry and alerts configured with documented SLOs.
