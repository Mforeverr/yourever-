# Project-Scoped Workspace Architecture Design

## Executive Summary

This document outlines a comprehensive design for transforming the current organization/division-scoped workspace into a project-centric workspace system. The design addresses the current "Unable to load projects" issue while creating a more intuitive and focused user experience.

## Implementation Status (October 2025)

| Capability | Current Build | Status | Notes / Next Actions |
| --- | --- | --- | --- |
| `/workspace` root | Renders the new **My Workbench** modules (tasks, mentions, pinned projects, today’s plan, focus overview). | ✅ Implemented | Aligns with “Workbench Mode” vision; project list no longer appears here. Consider deep-link back to `/workspace/projects` for discoverability. |
| Project-first routes | `/[orgId]/[divisionId]/workspace/projects/[projectId]/…` with `ProjectProvider` + `ProjectWorkspaceLayout`. | ✅ Implemented | URLs normalize to view segment (`/board`, `/list`, etc.); breadcrumbs and “Exit to Workspace” work. |
| Sidebar behaviour | Swaps between workbench mode and project mode using `currentProjectId`. | ⚠️ Partial | Global mode shows compact `ProjectList`, but click handler still logs to console in `/workspace/projects`; wire to `navigateToProject`. |
| Project data | `fetchProject`/`fetchProjectsByScope` normalize responses and fall back to mock data. | ⚠️ Partial | Backend CRUD + list endpoints still stubbed; project creation uses mocks. |
| Workspace overview/dashboard API | Requests now fall back to mock builders when 4xx/5xx responses occur. | ⚠️ Partial | Live `/api/workspaces/{org}/overview|dashboard` not implemented (404 in Docker logs). |
| Project CRUD | UI forms exist; backend persistence pending. | ❌ Not Complete | Finish CRUD + membership endpoints (Phase 1). |
| Project views (Board/List/etc.) | Layout renders but still mock-powered. | ⚠️ Partial | Need project-scoped queries per view and live data integration. |

**Immediate follow-up work**
1. Ship backend project CRUD + scope-aware list endpoints; connect `ProjectList` and forms to live queries.
2. Implement `/api/workspaces/{org}/overview|dashboard` so workbench pulls real data (remove fallback console warnings afterwards).
3. Wire sidebar/global project list clicks to `navigateToProject(project.id)` and add optimistic loading states.
4. Replace mock data in workbench modules with user-scoped API once endpoints exist; add telemetry for module usage.

## Current State Analysis

### Existing Architecture
- **URL Structure**: `/[orgId]/[divisionId]/workspace` for the workbench and `/[orgId]/[divisionId]/workspace/projects/[projectId]/…` for project mode (implemented)
- **Scope Context**: Organization/division scoped; may include `currentProjectId` when a project is active
- **Sidebar Content**: Workbench mode shows *Projects*, *My Tasks*, *Labels*; project mode swaps to project overview/navigation
- **Issue**: Live project/workspace APIs still missing; UI relies on mock data fallbacks

### Current Menu Items in Sidebar

- **Workbench Mode (no project):**
  - Projects (division-scoped list)
  - My Tasks (user-scoped placeholder until API ships)
  - Labels
- **Project Mode (inside `/workspace/projects/[projectId]/…`):**
  - Board
  - List
  - Timeline
  - Calendar
  - Mindmap
  - Docs

### Problem Statement
1. **Scoping Mismatch** *(partially addressed)*: Project-first routing exists, but many queries still operate at division scope (tasks, sidebar list) until new APIs land.
2. **Live Data Gap**: Backend workspace/project endpoints are not yet available; UI relies on mock stores and fallbacks.
3. **Navigation Wiring**: Sidebar project entries in workbench mode are not fully wired to `navigateToProject`, so context switching still feels prototype-level.
4. **Data Synchronization**: Workbench modules and sidebar "My Tasks" need shared, user-scoped data once APIs are ready.

### SOLUTION: Unambiguous Project-First Architecture

