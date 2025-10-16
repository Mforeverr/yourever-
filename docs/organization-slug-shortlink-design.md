# Organization Slug & Shortlink Architecture

This document consolidates how workspaces are created, how human-readable slugs are minted and persisted, and how those slugs relate to both canonical workspace URLs and upcoming shortlink resolution routes. It is intended to clarify the end-to-end data flow so we can debug the current creation failure and finish the shortlink feature confidently.

## 1. Core entities & persistence contracts

| Table | Purpose | Key columns |
| --- | --- | --- |
| `public.organizations` | Primary organization record created during onboarding. | `id` (UUID PK), `name`, `slug`, `description`, `logo_url`, `created_at` |
| `public.divisions` | Divisions scoped to an organization. | `id` (UUID PK), `org_id` (FK), `name`, `key`, `description`, `created_at` |
| `public.org_memberships` | Grants organization-level access. | `org_id`, `user_id`, `role`, `joined_at` |
| `public.division_memberships` | Grants division-level access. | `division_id`, `user_id`, `role`, `joined_at` |
| `public.organization_settings` | Stores per-org defaults and invitation token. | `id`, `org_id`, `default_tools`, `invitation_token`, timestamps |

All of these tables are written inside a single transaction in `OrganizationRepository.create_organization`, ensuring we never end up with a half-configured workspace if any insert fails.【F:backend/app/modules/organizations/repository.py†L201-L345】

## 2. Slug normalization & collision handling

1. **Normalize** the proposed organization name (or explicit slug override) by lowercasing, swapping whitespace/underscores for hyphens, stripping non `[a-z0-9-]` characters, collapsing duplicate hyphens, and trimming edges.【F:backend/app/modules/organizations/repository.py†L61-L72】
2. **Check availability** by querying `public.organizations` for a matching slug where `deleted_at` is `NULL`. A count of zero means we can claim it.【F:backend/app/modules/organizations/repository.py†L74-L85】
3. **Resolve conflicts** by appending `-1`, `-2`, … until an available slug is found (up to a safety cap of 1000 attempts).【F:backend/app/modules/organizations/repository.py†L87-L102】
4. **Persist** the resulting slug alongside a freshly generated UUID `id` for the organization record.【F:backend/app/modules/organizations/repository.py†L216-L236】

### Known edge cases to guard

- **Empty slugs**: Names that normalize to an empty string (e.g., "!!!") will currently pass the availability check and attempt to insert `slug=''`, which can violate NOT NULL/unique constraints depending on the schema. Add a validation to reject empty slugs before insertion and surface a friendly 422 error.
- **Long slugs**: Consider trimming the normalized slug to a reasonable length (e.g., 63 characters) before suffixing to stay within index limits.
- **Race conditions**: The uniqueness constraint at the database layer should still exist so concurrent creations that land on the same slug raise an error. The service already translates `ValueError` into a 409 response.【F:backend/app/modules/organizations/service.py†L41-L58】

## 3. Organization creation sequence

Below is the transaction executed when a signed-in user submits the Workspace Hub form:

1. **Slug decision** – either honor the explicit slug provided (after availability check) or auto-generate one from the name.【F:backend/app/modules/organizations/repository.py†L201-L208】
2. **Division key** – reuse the explicit key or normalize the division name with the same slug helper.【F:backend/app/modules/organizations/repository.py†L209-L211】
3. **Insert organization** – write a new row with a UUID primary key and the chosen slug.【F:backend/app/modules/organizations/repository.py†L216-L236】
4. **Insert primary division** – create the seed division bound to the new org.【F:backend/app/modules/organizations/repository.py†L238-L258】
5. **Insert memberships** – add the creator as org `owner` and division `lead` for immediate access.【F:backend/app/modules/organizations/repository.py†L260-L282】
6. **Insert settings** – seed defaults plus a new invitation token, optionally merging template defaults.【F:backend/app/modules/organizations/repository.py†L284-L310】
7. **Commit or rollback** – any failure triggers a rollback and bubbles the error to the service, which logs and re-raises for the API layer.【F:backend/app/modules/organizations/repository.py†L312-L350】【F:backend/app/modules/organizations/service.py†L41-L76】

The API response returns the hydrated organization/division payload so the frontend can redirect immediately without refetching.【F:backend/app/modules/organizations/repository.py†L315-L345】【F:backend/app/modules/organizations/service.py†L59-L76】

## 4. URL taxonomy

We maintain two complementary URL styles:

