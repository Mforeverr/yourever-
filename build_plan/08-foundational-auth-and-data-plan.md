# Foundational Auth & Data Hardening Plan

This document expands the five-step program to transition the workspace from mock data to secure, scoped, production-ready services. Each section outlines the intent, success criteria, required workstreams, owners, dependencies, and acceptance checks.

---

## Plan 1 — Supabase Auth Wiring

- **Main Idea**: Replace mock auth with real Supabase-backed sessions across frontend and backend.
- **Goal**: A single Supabase sign-in propagates to every browser tab, API request, and worker, including the active organization/division scope.
- **Why Now**: Real bearer tokens unlock tenancy enforcement and let us retire mock-only behavior before onboarding more users.

### Deliverables
1. **Auth architecture spec** in `/docs/auth-supabase-integration.md` with a sequence diagram covering login, token refresh, logout, and scope claim updates.
2. **AuthProvider refactor** (`src/contexts/auth-context.tsx`) defaulting to Supabase strategy, persisting sessions, and exposing `getAccessToken`.
3. **API client bearer injector** (`src/lib/api/client.ts`) that attaches the Supabase access token to every request and retries on token refresh once.
4. **Supabase EdgeFunction/trigger** that adds `org_id` and `division_id` claims to JWTs during sign-in and keeps them in sync when memberships change.
5. **Persistence update & migration report** ensuring org/division membership tables record the last-issued claim set for audit.
6. **Docs & release notes** summarizing the rollout, feature flags, and support procedures.

### Work Breakdown
- **Frontend**
  - Swap the default auth strategy to `'supabase'`, guard the `'mock'` path behind an explicit developer flag.
  - Integrate the Supabase client gateway, handle session persistence, and reconcile onboarding flows.
  - Update error handling (`toast`, redirect) for auth failures; add telemetry for login/logout events.
- **Backend**
  - Validate incoming tokens via `require_current_principal`, ensure claim structure matches new format.
  - Add structured logs for auth errors (missing token, invalid token, stale scope).
- **Supabase Infra**
  - Implement claim enrichment hook and document environment variables (`SUPABASE_JWT_SECRET`, `SUPABASE_JWT_AUDIENCE`).
  - Define monitoring for token issuance failures.

### Dependencies & Risks
- Requires Supabase service role key and environment secrets in CI/CD.
- JWT claim size limits; scope payload must remain small (ids, not full objects).
- Coordination with onboarding flows to avoid regressions when mock mode is disabled.

### Acceptance Criteria
- Manual QA: user signs in, reloads page, tokens persist, scope stored in localStorage.
- API calls return `401` if token missing/expired, `200` with valid scope.
- Audit log shows scope claim updates tied to membership changes.
- Sign-off from security reviewer on JWT enrichment implementation.

---

## Plan 2 — Scoped API Enforcement

- **Main Idea**: Constrain all backend reads/writes to the caller’s organization + division scope with auditable logs.
- **Goal**: REST endpoints reject cross-tenant access and emit diagnostics when violations occur.
- **Why Now**: Necessary to protect tenant isolation once real data and Supabase auth are live.

### Deliverables
1. **Scope guard utility module** (e.g., `backend/app/core/scope.py`) encapsulating allow/deny checks and error construction.
2. **Repository updates** (starting with `backend/app/modules/projects/repository.py`, extending to tasks/docs later) to filter by `org_id`/`division_id`.
3. **Structured audit logging** format spec and implementation for denied access, bound to request ids.
4. **Test suite** covering positive and negative scope cases plus regression tests for unauthenticated requests.
5. **Deployment checklist** detailing new env vars, log sinks, and alerts for repeated denials.

### Work Breakdown
- Inject scope guard dependency into services so checks happen before hitting the database.
- Standardize error responses (`403` with machine-readable code) for client consumption.
- Wire audit logs to existing logging infrastructure; ensure PII-safe payloads.
- Update API documentation to describe required headers and scope enforcement.

### Dependencies & Risks
- Requires Plan 1 claims to be present; mocks must provide fallback values for local dev.
- Potential performance impact from additional joins/filters; benchmark before rollout.
- Developers must update integration tests that relied on unrestricted data access.

### Acceptance Criteria
- Automated tests prove scope enforcement for every protected endpoint.
- Observability dashboards show audit logs on denial with correct metadata.
- Manual QA verifies user from Org A cannot see Org B’s projects via API or UI.
- Incident runbook created for handling repeated denial alerts.

---

## Plan 3 — Workspace Domain Contracts

- **Main Idea**: Formalize data models and REST contracts for projects, tasks, and docs before UI integration.
- **Goal**: Ship additive migrations, Pydantic schemas, and APIs scoped by org/division to replace mock data sources.
- **Why Now**: Backend-first approach keeps the monolith modular and ensures frontend builds on stable interfaces.

### Deliverables
1. **Domain spec** (`/docs/workspace-domain-contracts.md`) with ERD, field definitions, validation rules, and sample payloads.
2. **Additive migrations** (Alembic or Prisma) creating `projects`, `tasks`, `docs`, and relation tables keyed by `org_id`/`division_id`.
3. **FastAPI modules** (routers, services, repositories) for `/api/projects`, `/api/tasks`, `/api/docs`, supporting list/create/update/read.
4. **Pydantic schemas** annotated for OpenAPI generation plus `response_model` usage across routers.
5. **Seeding utilities** for dev environments to bootstrap demo data with realistic distribution.
6. **API documentation artifacts** (OpenAPI diff, Postman collection) for QA and external consumers.

