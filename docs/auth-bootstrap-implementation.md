# Auth Bootstrap Implementation Report

## Overview
This document records the code delivered for build plan [08 — Authentication & User Bootstrap Hardening Plan](../build_plan/08-auth-bootstrap.md). It traces the production-grade authentication path across backend services, database schema, frontend state, and security controls now wired into the Workspace experience. The Supabase platform continues to own credential management and session issuance; our implementation composes around Supabase to hydrate Workspace-specific context, enforce access policies, and expose consistent contracts to clients.

## Architecture Summary
- **Identity Provider**: Supabase Auth issues access tokens (JWT HS256) and refresh cookies. The browser never handles refresh secrets directly.
- **Backend Facade**: `backend/app/modules/auth` exposes REST endpoints (`/api/auth/session`, `/refresh`, `/logout`, `/revoke`) that accept Supabase bearer tokens, enrich them with Workspace metadata, and log audit events.
- **Principal Resolution**: `backend/app/dependencies/auth.py` validates Supabase tokens via the configured JWT secret, normalizes claims, and injects a `CurrentPrincipal` into downstream handlers.
- **Session Enrichment**: `AuthService` (same module) queries the existing `UserService`, applies a 5 minute in-memory TTL cache, and appends feature-flag stubs and session metadata for clients.
- **Audit Trail**: `auth_events` table (migration `20241018_create_auth_events.sql`) records logout/refresh telemetry, with IP hashing and metadata JSON for investigations.
- **Frontend Auth Context**: `src/contexts/auth-context.tsx` brokers Supabase JS sessions, fetches enriched snapshots via the REST facade, and synchronizes onboarding and feature-flag state stores.
- **API Client Utilities**: `src/lib/api/auth.ts` and `src/lib/api/users.ts` consolidate fetch logic, unify error surfaces, and trigger unauthorized handlers when Supabase tokens expire.

## Backend Implementation
### Module registration
- `backend/app/modules/__init__.py` registers the auth router in `MODULE_ROUTERS`, keeping the modular-monolith contract intact.
- `backend/app/modules/auth/__init__.py` declares the package scope and documentation string for the façade module.

### REST endpoints
Defined in `backend/app/modules/auth/router.py`:

| Endpoint | Method | Purpose | Response |
| --- | --- | --- | --- |
| `/api/auth/session` | GET | Return the enriched snapshot (user profile, session metadata, feature flags). | `AuthSessionSnapshot` schema |
| `/api/auth/refresh` | POST | Clear cached snapshot, rebuild metadata, and emit audit telemetry. | `AuthRefreshResponse` (aliased `AuthSessionSnapshot`) |
| `/api/auth/logout` | POST | Register logout event, clear caches. | Empty `AuthLogoutResponse` |
| `/api/auth/revoke` | POST | Placeholder for admin-triggered revocation, returns `202 Accepted`. | JSON `{ "accepted": true }` |

Each handler depends on:
- `require_current_principal`: Validates the Supabase JWT and raises `401` for missing/invalid tokens.
- `get_auth_service`: Injects `AuthService` with caching and repository wiring.

Error handling leverages FastAPI exceptions thrown from the principal dependency; handlers therefore only run with authenticated context.

### Dependency wiring
`backend/app/modules/auth/di.py` composes dependencies:
- `db_session_dependency` supplies an async SQLAlchemy session.
- `AuthEventRepository` persists audit records using manual SQL to avoid ORM coupling.
- `AuthSessionCache` provides a per-process async lock and TTL store; TTL defaults to 300 seconds per requirements.
- `AuthService` coordinates user resolution and auditing.

### AuthService responsibilities (`service.py`)
- **Snapshot building**: `_build_snapshot` fetches `WorkspaceUser` via `UserService.get_current_user`, copies Supabase claim data, and returns `AuthSessionSnapshot`.
- **Caching**: `get_session_snapshot` stores results keyed by `userId:sessionId` to reduce DB fanout, while `refresh_session` invalidates the cache and rebuilds the snapshot.
- **Audit logging**: `_record_event` constructs `AuthEvent` instances with SHA-256 hashed client IP, captured user-agent, and selected claim metadata before delegating to the repository.
- **Telemetry hooks**: `track_logout` and `track_refresh` wrap `_record_event` to persist specific `event_type` values and clear cache entries as needed.
- **Feature flags placeholder**: `_resolve_feature_flags` returns an empty map for now, acting as the extension point for feature flag integrations without touching callers (Open/Closed compliance).

### Principal resolution (`dependencies/auth.py`)
- Uses `HTTPBearer` to parse `Authorization` headers and enforces presence.
- Decodes HS256 tokens with `SUPABASE_JWT_SECRET` (and optional audience) using PyJWT, raising `401` on expiry or signature issues.
- Normalizes numeric timestamps to UTC `datetime` objects and passes raw claims downstream for auditing.
- Exposes typed `CurrentPrincipal` objects to routers and services, isolating JWT parsing from business logic.

### Audit persistence (`repository.py`)
- Inserts rows into `public.auth_events` with generated UUIDs via SQLAlchemy text queries.
- Commits per event to guarantee durability and availability for investigations or analytics.

