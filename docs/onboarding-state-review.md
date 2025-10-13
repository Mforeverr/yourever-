# Onboarding State & Resilience Review

This document evaluates the current onboarding build against the requested state-management strategy and edge-case coverage, and it recommends upgrades that push the implementation beyond the baseline expectations.

## 1. Current Architecture Snapshot

### 1.1 Server state orchestration
* **Resilient mutations.** `useOnboardingStep` pushes progress through a dedicated `useResilientMutation` wrapper that adds telemetry hooks, exponential backoff (3 attempts, jittered delay), and toast feedback while syncing with the backend. 【F:src/hooks/use-onboarding-step.ts†L193-L277】【F:src/lib/react-query/resilient-mutation.ts†L1-L218】
* **Session endpoints.** The frontend targets RESTful `GET /api/users/me/onboarding-progress`, `PATCH /api/users/me/onboarding-progress`, and `POST /api/onboarding/complete` helpers that normalize error handling and unauthorized fallbacks. 【F:src/modules/onboarding/session.ts†L41-L125】
* **Revision-aware persistence.** Backend services require matching revision tokens, regenerate revisions on every write, log structured metrics, and enforce validation before completion. 【F:backend/app/modules/users/service.py†L70-L148】
* **Durable storage.** Repository methods create the onboarding row on demand, persist versioned payloads (including answers) with timestamps, and ensure a final snapshot even on race conditions. 【F:backend/app/modules/users/repository.py†L251-L382】

### 1.2 Global UI state (client persistence)
* **Zustand store.** A persisted store mirrors each step, hydrates from backend snapshots, migrates legacy payloads, and exposes a read-only snapshot for submission. 【F:src/state/onboarding.store.ts†L1-L255】
* **Status hydration.** The auth context loads server or local status, resets legacy versions, hydrates Zustand, and records resume telemetry. 【F:src/contexts/auth-context.tsx†L100-L213】
* **Validation bus.** A second store collects server-sent validation issues so steps can render inline errors when completion fails. 【F:src/state/onboarding-validation.store.ts†L1-L44】

### 1.3 Local UI state (per-step forms)
* **Step-specific forms.** Each page relies on `react-hook-form` + Zod, pre-fills from the store, mirrors changes live, and gates submission while saves are pending. 【F:src/app/(onboarding)/o/profile/page.tsx†L1-L185】
* **Shared shell.** `OnboardingShell` presents progress, navigation, and skip/back controls with step-level enablement. 【F:src/components/onboarding/onboarding-shell.tsx†L1-L160】

### 1.4 Flow guards & telemetry
* **Route enforcement.** `OnboardingWatcher` runs globally so incomplete users are forced back into the first outstanding step, while completed users are ejected from `/o/*`. 【F:src/components/onboarding/onboarding-watcher.tsx†L1-L33】【F:src/app/layout.tsx†L6-L75】
* **Analytics.** Telemetry helpers emit lifecycle events for save attempts and resume scenarios, capturing retries, durations, and completion ratios. 【F:src/lib/telemetry/onboarding.ts†L1-L124】

## 2. Scenario Validation: “User exits mid-onboarding, returns later”
1. **Progress capture.** Completing a step snapshots the payload, persists it with retries, and updates the canonical status (including last step and revision). 【F:src/hooks/use-onboarding-step.ts†L296-L394】
2. **Local persistence.** The Zustand store mirrors the payload immediately and survives refreshes or new tabs via `localStorage`. 【F:src/state/onboarding.store.ts†L173-L255】
3. **Resume on login.** Authentication bootstraps the latest session, handles version resets, and rehydrates the store before routing. 【F:src/contexts/auth-context.tsx†L100-L213】
4. **Redirect enforcement.** The global watcher and per-step guard both push the user back to the first incomplete step if they land elsewhere prematurely. 【F:src/components/onboarding/onboarding-watcher.tsx†L10-L30】【F:src/hooks/use-onboarding-step.ts†L172-L191】
5. **Completion.** The final step bundles all persisted answers, sends them to `/api/onboarding/complete`, applies server validation feedback, and marks onboarding complete locally and remotely. 【F:src/hooks/use-onboarding-step.ts†L338-L387】【F:src/modules/onboarding/session.ts†L113-L124】【F:backend/app/modules/users/repository.py†L327-L382】

