# Invitation System

The invitation system links the Workspace Hub UI with FastAPI endpoints, PostgreSQL persistence, and the client-side state layer so that users can issue, accept, or decline workspace invitations end-to-end.

## Database

A dedicated `public.invitations` table tracks invitations. It enforces uniqueness for pending invites per organization/email and maintains timestamps via a trigger. Apply the migrations with your preferred Postgres tool:

```bash
psql "$DATABASE_URL" -f backend/app/db/migrations/20241015_create_invitations.sql
psql "$DATABASE_URL" -f backend/app/db/migrations/20241021_update_invitations_for_hub.sql
```

Key columns:

- `id` / `token`: UUID identifiers (internal and shareable respectively).
- `token_hash`: SHA-256 hash of the shareable token returned to the client.
- `org_id`, `division_id`: scope membership that will be granted on acceptance.
- `inviter_id`, `email`, `role`, `message`, `status`: invitation metadata.
- `created_at`, `updated_at`, `accepted_at`, `declined_at`, `expires_at`: lifecycle tracking.

## Backend API

The `OrganizationInvitationService` orchestrates validation (ownership/role checks), repository access, and membership synchronization. The `OrganizationRepository` encapsulates SQL for invitation CRUD plus membership side-effects. A dedicated `OrganizationHubService` now aggregates organizations and invitations, publishes analytics events, and enforces rate limiting for hub interactions. Endpoints exposed under `/api/organizations`:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/organizations` | Create an organization and optionally queue invitation emails. |
| `GET` | `/api/organizations/hub` | Return organizations, invitations, and hub stats for the authenticated principal. |
| `GET` | `/api/organizations/pending-invitations` | List pending invitations for the authenticated principal. |
| `POST` | `/api/organizations/{orgId}/invitations` | Batch-create invitations (admins/owners only). |
| `POST` | `/api/organizations/{orgId}/accept-invitation` | Accept a pending invite and join the organization. |
| `POST` | `/api/organizations/{orgId}/decline-invitation` | Decline a pending invite. |

Legacy endpoints under `/api/organizations/invitations/*` remain available for backward compatibility but are hidden from the OpenAPI document. The service uses the existing `UserService` to resolve the principal and enforce access, preserving the modular-monolith boundary. A lightweight background scheduler (`InvitationExpiryScheduler`) expires invitations nightly using the hashed token column to maintain telemetry without exposing raw tokens.

## Frontend State

`src/lib/api/organizations.ts` provides typed REST helpers. React Query hooks are split by responsibility:

- `useWorkspaceHubOverviewQuery` hydrates organizations, invitations, and hub metrics for the Workspace Hub.
- `useAcceptHubInvitationMutation` / `useDeclineHubInvitationMutation` (used inside `InvitationCard`) post to the new endpoints and invalidate hub caches.
- `useSendInvitations` (in `src/hooks/use-organizations.ts`) continues to power the People invite modal, sanitizing payloads and surfacing toast feedback.

`useWorkspaceHubController` now consumes the hub overview query, maps live organizations into `OrganizationCard` view models, and delegates accept/decline flows to the component-level mutations while coordinating scope transitions via `ScopeProvider`.

## UI Workflow

1. During organization creation, founders can type teammate emails into the "Invite your team" field. The API attaches those addresses to the creation request and emits invitations pointing at the new primary division.
2. Admins can still open the People modal (`InviteModal`) to send additional invitations after setup.
3. Recipients see invitations in the Workspace Hub via `PendingInvitationsCard` and can accept/decline inline.
4. Accepting joins the correct organization/division and navigates to the workspace; declining prunes the banner.

The `POST /api/organizations` payload accepts an optional `invitations` array. Each element matches the existing `InvitationCreatePayload` schema. When the list is provided, the service deduplicates emails, defaults roles to `member`, targets the freshly created primary division, and returns both the invitations sent and any duplicates skipped in the creation response.

To extend the system (e.g., adding expiration rules), build on the repository/service contracts to stay aligned with the modular architecture.
