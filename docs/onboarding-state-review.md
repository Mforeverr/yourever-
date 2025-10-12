# Onboarding State & Resilience Review

This document evaluates the current onboarding build against the requested state-management strategy and edge-case coverage, and it recommends upgrades that push the implementation beyond the baseline expectations.

## 1. Current Architecture Snapshot

### 1.1 Server state orchestration
* Onboarding mutations and completion are pushed through TanStack Query with dedicated mutations that handle token resolution, backend persistence, and cache invalidation of the signed-in user. 【F:src/hooks/use-onboarding-step.ts†L70-L176】
* REST endpoints exist for fetching, updating, and finalizing onboarding sessions, matching the FastAPI backend service layer. 【F:backend/app/modules/users/router.py†L35-L51】【F:backend/app/modules/onboarding/router.py†L13-L20】
* Backend persistence normalizes sessions, ensures rows exist, and stores versioned payload snapshots for later reconciliation. 【F:backend/app/modules/users/repository.py†L244-L375】

### 1.2 Global UI state (client persistence)
* A dedicated Zustand store persists step payloads to `localStorage`, rehydrates from backend snapshots, and exposes helpers for selective updates. 【F:src/state/onboarding.store.ts†L3-L173】
* `AuthProvider` hydrates the store on login, resets it when the session expires, and mirrors the canonical onboarding status locally. 【F:src/contexts/auth-context.tsx†L94-L188】【F:src/contexts/auth-context.tsx†L389-L404】

### 1.3 Local UI state (per-step forms)
* Each step page uses `react-hook-form` with Zod schemas, populating defaults from the persisted store and live-updating the store as fields change. 【F:src/app/(onboarding)/o/profile/page.tsx†L1-L120】
* The shared `OnboardingShell` supplies navigation controls, progress display, and guarded step hopping to prevent inconsistent completion. 【F:src/components/onboarding/onboarding-shell.tsx†L1-L152】

## 2. Scenario Validation: “User exits mid-onboarding, returns later”

1. **Progress capture** – Every submission triggers `persistOnboardingStatus`, which posts the versioned payload to `/api/users/me/onboarding-progress`. 【F:src/hooks/use-onboarding-step.ts†L70-L188】【F:src/modules/onboarding/session.ts†L80-L105】
2. **Client snapshot** – The Zustand store mirrors the payload locally (and across tabs through storage events) so a refresh keeps the in-flight answers. 【F:src/state/onboarding.store.ts†L104-L173】
3. **Resume on login** – When the user re-authenticates, `AuthProvider` fetches/creates the onboarding session, hydrates the store, and records the canonical status. 【F:src/contexts/auth-context.tsx†L94-L148】
4. **Redirect enforcement** – The global watcher pushes the user back into the first incomplete step whenever they land elsewhere before completion. 【F:src/components/onboarding/onboarding-watcher.tsx†L10-L30】
5. **Completion path** – The final step batches all snapshot answers, sends them to `/api/onboarding/complete`, and marks onboarding complete both client- and server-side. 【F:src/hooks/use-onboarding-step.ts†L138-L176】【F:src/modules/onboarding/session.ts†L94-L105】【F:backend/app/modules/users/repository.py†L320-L375】

**Result:** the build already meets the “leave mid-flow, resume later” requirement through combined backend persistence, client rehydration, and routing guards.

## 3. Additional Case Coverage

| Case | Existing Handling |
| --- | --- |
| Browser back navigation | `goPrevious` rewinds the completion list and routes to the prior step while keeping stored data. 【F:src/hooks/use-onboarding-step.ts†L200-L215】 |
| Network hiccups during save | Mutations surface descriptive toasts and block duplicate submissions while a request is pending. 【F:src/hooks/use-onboarding-step.ts†L138-L189】 |
| Multi-tab editing | Zustand’s persisted store + hydration keep tabs in sync with the latest payload (localStorage listeners handled by the middleware). 【F:src/state/onboarding.store.ts†L104-L152】 |
| Token expiration | API helpers notify a centralized unauthorized handler that signs out, clears client caches, and redirects back to the correct onboarding step with a redirect param. 【F:src/modules/onboarding/session.ts†L22-L105】【F:src/contexts/auth-context.tsx†L416-L438】 |
| Onboarding schema version bumps | Version checks reset outdated payloads, rehydrate defaults, and persist the reset upstream while notifying users. 【F:src/contexts/auth-context.tsx†L94-L148】 |

## 4. Gaps & Opportunities to Go Further

1. **Resilient retry policy for mutations** – `useMutation` currently has no retry/backoff, so transient failures require manual user retries. Add an exponential retry (e.g., 2-3 attempts) with offline-aware fallbacks. 【F:src/hooks/use-onboarding-step.ts†L70-L189】
2. **Field-level error routing** – Completion failures only raise a generic toast and leave the user on the current page, even if the backend returns structured field errors. Capture `ApiError` metadata, route the user to the relevant step, and surface inline validation. 【F:src/hooks/use-onboarding-step.ts†L160-L176】【F:src/modules/onboarding/session.ts†L22-L105】
3. **Deterministic store migrations** – The persisted store sets a version but lacks a `migrate` handler, which means silent shape changes could leave stale keys in localStorage. Implement `migrate` to transform or purge outdated payloads during hydration. 【F:src/state/onboarding.store.ts†L104-L152】
4. **Background autosave telemetry** – Consider emitting instrumentation (custom events) when progress is persisted or resumed to monitor funnel drop-off and detect failure hot-spots.
5. **Server-side diffing** – When PATCHing status, send only the delta (or track a checksum) so you can detect conflicting updates from other devices and prompt users before overwriting.

## 5. Recommended Action Plan

1. Implement retry/backoff + optimistic error messaging for onboarding mutations (TanStack `retry`, `retryDelay`, and possibly background sync).
2. Extend the completion API contract to return structured validation metadata and build a client-side dispatcher that reroutes users to the offending step with inline messaging.
3. Add a persisted-store migration hook that wipes or transforms legacy keys when `CURRENT_ONBOARDING_STATUS_VERSION` increases, ensuring deterministic hydration across deployments.
4. Layer observability (analytics or logs) around onboarding saves/resumptions to catch drop-offs early.
5. Explore conflict detection for multi-device edits by attaching a `revision` token to the stored status and rejecting stale updates server-side.

With these improvements, the onboarding system will not only satisfy the required scenario but also deliver a fault-tolerant, analytics-friendly experience that scales with additional flow complexity.