| Purpose | Pattern | Example |
| --- | --- | --- |
| **Canonical workspace routes** | `/[:orgSlug]/[:divisionSlug]/dashboard` (and sibling routes for workspace, channels, admin, etc.) | `/acme-corp/engineering/dashboard` |
| **Entity shortlinks** | `/p/:projectId`, `/t/:taskId`, `/c/:channelId` | `/t/3333-cccc-3333-cccc` |

Canonical routes always contain the human-readable `orgSlug` and `divisionSlug`, matching the structures we persist during creation. Shortlinks are deliberately flat and reference a single entity id so they remain stable even if the entity moves between divisions or projects later on.【F:build_plan/04-entity-pages.md†L242-L360】

## 5. Shortlink resolution flow

Shortlinks act like "tracking numbers". When a user opens `/t/:taskId`:

1. **Route** – Next.js serves the `t/[taskId]/page.tsx` entrypoint which renders a resolving splash component.【F:build_plan/04-entity-pages.md†L248-L354】
2. **Fetch** – The component calls `GET /api/shortlinks/resolve/task/:taskId` (planned endpoint) to discover the canonical workspace URL.【F:build_plan/04-entity-pages.md†L254-L266】
3. **Lookup** – The backend loads the task by ID, follows relationships to its division and organization, and returns `{ scopedUrl: "/acme-corp/engineering/t/3333-cccc-3333-cccc" }`.
4. **Redirect** – The frontend swaps the location to the canonical route, replacing history so the user does not bounce back to the splash page.【F:build_plan/04-entity-pages.md†L268-L335】
5. **Error handling** – Missing entities yield a 404 that the splash page turns into a friendly error state with a fallback link.【F:build_plan/04-entity-pages.md†L356-L360】

## 6. Implementing the resolver service

To finish the feature:

- **API surface** – Add a dedicated router (e.g., `/api/shortlinks`) exposing the resolver endpoint outlined in the build plan. Keep the handler thin: validate the `type`, delegate to type-specific repository methods, and respond with the canonical path.
- **Repository helpers** – Each entity type needs a query that returns `org_slug`, `division_slug`, and the entity identifier. Reuse existing joins (e.g., those in the organization repository and project/task modules) to avoid duplicating authorization logic.
- **Response contract** – Shape the payload as `{ "scopedUrl": string }` to match the planned frontend contract.【F:build_plan/04-entity-pages.md†L268-L335】
- **Observability** – Log resolution attempts (including missing IDs) with structured metadata so we can trace future 404s.

## 7. Debugging the current creation failure

If the workspace creation step is failing and spamming logs:

1. **Check slug input** – Confirm the normalized slug is non-empty and not exceeding constraints before attempting to persist (see edge case note above).
2. **Inspect database constraints** – Ensure `public.organizations.slug` has `UNIQUE NOT NULL` and supports the inserted value. Duplicate or blank slugs will bubble up as integrity errors the service turns into 409/500 responses.【F:backend/app/modules/organizations/service.py†L41-L76】
3. **Review transaction logs** – Because inserts happen within a transaction, any failure should roll back all tables; focus debugging on the first integrity violation in the stack trace.
4. **Add slug instrumentation** – Temporarily log `base_name`, `normalized_slug`, and `candidate_slug` attempts to catch unexpected normalization results before they hit the database.

### Frontend slug availability loop (current blocker)

During manual testing the slug availability checker fired continuously against `/api/organizations/slug/availability`, exhausting the backend and preventing form submission. The root cause is a `useEffect` dependency array in `OrgCreationForm.tsx` that includes the mutation object returned by TanStack Query. Because the mutation reference changes on every render, the effect retriggers indefinitely, issuing hundreds of availability requests per minute.【F:docs/organization-creation-database-interaction.md†L5-L49】【F:docs/organization-creation-database-interaction.md†L99-L140】 Removing the mutation reference from the dependency array (`[watchedSlug, setValue, getValues]`) restores the intended debounce behaviour and stops the spam.【F:docs/organization-creation-database-interaction.md†L141-L158】

### Supabase production audit (observed slug defects)

A Supabase snapshot captured real records with truncated slugs (`est-rganization`, `ngineering`).【F:docs/supabase-organization-database-analysis.md†L39-L72】 These anomalies confirm the normalization bug reported during onboarding and highlight that persisted data already contains partially stripped characters. When we ship the slug fix we must also plan a one-time cleanup migration (or admin tool) to re-slug existing rows, ensuring canonical URLs stay aligned with the corrected generator.

By following this contract the application retains human-friendly workspace URLs without sacrificing uniqueness, while shortlinks remain durable identifiers that can be shared, bookmarked, or embedded across the product.
