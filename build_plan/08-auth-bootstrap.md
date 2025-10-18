# 08 — Authentication & User Bootstrap Hardening Plan

## Objective
Deliver a production-grade authentication flow—rooted in Supabase Auth—that consistently returns a valid `WorkspaceUser` profile and scoped access token to all downstream consumers (web, API, services). Supabase already owns credential storage, MFA, and session issuance; this plan focuses on the integration work we still must do so Workspace surfaces, APIs, and background jobs consume Supabase’s tokens safely. We keep the Open/Closed Principle intact by extending around Supabase instead of re-implementing it.

## Key Outcomes
- Deterministic login/logout flows with clear state transitions while delegating credential validation to Supabase.
- Unified contract between frontend `AuthProvider`, backend auth gateway (thin Supabase facade), and persistence layer for Workspace-specific claims.
- Observability, alerts, and fallbacks for auth failures—including upstream Supabase outages.
- Security posture aligned with OWASP ASVS level 2.

## Implementation Roadmap
1. **Requirements & Contracts**
   - Finalize auth domain model: `WorkspaceUser`, `Session`, `CredentialProvider`, `TokenClaims`.
   - Map Supabase session payloads to Workspace-friendly DTOs (e.g., extend with `orgRoles`, `featureFlags`).
   - Document REST façade contracts (`/api/auth/session`, `/api/auth/logout`) that proxy to Supabase where necessary while adding Workspace metadata; avoid duplicating `/auth/v1/*` endpoints Supabase already exposes.
   - Define token format: reuse Supabase access token (JWT) and attach Workspace claim extensions via JWT custom claims or `app_metadata` sync job.
   - Align with product on session duration, refresh policies, and MFA roadmap provided by Supabase (email OTP, magic links, WebAuthn beta).

2. **Backend Gateway (Supabase façade)**
   - Introduce `AuthController` (REST) consuming `AuthService` interface that delegates to Supabase Admin client for critical actions (e.g., sign-out, token refresh) to avoid exposing service role keys directly to the UI.
   - Implement `SupabaseAuthService` adapter without modifying existing auth abstractions (OCP). Responsibilities:
     - Validate Supabase JWTs server-side using Supabase’s JWKS.
     - Hydrate Workspace claim extensions by querying internal tables (`user_organizations`, `user_feature_flags`).
   - Persist lightweight audit trail in `auth_events` table (PostgreSQL via Prisma migration):
     - Columns: `id`, `user_id`, `event_type`, `occurred_at`, `ip_hash`, `user_agent`, `metadata_json`.
     - Index on `user_id` + `occurred_at` for investigations; keep token material inside Supabase only.
   - Use Supabase GoTrue webhooks (or polling) to react to password resets, MFA enrollment, or provider link events—emit to telemetry and invalidate cached sessions accordingly.
   - Enforce device/session limits through Supabase’s built-in `max_instance` controls or by revoking excess refresh tokens through Admin API.

3. **Token Consumption & Claim Enrichment**
   - Reuse Supabase-issued JWTs; publish `.well-known/jwks.json` endpoint that simply proxies Supabase’s JWKS to avoid drift.
   - Add middleware `validateAccessToken` verifying signature, expiry, audience, and revocation via Supabase Admin client when necessary (e.g., on privileged routes).
   - Cache Supabase JWKS with background refresh to minimize cold-start latency.
   - Enrich request context with Workspace metadata by resolving org memberships, division permissions, and feature flags on-demand; cache results in Redis with short TTL (≤5 min) to avoid repeated DB lookups.
   - Provide `POST /api/auth/refresh` endpoint that forwards refresh requests to Supabase GoTrue and re-syncs Workspace claims afterward so downstream services always see up-to-date role data.

4. **Frontend AuthProvider Refactor**
   - Create `useAuthClient` hook encapsulating calls to Supabase JS client for login/logout plus REST façade for claim-enriched session data.
   - Store access token in memory (React context) and rely on Supabase’s httpOnly refresh cookie; ensure cookie domain/path align with Next.js API routes.
   - Replace mock bootstrap in `AuthProvider` with `supabase.auth.getSession()` plus follow-up fetch to `/api/auth/session` for Workspace-specific fields using SWR/React Query for caching.
   - Handle loading/error states explicitly; render skeleton or `AuthErrorBoundary` on fatal failures.
   - Integrate `useProtectedRoute` to await `authState.status === 'authenticated'`.
   - Persist minimal user snapshot to Zustand store for quick access while keeping source of truth in context.

5. **Cross-cutting Concerns**
   - **Security**: Rate limit custom façade endpoints (e.g., 5/min IP-based) via middleware; rely on Supabase’s built-in brute-force protections for credential endpoints. Log failed attempts with structured logging (pino/winston) and send to ELK.
   - **MFA & Passwordless readiness**: Ensure Supabase settings for email OTP/WebAuthn are reflected in UI toggles; abstract `CredentialProvider` so additional Supabase factors can be surfaced without rewiring flows.
   - **Error Handling**: Standardize error response schema `{ code, message, correlationId }`. Wrap Supabase errors (`AuthApiError`) in domain-specific exceptions with actionable messages.
   - **Telemetry**: Emit events (`auth.login.success`, `auth.login.failure`, `auth.refresh.rotated`) to analytics pipeline alongside Supabase webhooks to correlate incidents.
   - **Testing**: Unit test `AuthService` with Supabase client mocked; integration tests hitting façade endpoints via supertest; e2e Playwright tests covering login, refresh, logout flows using Supabase test project.

6. **Deployment & Rollout**
   - Ship behind feature flag `auth.supabase.enabled`. Support toggling to previous mock auth for fallback during staged rollout.
   - Prepare migration plan: deploy DB migration for audit trail, rollout backend façade, then frontend gating logic.
   - Add dashboards (Grafana) tracking Supabase login success rate, token refresh errors, active sessions count, and webhook failures.

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
