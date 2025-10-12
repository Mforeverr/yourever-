# Yourever — Architecture Overview

**Version:** 1.0 (UI-Only + Backend Design)  
**Last Updated:** 2025-10-03

This architecture document describes the frontend structure for the Yourever UI prototype, including key libraries, file organization, and state management. It also outlines backend blueprints (database schema, RLS policies) for future full-stack integration, adapted for Yourever's multi-tenant workspace model.

## A) Frontend Architecture (Shippable UI Prototype)

The frontend is built as a React application focused on simulating a unified workspace experience. All data is mocked locally, with no real backend calls. The design emphasizes modularity, accessibility, and a consistent VSCode-inspired shell for productivity.

### Technology Stack
- **Core Framework**: React 18+ with TypeScript for type-safe components and hooks.
- **Build Tool**: Vite for fast development and production builds.
- **Routing**: React Router v6 for declarative, nested routing with loaders/actions support.
- **Styling**: Tailwind CSS (v3+) with dark mode enabled by default. shadcn/ui for pre-built, customizable components (based on Radix UI). class-variance-authority (cva) and tailwind-merge for variant styling.
- **Icons**: Lucide React for scalable, consistent icons.
- **State Management**: Zustand for lightweight, slice-based stores (UI layout, scope, command palette). Optional TanStack Query (v5) for caching and querying mock data.
- **Forms & Validation**: Zod schemas for type inference, react-hook-form for controlled forms with validation.
- **Date Handling**: date-fns for formatting and manipulation.
- **Drag & Drop**: @dnd-kit/core and utilities for sortable boards and timelines.
- **Persistence**: idb-keyval or localStorage for non-critical data (e.g., theme, panel sizes, recent items).
- **Mocking**: MSW (Mock Service Worker) to intercept and respond to API requests with predefined fixtures.
- **Other**: lucide-react icons, sonner for toasts, @radix-ui/react-* primitives.

### File and Folder Structure
The project follows a feature-based organization for scalability:

/yourever
  ├── index.html
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  ├── tailwind.config.ts
  ├── postcss.config.js
  ├── public/ (static assets: favicons, logo.svg)
  └── src/
      ├── main.tsx (entry point, providers setup)
      ├── app/
      │   ├── router.tsx (all routes defined)
      │   ├── providers.tsx (QueryClient, Theme, etc.)
      │   └── hooks/ (custom hooks, e.g., useScope)
      ├── lib/
      │   ├── utils.ts (cn function, toast calls)
      │   ├── storage.ts (localStorage wrappers)
      │   └── constants.ts (routes, status enums)
      ├── state/
      │   ├── ui.store.ts (theme, panels, tabs)
      │   ├── scope.store.ts (orgId, divisionId, recent)
      │   └── palette.store.ts (command actions)
      ├── components/
      │   ├── shell/ (ActivityBar, Sidebar, TabsBar, EditorArea, RightPanel, BottomPanel, StatusBar)
      │   ├── layout/ (AppShell, Breadcrumbs, CommandPalette, ScopeSwitcher)
      │   ├── data-views/ (KanbanBoard, DataTable, TimelineView, CalendarGrid, MindMapCanvas, RichTextEditor)
      │   ├── entities/ (TaskRow, TaskPropertiesGrid, ProjectHeader, DocHeader)
      │   ├── inputs/ (AssigneeSelector, DatePicker, PriorityBadge, StatusBadge, WhyNoteEditor, FileChip)
      │   ├── nav/ (OrgCard, DivisionCard, ChannelList, DMList, SavedViewList)
      │   └── ui/ (shadcn components: Button, Card, Dialog, etc.)
      ├── pages/
      │   ├── marketing/ (Landing.tsx, Pricing.tsx, Login.tsx)
      │   ├── onboarding/ (Profile.tsx, WorkProfile.tsx, ToolStack.tsx, Invite.tsx, WorkspaceHub.tsx)
      │   ├── select/ (SelectOrg.tsx, Divisions.tsx)
      │   └── workspace/
      │       ├── Dashboard.tsx
      │       ├── Workspace.tsx (tabbed views)
      │       ├── Channels.tsx
      │       ├── ChannelDetail.tsx
      │       ├── DMDetail.tsx
      │       ├── Calendar.tsx
      │       ├── People.tsx
      │       ├── Admin/
      │       │   ├── Branding.tsx
      │       │   ├── DomainAccess.tsx
      │       │   ├── Integrations/ (SlackForm.tsx, AsanaForm.tsx, etc.)
      │       │   ├── Usage.tsx
      │       │   └── AuditLog.tsx
      │       ├── Project.tsx
      │       ├── Task.tsx
      │       └── ShortlinkResolver.tsx
      ├── mocks/
      │   ├── server.ts (MSW setup and start)
      │   ├── handlers.ts (API route mocks)
      │   └── fixtures/ (orgs.ts, divisions.ts, projects.ts, tasks.ts, etc.)
      └── styles/
          └── globals.css (Tailwind base)

