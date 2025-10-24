# Organization & Division Slug Support

**Author:** Codex (Project Engineer)  
**Date:** 2025-10-24  
**Role:** Architecture Design

This document sketches the additive schema and API work required to introduce human-readable slugs for organizations and divisions while preserving the existing UUID-based identifiers.

---

## Goals

- Preserve UUID primary keys for all persistence and authorization logic.
- Introduce optional but unique, human-oriented identifiers (`slug`) that can appear in URLs, UI, and deep links.
- Keep existing API contracts working; new slug-based routes must be additive.
- Ensure slugs remain scoped: organization slugs unique platform-wide, division slugs unique within an organization.

---

## Data Model Updates

### Organizations (`public.organizations`)

| Column        | Type        | Constraints                              | Notes                           |
|---------------|-------------|-------------------------------------------|---------------------------------|
| `slug`        | `TEXT`      | `NOT NULL`, `UNIQUE`, `CHECK <> ''`       | Lowercase; URL-safe; immutable. |
| `display_name`| `TEXT`      | Nullable                                 | Optional fancy label.           |

**Migration Sketch**

```sql
ALTER TABLE public.organizations
  ADD COLUMN slug TEXT,
  ADD CONSTRAINT organizations_slug_not_null CHECK (slug IS NOT NULL AND length(btrim(slug)) > 0),
  ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);

-- Backfill example (one-time task, implemented in Python migration or SQL function):
-- UPDATE public.organizations SET slug = generate_slug(name) WHERE slug IS NULL;
```

> `generate_slug(name)` would canonicalise strings via lowercasing, replacing spaces with `-`, and enforcing uniqueness (append numeric suffixes when needed).

### Divisions (`public.divisions`)

| Column        | Type        | Constraints                                      | Notes                                         |
|---------------|-------------|---------------------------------------------------|-----------------------------------------------|
| `slug`        | `TEXT`      | `NOT NULL`, `CHECK <> ''`                         | Lowercase, URL-safe.                          |
| _Uniqueness_  |             | `UNIQUE(org_id, slug)`                            | Slugs unique inside an organization.          |

**Migration Sketch**

```sql
ALTER TABLE public.divisions
  ADD COLUMN slug TEXT,
  ADD CONSTRAINT divisions_slug_not_null CHECK (slug IS NOT NULL AND length(btrim(slug)) > 0),
  ADD CONSTRAINT divisions_org_slug_unique UNIQUE (org_id, slug);

-- Backfill using org-qualified slugs.
```

---

## API Contract Additions

### Envelope Enhancements

All organization & division payloads should include:

```jsonc
{
  "id": "uuid",
  "slug": "sanctuarycreative",
  "displayName": "Sanctuary Creative",  // optional
  ...
}
```

### New Lookup Endpoints (Additive)

- `GET /api/organizations/by-slug/{org_slug}`
- `GET /api/organizations/{org_id}/divisions/by-slug/{division_slug}`

Each returns the canonical entity envelope (with both `id` and `slug`). Internally, we resolve slug ➜ UUID once and re-use existing service logic to honour authorization.

### Extended Existing Routes

Maintain current UUID paths, but allow slug variants:

| Route                                      | Behaviour                                                         |
|--------------------------------------------|-------------------------------------------------------------------|
| `GET /api/organizations/{org}`             | Accepts UUID or slug. Detect via regex (`^[0-9a-f-]{36}$`).       |
| `GET /api/organizations/{org}/divisions/{division}` | Same logic; when slug supplied, resolve to UUID before service call. |

> Implementation detail: centralise resolution in a dependency (`resolve_org_identifier`) that first tries UUID parsing, falls back to slug lookup, and raises `404` if neither match.

### Backward Compatibility

- UUID paths continue to function without change.
- Response bodies always include `id` (UUID). `slug` is additive, so consumers can opt-in gradually.

---

## Application Layer Changes

1. **Scope API (`/api/scope`):** include `slug` fields alongside `id` for organizations/divisions returned to the frontend.
2. **Auth Storage / Scope Context:** store both `activeOrgId` (UUID) and `activeOrgSlug`; the UI can display the slug while API calls continue to use UUIDs internally.
3. **Frontend Routing:** optional future enhancement—support URLs like `/@sanctuarycreative/workspace` by mapping slugs back to IDs on the server (Next.js middleware) or client (scope lookup).

---

## Validation & Tooling

- Create shared slug utility (Python + TypeScript) to normalise user-provided names:
  - Lowercase.
  - Replace whitespace with hyphens.
  - Remove non-alphanumeric characters (retain `-`).
  - Enforce min length (≥ 3).
- Add unit tests covering slug generation, collision handling, and API fallback logic.
- Update admin tooling (if any) to surface slug fields.

---

## Rollout Plan

1. Ship migrations & backfill slugs for existing tenants.
2. Update API responses to include `slug`.
3. Introduce slug lookup endpoints + identifier resolver dependency.
4. Update scope/auth pipelines to consume slugs.
5. Gradually switch UI routes or deep links to slug form.
6. Monitor logs for identifier resolution warnings (e.g., slug not found) to catch stale links.

---

## Open Questions

- Should slug creation be user-editable or locked after provisioning?
- Do we need tenant-specific vanity domains (e.g., `sanctuary.yourev.er`)? If yes, align slug policy with domain parsing.
- How to handle reserved words (`admin`, `api`, etc.)? Define a denylist for slug values.

---

## Next Steps

- Draft SQL migrations (add columns, populate data, enforce constraints).
- Implement resolver dependencies (`get_organization_by_identifier`) in FastAPI.
- Extend `/api/scope` to expose slug metadata.
- Update frontend scope context to cache slugs & provide typed helpers (`getOrgLabel`).

This foundation preserves UUID integrity while unlocking friendly URLs, bookmarks, and shareable links for teams.
