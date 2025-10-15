# Invitation System

The invitation system links the Workspace Hub UI with FastAPI endpoints, PostgreSQL persistence, and the client-side state layer so that users can issue, accept, or decline workspace invitations end-to-end.

## Database

A dedicated `public.invitations` table tracks invitations. It enforces uniqueness for pending invites per organization/email and maintains timestamps via a trigger. Apply the migration with your preferred Postgres tool:

```bash
psql "$DATABASE_URL" -f backend/app/db/migrations/20241015_create_invitations.sql
```

Key columns:

- `id` / `token`: UUID identifiers (internal and shareable respectively).
- `org_id`, `division_id`: scope membership that will be granted on acceptance.
- `inviter_id`, `email`, `role`, `message`, `status`: invitation metadata.
- `created_at`, `updated_at`, `accepted_at`, `declined_at`, `expires_at`: lifecycle tracking.

## Backend API

The `OrganizationInvitationService` orchestrates validation (ownership/role checks), repository access, and membership synchronization. The `OrganizationRepository` encapsulates SQL for invitation CRUD plus membership side-effects. Endpoints exposed under `/api/organizations`:

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/organizations/invitations` | List pending invitations for the authenticated principal. |
| `POST` | `/api/organizations/{orgId}/invitations` | Batch-create invitations (admins/owners only). |
| `POST` | `/api/organizations/invitations/{invitationId}/accept` | Accept a pending invite and join the organization. |
| `POST` | `/api/organizations/invitations/{invitationId}/decline` | Decline a pending invite. |

The service uses the existing `UserService` to resolve the principal and enforce access, preserving the modular-monolith boundary.

## Frontend State

`src/hooks/use-organizations.ts` centralizes React Query hooks:

- `usePendingInvitations` hydrates the Workspace Hub banner.
- `useAcceptInvitation` / `useDeclineInvitation` post to the new endpoints and invalidate cached data.
- `useSendInvitations` powers the People invite modal, sanitizing payloads and surfacing toast feedback.

`useWorkspaceHubController` now delegates accept/decline flows, while the `InviteModal` pipes organization context and batching into the mutation hook.

## UI Workflow

1. Admin opens the People modal (`InviteModal`) and sends one or more invitations.
2. Recipients see invitations in the Workspace Hub via `PendingInvitationsCard` and can accept/decline inline.
3. Accepting joins the correct organization/division and navigates to the workspace; declining prunes the banner.

To extend the system (e.g., adding expiration rules), build on the repository/service contracts to stay aligned with the modular architecture.