**Result:** The build already fulfills the “leave mid-flow, resume later” requirement with redundant persistence layers, routing guards, and validation-aware completion.

## 3. Additional Case Coverage

| Case | Existing Handling |
| --- | --- |
| Browser back navigation | `goPrevious` rewinds the completion list, updates status, and routes to the prior step without losing form state. 【F:src/hooks/use-onboarding-step.ts†L412-L435】 |
| Network instability | Resilient mutations add exponential backoff, retry toasts, and keep latest answers locally until sync succeeds. 【F:src/hooks/use-onboarding-step.ts†L193-L276】 |
| Multi-tab editing | Persisted Zustand state hydrates across storage events, so edits from another tab appear instantly on focus. 【F:src/state/onboarding.store.ts†L173-L235】 |
| Token expiration | API helpers detect 401s, trigger the global unauthorized handler, and block retries that would loop forever. 【F:src/modules/onboarding/session.ts†L41-L83】 |
| Revision conflicts | Backend revision checks raise 409 conflicts; the client refreshes from the server and notifies the user before retrying. 【F:backend/app/modules/users/service.py†L70-L132】【F:src/hooks/use-onboarding-step.ts†L224-L286】【F:src/hooks/use-onboarding-step.ts†L366-L373】 |
| Version resets | Legacy status versions trigger a local reset, toast notification, and upstream PATCH with the new baseline. 【F:src/contexts/auth-context.tsx†L133-L177】 |
| Server validation failures | Completion responses dispatch structured issues to the validation store, surface inline errors, and route to the blocking step. 【F:backend/app/modules/onboarding/validation.py†L35-L71】【F:src/hooks/use-onboarding-step.ts†L142-L168】【F:src/hooks/use-onboarding-validation.ts†L8-L45】 |

## 4. Observed Strengths
* **Three-layer state separation** (TanStack Query for server state, persisted Zustand for global UI state, `useState`/forms for local state) exactly matches the recommended architecture. 【F:src/hooks/use-onboarding-step.ts†L19-L138】【F:src/state/onboarding.store.ts†L1-L235】【F:src/app/(onboarding)/o/profile/page.tsx†L33-L185】
* **Redundancy against data loss** thanks to local snapshots, revisioned backend rows, and telemetry-backed retries. 【F:src/hooks/use-onboarding-step.ts†L296-L388】【F:backend/app/modules/users/repository.py†L251-L382】【F:src/lib/telemetry/onboarding.ts†L46-L124】
* **User guidance** through toasts, inline validation, and automatic rerouting keeps the flow self-healing even under conflicting edits. 【F:src/hooks/use-onboarding-step.ts†L142-L383】【F:src/hooks/use-onboarding-validation.ts†L8-L45】

## 5. Insight Capture & Reporting Readiness

The onboarding flow does more than guide people to the dashboard—it captures a full research-grade snapshot you can review later when planning playbooks, success interventions, or product experiments.

