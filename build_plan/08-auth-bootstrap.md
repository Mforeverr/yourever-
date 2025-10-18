# 08 — Authentication & User Bootstrap Hardening Plan

## Objective
Deliver a production-grade authentication flow that consistently returns a valid `WorkspaceUser` profile and scoped access token to all downstream consumers (web, API, services). Ensure resilience against token drift, race conditions, and provider outages while keeping the Open/Closed Principle intact.

## Key Outcomes
- Deterministic login/logout flows with clear state transitions.
- Unified contract between frontend `AuthProvider`, backend auth gateway, and persistence layer.
- Observability, alerts, and fallbacks for auth failures.
- Security posture aligned with OWASP ASVS level 2.

## Implementation Roadmap
1. **Requirements & Contracts**
   - Finalize auth domain model: `WorkspaceUser`, `Session`, `CredentialProvider`, `TokenClaims`.
   - Document REST contracts for `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/session`.
   - Define token format (JWT w/ RS256) and claim schema (subject, org roles, expiry, feature flags).
   - Align with product on session duration, refresh policies, and MFA roadmap.

2. **Backend Gateway**
   - Introduce `AuthController` (REST) consuming `AuthService` interface.
   - Implement `SupabaseAuthService` adapter without modifying existing auth abstractions (OCP).
   - Persist sessions in `auth_sessions` table (PostgreSQL via Prisma migration):
     - Columns: `id`, `user_id`, `refresh_token_hash`, `issued_at`, `expires_at`, `ip_hash`, `user_agent`, `revoked_at`.
     - Index on `user_id` + `revoked_at` for quick lookups.
   - Add additive migration: `npx prisma migrate dev --name add-auth-sessions`.
   - Hash refresh tokens with Argon2 using server-side secret pepper.
   - Enforce device limit configurable via env.
   - Implement refresh rotation + reuse detection (invalidate family on suspicious activity).

3. **Token Issuance & Validation**
   - Generate asymmetric key pair; store private key in secrets manager (e.g., Doppler/Vault) and public key bundled to frontend via `.well-known/jwks.json` endpoint.
   - Add middleware `validateAccessToken` verifying signature, expiry, and audience.
   - Embed feature flags, org memberships, division permissions in custom claims by querying `user_organizations` join table.
   - Provide `POST /api/auth/refresh` to rotate tokens and regenerate claims after org updates.
   - Cache user role map in Redis with short TTL to reduce database load.

4. **Frontend AuthProvider Refactor**
   - Create `useAuthClient` hook encapsulating REST calls and token storage.
   - Store access token in memory (React context) and refresh token in httpOnly secure cookie (SameSite=Lax).
   - Replace mock bootstrap in `AuthProvider` with real call to `/api/auth/session` on app init using SWR/React Query for caching.
   - Handle loading/error states explicitly; render skeleton or `AuthErrorBoundary` on fatal failures.
   - Integrate `useProtectedRoute` to await `authState.status === 'authenticated'`.
   - Persist minimal user snapshot to Zustand store for quick access while keeping source of truth in context.

5. **Cross-cutting Concerns**
   - **Security**: Rate limit auth endpoints (e.g., 5/min IP-based) via middleware; log failed attempts with structured logging (pino/winston) and send to ELK.
   - **MFA & Passwordless readiness**: Abstract `CredentialProvider` to allow additional factors without rewriting controllers.
   - **Error Handling**: Standardize error response schema `{ code, message, correlationId }`. Wrap backend errors in domain-specific exceptions.
   - **Telemetry**: Emit events (`auth.login.success`, `auth.login.failure`, `auth.refresh.rotated`) to analytics pipeline.
   - **Testing**: Unit test `AuthService` with mocked provider; integration tests hitting REST endpoints via supertest; e2e Playwright tests covering login, refresh, logout flows.

6. **Deployment & Rollout**
   - Ship behind feature flag `auth.supabase.enabled`. Support toggling to previous mock auth for fallback.
   - Prepare migration plan: deploy DB migration, rollout backend, then frontend gating logic.
   - Add dashboards (Grafana) tracking login success rate, token refresh errors, active sessions count.

7. **Documentation & Runbooks**
   - Update `docs/authentication.md` with sequence diagrams for login/refresh.
   - Provide on-call playbook for incident response (token leak, provider outage, mass logout procedure).

## Dependencies
- Secrets management setup.
- Redis or equivalent cache cluster.
- Logging/monitoring stack configuration.

## Acceptance Criteria
- All API contracts documented and versioned.
- Automated tests (unit, integration, e2e) pass in CI.
- AuthProvider delivers populated `WorkspaceUser` within 1s in 95th percentile after page load.
- No mock auth usage in production build.