### Key Patterns
- **Component Composition**: Pages use shell components; data-views are reusable in tabs.
- **Custom Hooks**: useScopedRoute, useMockQuery for tanstack integration.
- **Global Shortcuts**: 
  - Cmd/Ctrl+K: Opens CommandPalette.
  - Cmd/Ctrl+B: Toggles Sidebar.
  - Cmd/Ctrl+J: Toggles BottomPanel.
  - Cmd/Ctrl+Shift+P: Theme switch.
- **Error Boundaries**: Wrap routes for global error handling with fallback UI.
- **Lazy Loading**: Dynamic imports for workspace pages to optimize initial load.

### Mock API Endpoints
- GET /api/session: Current user, orgs, divisions.
- GET /api/orgs: List organizations.
- GET /api/orgs/:id/divisions: Division list.
- GET /api/:orgId/:divisionId/projects (and tasks, channels, events, people).
- POST/PUT/DELETE mocks for CRUD with toasts.
- GET /api/shortlinks/:type/:id: Resolves to scoped route.

### Persistence Rules
- Theme and pane dimensions: localStorage.
- Recent items and command history: idb-keyval for better performance.

## B) Backend Blueprints (For Future Integration)

These designs provide a foundation for a multi-tenant PostgreSQL backend, using RLS for security. Adapted for Yourever's entities: organizations, divisions, projects, tasks, channels, docs, events, integrations, etc.

### Database Schema Overview
- **Multi-Tenancy**: Every entity has `org_id` (required) and `division_id` (nullable for org-wide).
- **Users and Access**: Users join orgs via memberships with roles (owner, admin, member, viewer).
- **Soft Deletes**: `deleted_at` timestamp on modifiable tables.
- **Key Tables**:
  - organizations, divisions, users, memberships.
  - projects (with sections, members), tasks (assignees, subtasks, comments).
  - channels (members, messages with threads).
  - docs (versions in JSONB).
  - events (attendees).
  - integrations (configs per provider).
  - files, shortlinks, audit_log.

Full schema in Yourever_DB_Tables.sql.

### RLS Policies
- **Helpers**: app.user_id(), app.org_id(), app.division_id(), app.role() from session/JWT.
- **Select Policies**: Filter by current org/division; require membership.
- **Insert/Update**: Same filters + role checks (e.g., admin/member for writes).
- **Delete**: Restricted to owner/admin.
- **Audit**: All actions logged in audit_log table.

Detailed policies in Yourever_RLS.sql.

### Future Search and Indexing
- Hybrid search (full-text + vector embeddings) scoped by org/division.
- Indexes on org_id, division_id, created_at for query performance.
- JSONB for flexible fields like message attachments or integration mappings.

### Deployment Considerations
- **Frontend**: Vite build to static host (Vercel/Netlify).
- **Backend**: Supabase or self-hosted Postgres with pg_graphql for API.
- **Auth**: JWT with custom claims for tenancy.