* **Typed step payloads cover every question you raised.** Each page maps to a dedicated schema so the store always holds normalized data for profile basics, work profile (team, timezone, functions, intents, experience), tools, invites, preferences, and workspace choice. 【F:src/lib/onboarding.ts†L24-L109】【F:src/state/onboarding.store.ts†L21-L92】
* **Snapshots are bundled automatically on completion.** When the last step finishes, the client pulls the latest Zustand snapshot—containing all answers keyed by step—and includes it in the completion payload sent to the backend. 【F:src/state/onboarding.store.ts†L243-L255】【F:src/hooks/use-onboarding-step.ts†L320-L372】
* **Backend persists answers for later review.** The completion handler stores the final status alongside the `answers` blob inside `onboarding_sessions.data`, giving downstream jobs a single JSON document with every field that was asked during onboarding. 【F:backend/app/modules/users/repository.py†L327-L373】【F:backend/app/modules/users/service.py†L120-L148】
* **Server validation keeps the dataset trustworthy.** Required steps are enforced and workspace selections are checked again server-side so incomplete or malformed submissions never enter analytics. 【F:backend/app/modules/onboarding/validation.py†L19-L72】

**How to review the captured answers today:** query `public.onboarding_sessions` and read the `data->'answers'` JSON (or surface it through your analytics warehouse) to inspect roles, preferences, intent tags, and more in the same shape the UI collected. Because the store normalizes camelCase/kebab-case keys, the payload is stable regardless of client revisions. 【F:backend/app/modules/users/repository.py†L335-L373】

## 6. Centralized Answer Aggregation Blueprint

To make every captured answer easy to pull—even when thousands of users finish onboarding—extend the current pipeline with a
single aggregation surface that groups submissions from the moment they are first written.

### 6.1 Capture hook (no client changes required)
* **Reuse the existing completion hook.** The backend already receives the full `answers` snapshot inside `complete_onboarding`.
  Attach a publisher inside that method so every finalized payload is forwarded to an aggregation worker without touching the
  client contract. 【F:backend/app/modules/users/repository.py†L330-L372】
* **Emit one message per session.** Publish `{ user_id, session_id, completed_at, answers }` to a lightweight queue (e.g.,
  Postgres NOTIFY, Redis stream, or a durable job table) so downstream jobs can normalize data asynchronously while keeping the
  transactional request lean.

### 6.2 Aggregation worker (grouping from day zero)
* **`onboarding_answer_snapshots` table shipped.** The worker ensures a dedicated table exists, keyed by `session_id` with
  `user_id`, optional `workspace_id`, timestamps, grouped JSON payloads, and flattened answer arrays ready for analytics. 【F:backend/app/modules/users/aggregation.py†L42-L96】
* **`onboarding_answer_group_totals` maintained incrementally.** Every ingestion run bumps or decrements per-answer totals so
  product and GTM teams can query counts without scanning raw JSON. 【F:backend/app/modules/users/aggregation.py†L98-L162】
* **Idempotent upserts using `session_id`.** Before inserting a snapshot the worker loads any prior contribution, removes its
  totals, and replays the fresh payload so retries and backfills are safe. 【F:backend/app/modules/users/aggregation.py†L66-L161】
* **Queue listener ready for production.** `OnboardingAnswerAggregationWorker` listens to the Postgres `NOTIFY` channel,
  normalizes payloads (canonical step keys, flattened values, workspace extraction), and persists snapshots continuously.
  【F:backend/app/modules/users/aggregation.py†L164-L267】

### 6.3 Retrieval surface (one-stop access)
* **RESTful admin endpoints shipped.** `GET /api/admin/onboarding/answers` now paginates grouped submissions with role,
  workspace, and completion window filters, while `/api/admin/onboarding/answers/{userId}` returns the full completion history
  for an individual. Both endpoints enforce admin-only access. 【F:backend/app/modules/admin/router.py†L18-L77】
* **Service + schema layer.** A dedicated admin service composes the snapshot repository so pagination and filtering reuse the
  existing normalization logic without duplicating SQL, and Pydantic response models keep payloads consistent for tooling.
  【F:backend/app/modules/admin/service.py†L8-L37】【F:backend/app/modules/admin/schemas.py†L8-L57】
* **Nightly warehouse export.** A reusable exporter and CLI (`scripts/export_onboarding_answers.py`) stream every snapshot into
  NDJSON batches, ready for S3 drops or ingestion jobs—set `ONBOARDING_ANSWERS_EXPORT_PATH` and schedule the script nightly.
  【F:backend/app/modules/users/exporter.py†L1-L98】【F:scripts/export_onboarding_answers.py†L1-L39】