### Work Breakdown
- Define repository interfaces per module; implement SQLAlchemy variants adhering to Plan 2 scope guard.
- Add background job support if tasks need async processing (note dependency for future sprints).
- Ensure migrations are backward compatible and idempotent for shared environments.

### Dependencies & Risks
- Needs Supabase schema alignment if Supabase handles persistence; otherwise ensure FastAPI DB remains source of truth.
- Migration ordering with existing tables; coordinate with DBA to avoid downtime.
- Field naming must align with frontend expectations (camelCase vs snake_case conversions).

### Acceptance Criteria
- Database migrations apply cleanly on fresh + existing environments.
- OpenAPI docs expose new endpoints with accurate examples.
- Smoke tests create/read/update/delete resources within scoped org/division successfully.
- Product sign-off on sample payloads and validation rules.

---

## Plan 4 — Client Data Integration

- **Main Idea**: Replace mock Zustand stores with live data pulled via React Query, shielded by a feature flag.
- **Goal**: Workspace UI renders scoped, real data with minimal disruption and allows controlled rollout.
- **Why Now**: Bridges backend readiness to user-facing value while keeping rollback simple.

### Deliverables
1. **React Query hooks** (`src/hooks/api/use-projects-query.ts`, `use-tasks-query.ts`, `use-docs-query.ts`) powered by new API endpoints.
2. **Feature flag plumbing** (`NEXT_PUBLIC_FEATURE_WORKSPACE_API`) toggling between mock store and live queries.
3. **Component refactors** (`src/components/workspace/board-view.tsx`, `list-view.tsx`, `timeline-view.tsx`) to consume query data, including loading/error/empty states.
4. **Optimistic mutation helpers** for create/update/delete workflows with cache invalidation keyed by scope.
5. **Manual QA script** validating flag on/off behavior, scope switching, and offline fallbacks.
6. **Analytics events** capturing fetch success/failure, latency, and empty states for telemetry dashboards.

### Work Breakdown
- Implement a shared scope-aware query key builder to avoid cache collisions between organizations/divisions.
- Preserve local editing capabilities (e.g., drag-and-drop) by syncing with server mutations and reconciling conflicts.
- Maintain mock data path for e2e tests or preview environments lacking backend connectivity.

### Dependencies & Risks
- Requires Plans 1–3 completion for stable endpoints and scoped auth.
- Need to handle rate limiting and pagination; define fallback strategy for large datasets.
- Risk of UI regressions; pair with snapshot/unit tests where feasible.

### Acceptance Criteria
- Feature flag off → existing mock experience unchanged; flag on → live data with correct scoping.
- Network panel shows authenticated API calls with appropriate query params.
- Error states render actionable messaging and retry controls.
- Analytics events visible in telemetry pipeline with expected properties.

---

## Plan 5 — Telemetry & UX Polish

- **Main Idea**: Instrument scope-aware flows and refine user experience once live data replaces mocks.
- **Goal**: Provide observability for auth/data pathways and smooth UX (empty states, inline errors, performance hints).
- **Why Now**: Ensures we can monitor the new foundation, react to regressions quickly, and keep users confident.

### Deliverables
1. **Logging schema** for auth, scope changes, and data fetches; publish to `/docs/telemetry/auth-workspace.md`.
2. **Structured audit logs** emitted from `ScopeProvider` transitions and backend scope guard denials, including user, org, division, and action metadata.
3. **Performance instrumentation**: measure API latency on client (via `performance.mark`) and server (timing logs), aggregate into dashboards.
4. **UX enhancements**: localized empty states, inline validation errors, loading skeletons tied to real data states.
5. **Operational dashboards & alerts** (Grafana/Datadog) displaying auth success rate, API error rate, scope denial trends.
6. **Telemetry documentation** and backlog tickets for follow-up improvements (e.g., anomaly detection, user journey funnels).

### Work Breakdown
- Extend existing telemetry module (`src/lib/telemetry`) to emit new events with consistent naming.
- Integrate i18n keys for all new UI strings; coordinate with localization pipeline.
- Document alert thresholds and escalation process in ops runbook.

### Dependencies & Risks
- Requires event pipeline access (Segment, PostHog, etc.); ensure API keys scoped properly.
- Risk of PII exposure in logs; scrub sensitive fields before shipping.
- Need to balance additional logging overhead with performance budgets.

### Acceptance Criteria
- Dashboards display live data within 24 hours of deployment.
- QA verifies empty/error states and logging behavior in staging.
- Support team trained on new dashboards and incident response steps.
- Product approval on UX copy and localized assets.

---

### Timeline & Ownership Snapshot

| Plan | Target Sprint | Primary Owner | Key Dependencies |
| ---- | ------------- | ------------- | ---------------- |
| 1. Supabase Auth Wiring | Sprint 25 | Platform Team | Supabase secrets, onboarding flow |
| 2. Scoped API Enforcement | Sprint 25 | Backend Team | Plan 1 claims |
| 3. Workspace Domain Contracts | Sprint 26 | Backend Team | Plans 1 & 2 |
| 4. Client Data Integration | Sprint 27 | Frontend Team | Plans 1–3 |
| 5. Telemetry & UX Polish | Sprint 27–28 | Platform + Product | Plans 1–4 |

All plans assume feature flags default off in production until QA sign-off and observability baselines are established.