**DECISION MADE**: We are implementing only the project-first URL structure. All alternative approaches have been removed to eliminate confusion and ensure a single, canonical routing pattern.

**WHY THIS IS FINAL**:
- Removes all ambiguity in navigation
- Provides clear project context in every workspace view
- Establishes a scalable foundation for project management features
- Aligns with modern project management tool expectations

**NO ALTERNATIVES**: We will not consider division-first, hybrid, or multi-workspace approaches. The project-first pattern is the only supported architecture.

## Proposed Architecture

### 1. Project-First URL Structure

#### FINAL ARCHITECTURAL DECISION: Project-First URL Pattern

We are implementing a **single, canonical project-first routing pattern** to eliminate all ambiguity and ensure every workspace view is explicitly scoped to a project. This decision is final and non-negotiable.

- **Current global workspace:** `/[orgId]/[divisionId]/workspace`
- **Project workspace root:** `/[orgId]/[divisionId]/workspace/projects/[projectId]`
- **View examples:** `/board`, `/list`, `/timeline`, `/calendar`, `/mindmap`, `/docs` appended after the project route.

**No alternative URL structures will be considered.** This project-first pattern is the foundation of our workspace architecture.


### 2. Project-Scoped Workspace Concept

#### Core Analogy: **Digital Project Office**
Think of each project as a dedicated office room with its own:
- **Whiteboard** (Board) - Task management and kanban
- **Timeline Wall** (Timeline) - Project scheduling and milestones
- **Calendar** (Calendar) - Project-specific events and deadlines
- **Planning Table** (Mindmap) - Project brainstorming and planning
- **Filing Cabinet** (Docs) - Project documentation and files

#### Navigation Flow
1. User enters workspace at `/[orgId]/[divisionId]/workspace` (workbench mode).
2. Workbench modules surface user-centric tasks/mentions (current implementation).
3. Sidebar still surfaces projects; clicking a project should navigate to `/[orgId]/[divisionId]/workspace/projects/[projectId]/board`.
4. Entire workspace now reflects project context.
5. Sidebar updates to show project-specific menu items.
6. All views (Board, Timeline, etc.) are filtered by project scope.

> **Note:** In the current build the workbench experience is live, but sidebar project clicks still need to invoke `navigateToProject` so the flow above becomes seamless.

### 3. Component Architecture Design

#### 3.1 Project Context Provider
| Responsibility | Status |
| --- | --- |
| Project context provider (`ProjectProvider`) supplies project data, members, permissions. | ✅ Implemented |
| Scope context (`useScope`) includes `currentProjectId`, `navigateToProject`, `exitProject`. | ✅ Implemented |

#### 3.2 Sidebar Behaviours
| Mode | Sidebar Composition | Status |
| --- | --- | --- |
| Workbench (no project) | Projects list, My Tasks placeholder, Labels. | ✅ Implemented (click wiring pending) |
| Project scope | Project header, navigation links (Board/List/Timeline/Calendar/Mindmap/Docs), overview cards. | ✅ Implemented |

### 4. Data Flow Architecture

#### 4.1 Project Data Loading Strategy
- `fetchProject` / `fetchProjectsByScope` now normalize payloads and accept object-wrapped responses (`{ items: [...] }`).
- Workspace overview/dashboard fetchers catch 4xx/5xx responses and return mock data using `useMockWorkspaceStore` / `buildMockDashboardSummary` (temporary until backend endpoints ship).

#### 4.2 Scope-Aware Data Filtering
- Mock stores still provide division-scoped lists; once live APIs arrive, filtering will move server-side.
- Workbench “My Tasks” + sidebar “My Tasks” will consume a unified user-scoped query (`assignedTo=currentUser`) when delivered.

### 5. User Experience Flow

#### 5.1 Entry Points to Project Workspace
1. **From Global Workspace**: Click project in sidebar → Navigate to project board
2. **From Project List**: In /projects view, click "Enter Workspace" → Navigate to project
3. **From URL**: Direct navigation to project workspace URL
4. **From Search**: Search results include "Enter Workspace" action