### 6.4 Operational safeguards
* **Schema contracts shipped.** Every completion now stamps an `answer_schema_version` both in the transactional payload and
  the published queue message, and the aggregation store persists that version for future schema migrations. 【F:backend/app/modules/users/constants.py†L1-L25】【F:backend/app/modules/users/repository.py†L333-L382】【F:backend/app/modules/users/publishers.py†L1-L63】【F:backend/app/modules/users/aggregation.py†L19-L261】
* **Backfill strategy implemented.** A dedicated CLI (`scripts/backfill_onboarding_answers.py`) replays historical
  `onboarding_sessions` rows in batches through the same normalization logic used by the live worker, keeping counts accurate
  while avoiding duplicate rows via idempotent upserts. 【F:scripts/backfill_onboarding_answers.py†L1-L54】【F:backend/app/modules/users/aggregation.py†L263-L354】

With this pipeline in place, every onboarding answer lands in a canonical store the moment it is captured, stays grouped by the
original step definitions, and is queryable through a dedicated API or data export without touching transactional tables.

## 7. Offline resilience (service-worker queue shipped)
* **Background queue with service worker + IndexedDB.** When the browser is offline or transient network errors occur, `useOnboardingStep` now hands requests to a dedicated queue powered by a service worker and IndexedDB. Payloads (`status`, schema version, and originating step) are persisted immediately and replayed once connectivity resumes, so users never lose progress. 【F:src/hooks/use-onboarding-step.ts†L193-L362】【F:src/lib/offline/onboarding-queue.ts†L1-L206】【F:public/onboarding-sync-sw.js†L1-L218】
* **Automatic retries & notifications.** The worker registers background sync when available, retries transient failures, and informs the client when a job ultimately fails so the UI can notify the user. Telemetry now marks queued saves, ensuring the product team can monitor offline usage. 【F:public/onboarding-sync-sw.js†L94-L206】【F:src/hooks/use-onboarding-step.ts†L224-L280】【F:src/lib/telemetry/onboarding.ts†L12-L61】

## 8. Next-level Enhancements (Beyond the Current Build)
1. **Server-driven step manifest.** Move `ONBOARDING_STEPS` to a backend-configured manifest so you can A/B test or personalize steps without redeploying the client; hydrate the array via React Query and fall back to the current static definition. 【F:src/lib/onboarding.ts†L90-L170】
2. **Conflict-aware diffing.** Extend revision checks by storing a checksum (e.g., SHA-1 of `status.data`) so the client can show users exactly which fields changed when a 409 occurs, instead of a generic refresh toast. 【F:backend/app/modules/users/service.py†L70-L133】【F:src/hooks/use-onboarding-step.ts†L224-L373】
3. **Automated answer exports.** Add a nightly job or admin endpoint that emits the `answers` payload into your warehouse/CRM so GTM and success teams can react without touching the transactional DB. This builds directly on the persisted JSON snapshot. 【F:backend/app/modules/users/repository.py†L327-L373】
4. **Drop-off analytics.** Stream telemetry events to a dedicated funnel dashboard (server or product analytics) and correlate retries, conflicts, and validation errors to identify friction hot-spots in real time. 【F:src/lib/telemetry/onboarding.ts†L46-L124】
5. **Scoped feature flags.** Wrap experimental steps or questions with a feature-flag contract so new fields can be rolled out to specific cohorts without affecting persisted schemas, leveraging the existing version reset path as a safety net. 【F:src/contexts/auth-context.tsx†L133-L177】【F:src/state/onboarding.store.ts†L173-L235】

With these upgrades, the onboarding system not only satisfies the requested scenarios but also gains offline resilience, product-ops agility, and richer observability for future iterations.