## Database Schema
Migration `backend/app/db/migrations/20241018_create_auth_events.sql` introduced:
- `auth_events` table with columns: `id UUID PK`, `user_id UUID`, `event_type TEXT`, `occurred_at TIMESTAMPTZ DEFAULT NOW()`, `ip_hash TEXT`, `user_agent TEXT`, `metadata_json JSONB`.
- Indexes: `(user_id, occurred_at DESC)` for chronological investigations and `(event_type)` for aggregation queries.
- Table lives in `public` schema to align with existing analytics pipelines.

Apply via `alembic upgrade head` (or the project’s migration runner) before enabling the auth module.

## Frontend Implementation
### Supabase gateway
- `src/modules/auth/supabase-gateway.ts` wraps `getSupabaseClient()` to expose typed helpers (`getSession`, `signInWithPassword`, `signOut`, `onAuthStateChange`, `getAccessToken`).
- Logs errors to console, keeping UI silent while telemetry is added later.
- Returns `null` when Supabase client is unavailable (e.g., SSR) so the provider can fall back gracefully.

### AuthProvider orchestration (`src/contexts/auth-context.tsx`)
- Maintains `strategy` state toggling between `mock` and `supabase` to support staging rollouts.
- On Supabase mode:
  - Initializes the gateway, reads the Supabase session, and stores the access token in memory only (no localStorage).
  - Calls `fetchCurrentUserSession` via `useCurrentUserQuery`, which hits `/api/auth/session` using the REST client utilities.
  - Hydrates `sessionSnapshotRef` and `remoteFeatureFlags` from the enriched response.
  - Sets onboarding state via Zustand store and persists to `authStorage` using the Supabase user ID key.
  - Registers unauthorized handlers so a `401` response triggers logout flows and toast feedback.
  - On logout, invokes `postAuthLogout` to persist audit telemetry and clears caches, onboarding status, and feature flags.
- Preserves mock mode for developer convenience but keeps code paths isolated to avoid leaking into production.

### API client utilities
- `src/lib/api/auth.ts` centralizes fetch calls with consistent headers, error handling, and unauthorized notifications. All responses use `AuthSessionSnapshot` typing to match backend schemas.
- `src/lib/api/users.ts` now delegates to `fetchAuthSession` for both user and snapshot retrieval, ensuring a single data source.
- `src/hooks/api/use-current-user-query.ts` (not shown) wires React Query to call the auth REST facade, with retry logic disabled on `401` to prevent loops.

### State stores & onboarding
- `useOnboardingStore` receives remote feature flags and onboarding status updates each time the auth snapshot changes, guaranteeing consistent gating across the experience.
- `authStorage` now keys onboarding progress by Supabase user ID, aligning persisted state with authenticated principals.

## Security Considerations
- **Token handling**: Access tokens remain in JS memory; refresh tokens stay in Supabase httpOnly cookies. No tokens are written to persistent storage.
- **Validation**: Backend rejects missing/invalid/expired tokens before hitting business logic, limiting exposure to unauthorized requests.
- **IP privacy**: IP addresses are hashed before storage, balancing auditing needs with GDPR/privacy compliance.
- **Role propagation**: `AuthSessionMetadata.roles` surfaces the principal’s role list extracted from claims, allowing downstream enforcement without re-parsing tokens.
- **Feature flag stubs**: Implementation leaves extension hooks while defaulting to an empty object to avoid accidental flag leakage.
- **Rate limiting**: Not yet implemented at FastAPI layer; to be added alongside the project’s shared throttling middleware.

## Error Handling & Observability
- Backend reliance on FastAPI exceptions standardizes error payloads (`detail` message with `401` or `400` codes).
- Frontend wraps fetch failures in `ApiError`, showing toasts for onboarding save issues and invoking `notifyUnauthorized` on `401`s.
- Audit events capture logout/refresh flows; additional events (login success/failure) can be appended without modifying callers thanks to `AuthService.track_*` helpers.
- Console logs in the Supabase gateway signal integration failures during development; production telemetry hooks are queued for future work.

## Testing Strategy
- Unit tests are pending; modules were structured to allow mocking Supabase and repositories (e.g., inject alternative `AuthSessionCache`).
- Integration validation currently manual via REST calls (`GET /api/auth/session`) and Supabase dashboard. Formal test cases will be added to FastAPI test suite and Playwright scenarios (per build plan acceptance criteria).

## Operations Checklist
1. Configure environment variables: `SUPABASE_JWT_SECRET`, optional `SUPABASE_JWT_AUDIENCE`.
2. Run database migration adding `auth_events` table.
3. Deploy backend service with auth router enabled.
4. Deploy frontend, ensuring Supabase credentials available via existing environment setup.
5. Enable feature flag toggling clients from mock to Supabase strategy (`auth.supabase.enabled`).
6. Monitor audit logs and Supabase auth dashboards for anomalies during rollout.

## Known Follow-ups
- Implement Redis-backed cache adapter to support horizontal backend scaling beyond single-process TTL cache.
- Integrate real feature flag provider (e.g., GrowthBook or LaunchDarkly) in `_resolve_feature_flags`.
- Add rate limiting middleware shared across auth endpoints.
- Instrument structured logging and distributed tracing for auth events.
- Expand audit trail to include login successes/failures using Supabase webhooks.