#### 5.2 Navigation Patterns
- **Workbench Mode:** `/workspace` shows the user workbench (tasks, mentions, pinned projects, schedule).
- **Project Selection:** Clicking a project should navigate to `/workspace/projects/[projectId]/board` (wiring pending for sidebar/project list).
- **Project Mode:** Project header + navigation (Board/List/Timeline/Calendar/Mindmap/Docs) render via `ProjectWorkspaceLayout` with breadcrumbs and exit button.

### REST API Contract

#### Resource Overview
| Resource | Endpoint | Methods | Purpose |
| --- | --- | --- | --- |
| Project Workspace Index | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects` | GET | List lightweight project summaries for the current scope. |
| Project Workspace Snapshot | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/workspace` | GET | Deliver project metadata, members, active views, and capability flags in a single payload. |
| Workspace View Collection | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/views`<br>`POST /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/views` | GET, POST | Read or create view definitions (board, list, timeline, calendar, mindmap, docs) that hang off the project. |
| Workspace View Detail | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/views/{viewId}`<br>`PATCH /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/views/{viewId}`<br>`DELETE /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/views/{viewId}` | GET, PATCH, DELETE | Retrieve, update, or retire individual view metadata and layout while keeping underlying records immutable. |
| Task Collection | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/tasks`<br>`POST /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/tasks` | GET, POST | Access or create canonical task records scoped to the project. |
| Task Detail | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/tasks/{taskId}`<br>`PATCH /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/tasks/{taskId}` | GET, PATCH | Maintain task state while keeping board/list/calendar projections in sync. |
| Project Calendar Events | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/events`<br>`POST /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/events` | GET, POST | Manage project-specific calendar events derived from tasks or standalone milestones. |
| Project Doc Pages | `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/docs`<br>`POST /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/docs` | GET, POST | Surface lightweight documentation entries linked to the project. |

#### Sample Contract: Workspace Snapshot
- **Request:** `GET /api/orgs/{orgId}/divisions/{divisionId}/projects/{projectId}/workspace`
- **Response:** Returns project metadata, member roles, available workspace views (board/list/timeline/etc.), capability flags, and active feature flags.

**Fallbacks**
- `404 Not Found` when `{projectId}` is invalid within the scoped org/division.
- `409 Conflict` when the project exists but is disabled for workspace access.
- `503 Service Unavailable` when upstream aggregations fail; clients should retry with exponential backoff.

#### Schema Notes
- Workspace responses follow the [JSON:API compound document](https://jsonapi.org/) pattern at later phases; for the prototype, a flat JSON payload keeps client integration simple.
- Every endpoint requires `X-Feature-Flag: project-workspace` and `X-Request-Context: org:{orgId};division:{divisionId}` headers so the gateway can route to the correct module and capture telemetry.
- Pagination defaults: collections return 25 items per page, with `page[size]` and `page[number]` query params; cursors can be introduced later without breaking existing clients.

### Data Model Sketch

| Table | Key Columns | Relationships | Notes |
| --- | --- | --- | --- |
| `projects` | `id (PK)`, `org_id`, `division_id`, `name`, `status`, `created_at`, `updated_at` | `org_id → organizations.id`, `division_id → divisions.id` | Canonical project identity; status enum (`active`, `archived`, `draft`). |
| `project_members` | `id (PK)`, `project_id`, `user_id`, `role`, `invited_at`, `joined_at` | `project_id → projects.id`, `user_id → users.id` | Stores membership roles; avoid duplicating division roles. |
| `project_workspace_views` | `id (PK)`, `project_id`, `view_type`, `name`, `config_json`, `is_default`, `created_by` | `project_id → projects.id`, `created_by → users.id` | View_type enum: `board`, `list`, `timeline`, `calendar`, `mindmap`, `doc`; config contains layout/filter metadata. |
| `tasks` | `id (PK)`, `project_id`, `title`, `status`, `priority`, `due_date`, `owner_id`, `payload_json` | `project_id → projects.id`, `owner_id → users.id` | Remains the single source of truth for work items; projections reference tasks by ID. |
| `task_assignments` | `task_id`, `user_id`, `assigned_at` | `task_id → tasks.id`, `user_id → users.id` | Junction table for multi-assignee scenarios. |
| `board_columns` | `id (PK)`, `view_id`, `name`, `sort_order`, `status_filter` | `view_id → project_workspace_views.id` | Stores presentation metadata for kanban columns without mutating task schema. |
| `board_column_tasks` | `view_id`, `column_id`, `task_id`, `position` | `view_id → project_workspace_views.id`, `column_id → board_columns.id`, `task_id → tasks.id` | Persists ordering per board; keeps tasks reusable across views. |
| `project_milestones` | `id (PK)`, `project_id`, `title`, `start_date`, `end_date`, `source_task_id` | `project_id → projects.id`, `source_task_id → tasks.id` | Powers timeline view while allowing derived milestones from tasks. |
| `project_events` | `id (PK)`, `project_id`, `title`, `start_at`, `end_at`, `source_type`, `source_id` | `project_id → projects.id` | Backs calendar view; `source_type` points to `task`, `milestone`, or `external`. |
| `project_documents` | `id (PK)`, `project_id`, `title`, `slug`, `content_richtext`, `created_by`, `updated_by` | `project_id → projects.id`, `created_by → users.id`, `updated_by → users.id` | Maintains docs in a dedicated table; integrate with existing doc tooling later via adapters. |
| `project_view_telemetry` | `id (PK)`, `view_id`, `opened_at`, `user_id`, `feature_flag_state` | `view_id → project_workspace_views.id` | Collects usage metrics for staged rollout and kill-switch automation. |

**Relationship Highlights**
- Organizations own divisions; divisions own projects.
- Projects connect to workspace views (board/list/etc.), members, tasks, milestones, events, documents.
- Tasks may have multiple assignees and feed board columns, calendar events, and telemetry.

**Validation & Constraints**
- Enforce unique `(project_id, view_type, name)` to avoid duplicate view labels.
- Soft-delete via `deleted_at` columns on `project_workspace_views`, `board_columns`, and `project_documents` to keep history for analytics.
- Use partial indexes on `project_events` for quick lookups by time range (`project_id`, `start_at`).
- Default all new records to inherit org/division foreign keys from `projects` for guardrail auditing.

### 6. Implementation Strategy

**REVISED PRIORITY SEQUENCE**: Project CRUD Foundation First

#### **Phase 1: Project CRUD Implementation (Priority 1 - Week 1)**
**Foundation: Make Projects Live with Full CRUD Operations**

1. **Backend Project CRUD API**
   - Complete project creation, read, update, delete endpoints
   - Project listing with org/division scope filtering
   - Project membership management
   - Project metadata and settings management

2. **Frontend Project CRUD Components**
   - Project creation form (triggered by "New Project" in sidebar)
   - Project listing component in sidebar
   - Project editing capabilities
   - Project deletion with confirmation

3. **Database Integration**
   - Ensure all project tables are properly created
   - Test project CRUD operations end-to-end
   - Verify scope-based data isolation works correctly

**Current State**: Backend models exist but CRUD operations are not fully implemented and frontend doesn't have live project integration yet.

#### **Phase 2: Seamless Sidebar Navigation (Priority 2 - Week 2)**
**Sidebar as Primary Navigation Hub (Tabs-like Behavior)**

1. **Sidebar Navigation Enhancement**
   - Projects remain in sidebar at `/[orgId]/[divisionId]/workspace`
   - Clicking project navigates to `/[orgId]/[divisionId]/workspace/projects/[projectId]/board`
   - Seamless routing like tabs-bar behavior
   - Visual indication of active project in sidebar

2. **URL-Scope Integration**
   - URL changes when project is selected
   - Browser back/forward navigation support
   - Direct URL access to project workspaces
   - Proper scope context management

3. **Project Context Switching**
   - Similar to tabs - clicking switches context immediately
   - No page reloads - smooth transitions
   - Breadcrumb navigation showing current project scope

#### **Phase 3: Project Workspace Views (Priority 3 - Week 3)**
**Project-Specific Workspace Content**

1. **Dynamic Workspace Content**
   - Current workspace foundation exists: `/workspace` page with Board/List/Timeline/Calendar/Mindmap/Docs
   - Add project context to existing workspace views
   - Filter all content by selected project
   - Project-specific headers and context

2. **Enhanced Data Integration**
   - Project-scoped API endpoints for workspace data
   - Project-specific task, document, and event management
   - Real-time project collaboration features

**Navigation Flow Summary:**
1. User lands on `/workspace` (workbench).
2. Sidebar project list (division-scoped) offers entry points; selecting one should navigate to `/workspace/projects/[projectId]/board` with project mode UI.
3. Breadcrumbs and “Exit to Workspace” support returning to workbench.

**Key Design Principle:**
- **Sidebar Navigation**: Projects are always accessible from sidebar
- **Seamless Transitions**: Clicking project immediately switches context (like tabs)
- **URL Persistence**: Direct URLs work for bookmarking and sharing
- **Context Awareness**: All workspace content respects project scope

**Workload Synchronization Intent:** Once the user-scoped task API is delivered, both the sidebar “My Tasks” section and the workbench “My Tasks” module will consume the same data source (tasks assigned to the signed-in user across the current division’s projects). The implementation plan is:
1. Deliver a live task endpoint that supports `assignedTo=currentUser` with org/division/project scoping.
2. Replace the sidebar placeholder with the same hook used by the workbench module.
3. Keep the project list division-scoped (expected), while all task feeds become user-scoped so both surfaces stay in sync.

Until those endpoints ship, both areas rely on mock data; wiring will be switched once the backend is live.

### 6.4 Current Workspace Foundation Integration

**EXISTING INFRASTRUCTURE READY FOR PROJECT SCOPING:**

#### Current State Analysis
1. **Workspace Page Exists**: `/src/app/[orgId]/[divisionId]/workspace/page.tsx`
   - ✅ Complete workspace layout with Board/List/Timeline/Calendar/Mindmap/Docs views
   - ✅ View switching functionality implemented
   - ✅ Clean component architecture ready for project context

2. **Sidebar Navigation Exists**: `/src/components/shell/side-bar.tsx`
   - ✅ Project list rendering (`renderProjectList()`)
   - ✅ "New Project" button ready for functionality
   - ✅ Scope context integration foundation

3. **Backend Models Ready**: `/backend/app/modules/projects/models.py`
   - ✅ Complete ProjectModel with all required fields
   - ✅ Organization and division scoping
   - ✅ Metadata and settings support

#### Implementation Approach
**Leverage Existing Foundation**: Rather than rebuilding, we'll enhance the current workspace:

1. **Route Enhancement:** clarify global view (`/[orgId]/[divisionId]/workspace`) versus project view (`/[orgId]/[divisionId]/workspace/projects/[projectId]/board`).

2. **Workspace Component Enhancement**:
   - Add `projectId` parameter to workspace page
   - Filter all view content by project scope
   - Update headers to show project context
   - Maintain existing view switching (Board/List/Timeline/etc.)

3. **Sidebar Integration**:
   - Clicking project in sidebar triggers route change
   - URL updates to include project ID
   - Workspace content re-renders with project context
   - Similar seamless behavior as tabs-bar

**Benefits of This Approach**:
- ✅ **No Rebuild Required**: Foundation already exists
- ✅ **Faster Implementation**: Focus on integration, not construction
- ✅ **Maintains UX**: Users get familiar workspace with project context
- ✅ **Progressive Enhancement**: Can implement incrementally

### 7. Technical Considerations

#### 7.1 State Management
- **Zustand Store**: Add project slice to existing store
- **Context Providers**: Wrap application in enhanced scope context
- **URL Synchronization**: Keep URL in sync with application state

#### 7.2 Performance Optimizations
- **Data Prefetching**: Load project data when navigating to project workspace
- **Caching Strategy**: Cache project-specific data separately
- **Lazy Loading**: Load project components on demand

#### 7.3 Error Handling
- **Graceful Degradation**: Fall back to mock data when APIs fail
- **Loading States**: Proper loading indicators for project switching
- **Error Boundaries**: Isolate project workspace errors

### 8. Migration Strategy

#### 8.1 Backward Compatibility
- Maintain existing URLs for organization/division views
- Add new project-specific routes alongside existing ones
- Provide clear migration path for users

#### 8.2 Feature Flags
- `project-workspace.enabled`: governs access to the project workspace experience.
- `project-workspace.default-view`: toggles whether project mode becomes the default landing view.
- `project-workspace.enhanced-sidebar`: controls rollout of the new sidebar transitions.
- `workspace.liveData`: flips between live API calls and mock data during rollout.

### 9. Success Metrics

#### 9.1 User Experience Metrics
- **Navigation Efficiency**: Reduced clicks to access project-specific tools
- **Context Clarity**: Users understand which project they're working in
- **Task Completion**: Faster task completion within project context

#### 9.2 Technical Metrics
- **Load Times**: Project workspace load time under 2 seconds
- **Error Rates**: Reduced "Unable to load projects" errors
- **Data Consistency**: Project data consistency across all views

### 10. Future Enhancements

#### 10.1 Advanced Features
- **Project Templates**: Predefined project workspace setups
- **Project Cloning**: Copy project workspace configurations
- **Cross-Project Views**: Aggregate views across multiple projects
- **Project Analytics**: Project-specific metrics and insights

#### 10.2 Integration Opportunities
- **Real-time Collaboration**: Project-specific real-time updates
- **External Integrations**: Project-specific third-party integrations
- **Mobile Optimization**: Project workspace mobile experience

## Delivery Checklist (Working Draft)

### Backend
- [ ] Ship `/api/projects` CRUD + membership endpoints; ensure responses conform to `ProjectSummary`/`ProjectDetail` (nullable fields allowed).
- [ ] Implement `/api/workspaces/{orgId}/overview` and `/dashboard` so workbench no longer depends on mock fallbacks.
- [ ] Provide project-scoped view/task/calendar/doc APIs per the REST contract above.

### Frontend
- [ ] Wire global sidebar project clicks and `/workspace/projects` list selections to `navigateToProject`.
- [ ] Connect `ProjectList`/`ProjectCrudForm` to live endpoints and remove console logging.
- [ ] Replace workbench module mock data with user-scoped queries; add loading/empty/error states.
- [ ] Ensure Board/List/Timeline/Calendar/Mindmap/Docs pull data via project-scoped APIs.

### Observability & QA
- [ ] Remove temporary mock fallbacks once APIs respond; monitor for regressions.
- [ ] Add telemetry for module usage (tasks completed from workbench, project switches, etc.).
- [ ] Regression-test navigation (deep links, exit-to-workspace, browser back/forward) each release.

## Conclusion

This design establishes a **definitive project-first workspace architecture** that transforms the current generic organization view into a focused, project-centric experience. The project-first URL structure is final and eliminates all ambiguity in workspace navigation.

**DECISION CONFIRMED**: The project-first pattern (`/[orgId]/[divisionId]/workspace/projects/[projectId]`) is the **only** supported architecture. No alternatives will be implemented.

**Key Benefits:**
1. **Unambiguous Context**: Users always know which project they're working in
2. **Focused Tools**: Each workspace provides project-relevant tools only
3. **Consistent Navigation**: Single, canonical project-based navigation structure
4. **Better Data Organization**: Project-scoped data organization and filtering
5. **Scalable Foundation**: Clear path for future project management features

**Implementation Path Forward:**
- The modular approach allows for gradual implementation
- Each component supports the project-first pattern
- Backward compatibility is maintained during transition
- No alternative architectures need to be considered

This design provides a **complete and final** foundation for building a comprehensive project management system while solving immediate user experience issues. The project-first approach is established as the canonical pattern for the Yourever workspace.
