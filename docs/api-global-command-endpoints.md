# Global Command Palette - REST Endpoint Specification

**Author:** Eldrie (CTO Dev)  
**Date:** 2025-10-11  
**Role:** Frontend lead coordinating with FastAPI team

> This spec captures the contracts the frontend will rely on when wiring the command palette and quick-create flows to the FastAPI backend. Please review before implementation; any breaking changes must be versioned or put behind a feature flag.

---

## Shared Considerations
- **Auth**: Frontend supplies `Authorization: Bearer <supabase_jwt>` extracted from Supabase. Backend must validate the token using the Supabase JWT secret and respond with `401` when the header is missing/invalid, `403` when the token is valid but lacks tenant permissions.
- **Tenant scope**: Accept optional `orgId` and `divisionId` to scope results. When omitted, backend should infer from session defaults.
- **Feature flag**: Frontend toggles via `NEXT_PUBLIC_ENABLE_GLOBAL_COMMAND_API`; backend should tolerate requests regardless, but we only expose externally once ready.
- **Error shape**: Use `{ "detail": string, "code"?: string }` for non-2xx responses so we can render meaningful toasts.
- **Rate limits**: Recommend soft limit e.g. 30 requests/min per user; surface `429` with `Retry-After` header.

---

## 1. Global Search

### Endpoint
- **Method**: `GET`
- **Path**: `/api/search/global`

### Query Parameters
| Name         | Type             | Required | Notes |
|--------------|------------------|----------|-------|
| `q`          | string           | Yes      | Raw user query (UI debounces to 150 ms). |
| `orgId`      | UUID             | No       | Active organization; pass-through if provided. |
| `divisionId` | UUID             | No       | Active division; pass-through if provided. |
| `type`       | string \| string[] | No     | Optional filter (single value or repeated param) limited to the `GlobalEntityType` union. |
| `limit`      | int              | No       | Defaults to 20; cap at 50. |
| `cursor`     | string           | No       | Opaque pagination cursor returned by previous calls. |

### Response - `200 OK`
```jsonc
{
  "results": [
    {
      "id": "task_123",
      "type": "task",                // enum: task|project|doc|channel|event|user|organization|division
      "title": "Review Q4 roadmap",
      "description": "Workspace → Planning",
      "href": "/dashboard/tasks/task_123",  // optional; UI falls back to scope-aware default
      "score": 0.82,                  // optional relevance metric
      "metadata": {                   // optional structured data for future grouping
        "projectId": "proj_456"
      }
    }
  ]
}
```

### Notes
- **Filtering**: backend should accept multiple `type` parameters (e.g. `type=task&type=project`). When omitted, return a mixed list sorted by relevance score.
- **Pagination**: return `nextCursor` in the payload when more data is available. Frontend will pass the cursor back; absence of `nextCursor` ends pagination.
- **Permissions**: backend must enforce ACLs so users only see entities they are allowed to access. Unauthorized matches should be excluded without leaking metadata.

### Errors
| Status | When                                          |
|--------|-----------------------------------------------|
| 400    | Missing/empty `q`, invalid scope IDs, bad limit/type/cursor. |
| 401    | Session not authenticated.                    |
| 403    | Authenticated but lacks permission for requested scope. |
| 500    | Unexpected failure (log correlation id).      |

---

## 2. Quick Create - Shared Payload
All quick-create endpoints share the same payload shape; optional fields may be ignored where irrelevant.

```jsonc
{
  "type": "task",
  "title": "String, required",
  "context": "project_or_channel_id?",  // e.g. parent project
  "assignee": "user_id?",
  "dueDate": "2025-10-20T17:00:00Z?",
  "priority": "low|medium|high|urgent",
  "orgId": "org_uuid?",
  "divisionId": "division_uuid?"
}
```

Common response headers: `202 Accepted` when asynchronous creation; otherwise `201 Created`.

Permissions:
- Backend enforces entity-level ACLs; return `403` when the user cannot create the requested resource (e.g., channel restricted to admins).
- Validate `context`, `assignee`, and scope IDs belong to the current tenant to prevent cross-tenant writes.

