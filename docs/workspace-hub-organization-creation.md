# Workspace Hub Organization Creation

This document captures the current end-to-end implementation that allows a user to create a new organization from the Workspace Hub UI, persist it through the FastAPI backend, and hydrate the client state so the organization appears immediately after creation.

## Frontend workflow

- `OrgCreationForm` (`src/app/workspace-hub/components/OrgCreationForm.tsx`) is a client component powered by `react-hook-form` + Zod validation. It collects:
  - Organization name, optional slug, and description.
  - Primary division name (required) with optional key override.
  - Optional invitee emails, validated and normalized on blur/enter/comma/tab.
- The slug input autogenerates from the organization name and triggers a debounced availability check via `useCheckSlugAvailability`. The UI reflects availability with border colors/icons and exposes clickable suggestions supplied by the API.
- Submission routes through `useCreateOrganization`, which
  - trims payload fields,
  - lowercases invitations,
  - serializes camelCase keys expected by the backend schema, and
  - surfaces toast feedback plus invalidates `organizations` and `user` caches so the Workspace Hub immediately lists the new organization.
- After a successful mutation the form resets, invitee pills clear, and callbacks allow parents to react (e.g., closing dialogs).

## Backend endpoints

- `POST /api/organizations` (and `/api/organizations/`) accepts the camelCase payload above and creates:
  - the organization record,
  - a primary division keyed from the provided or generated slug,
  - owner + division lead memberships for the creator,
  - optional invitations targeted at the new division.
  The response envelope includes the hydrated organization, membership role, active invitations, and skipped emails.
- `GET /api/organizations/slug/availability` normalizes candidate slugs, reports whether they are free, and returns alternative suggestions if occupied. The `SlugAvailability` schema now exposes its boolean flag under the `is_available` field name expected by the UI.

## State management

- React Query hooks in `src/hooks/use-organizations.ts` centralize organization mutations and queries. `useUserOrganizations` populates the Workspace Hub listings, while `useCreateOrganization` and `useCheckSlugAvailability` power the creation flow described above.
- Successful creation triggers cache invalidation so the Workspace Hub view picks up the new organization without a full page refresh.

## Error handling

- Form-level errors render inline messaging from Zod.
- Invitation parsing guards against duplicates and invalid emails, surfacing descriptive feedback.
- Mutation failures raise toasts and show an inline destructive alert if the POST fails (e.g., slug collision race conditions).
- Slug checks ignore stale responses to prevent outdated availability state from overriding newer inputs.

## Next steps

- Wire email delivery for invitations if not already enabled.
- Consider rate limiting slug checks if the endpoint becomes hot.
- Expand telemetry to capture creation funnel metrics (attempts, failures, completions).