Errors: mirror search error format and include field-level detail using `422` for validation issues.

---

## 2.1 Create Task
- **Method**: `POST`
- **Path**: `/api/tasks/quick`
- **Returns** (`201 Created`):
```jsonc
{
  "id": "task_123",
  "title": "Review Q4 roadmap",
  "status": "open",
  "href": "/workspace/tasks/task_123"
}
```

Validation must ensure `title` present; `context` should map to a project or channel ID. If `context` invalid, respond `422` with `{ "detail": "Unknown context", "code": "context_not_found" }`.

---

## 2.2 Create Project
- **Method**: `POST`
- **Path**: `/api/projects/quick`
- **Response (`201`)**:
```jsonc
{
  "id": "proj_456",
  "name": "Website Redesign",
  "href": "/workspace/projects/proj_456"
}
```

Optional `dueDate`/`assignee` may be ignored or mapped to project owner.

---

## 2.3 Create Document
- **Method**: `POST`
- **Path**: `/api/docs/quick`
- **Notes**: When `context` references a channel/project, link created doc accordingly.
- **Response (`201`)**:
```jsonc
{
  "id": "doc_789",
  "title": "Kickoff Notes",
  "href": "/workspace/docs/doc_789"
}
```

---

## 2.4 Create Channel
- **Method**: `POST`
- **Path**: `/api/channels/quick`
- **Payload specifics**: Honor `context` as parent project if creating a nested channel. Ignore `dueDate`.
- **Response (`201`)**:
```jsonc
{
  "id": "chan_321",
  "name": "#launch-war-room",
  "href": "/{orgId}/{divisionId}/channels/chan_321"
}
```

---

## 2.5 Create Event
- **Method**: `POST`
- **Path**: `/api/events/quick`
- **Additional validation**: Require `dueDate` (interpreted as start time). Optionally enrich with default duration.
- **Response (`201`)**:
```jsonc
{
  "id": "event_654",
  "title": "Launch Readiness Huddle",
  "startsAt": "2025-10-20T17:00:00Z",
  "href": "/calendar/event_654"
}
```

If the event creation kicks off calendar syncing, return `202` with job identifier.

---

## Telemetry & Observability
- Log structured entries on each request: user id, scope, payload hash, latency, result code.
- Emit metrics: request count, success/error rates, search latency percentiles.
- Include correlation IDs in responses via `X-Request-ID` for frontend logs.

---

## Implementation Checklist
1. Honour `type`, `limit`, and `cursor` parameters in the search endpoint; include `nextCursor` when more results exist.
2. Enforce tenant-aware permissions for both search and quick-create flows, returning `403` when the user lacks access.
3. Deduplicate channel slugs/project names server-side and surface user-friendly `422` errors on conflicts.
4. Populate quick-create responses with primary identifiers plus any immediately useful metadata (e.g., default assignee) so the UI can render without an extra fetch.

## Smoke Test Procedure
1. Export `SUPABASE_JWT_SECRET` (and optional `SUPABASE_JWT_AUDIENCE`) in your FastAPI shell to mirror production values.
2. Generate a valid Supabase access token (use `supabase.auth.signInWithPassword` in staging or encode a short-lived token with the same secret for local validation).
3. Launch FastAPI with the new `require_current_principal` dependency guarding a test route:
   ```python
   from fastapi import Depends, FastAPI
   from backend.app.dependencies import require_current_principal

   app = FastAPI()

   @app.get("/_health/auth")
   def auth_health(principal=Depends(require_current_principal)):
       return {"userId": principal.id}
   ```
4. Hit the route without a header and assert `401`.
5. Repeat with `Authorization: Bearer <token>` and assert `200` plus the decoded subject identifier.
6. Once validated locally, deploy to staging, flip `NEXT_PUBLIC_ENABLE_GLOBAL_COMMAND_API=true`, monitor structured auth logs for 15 min, then roll out to broader cohorts.
