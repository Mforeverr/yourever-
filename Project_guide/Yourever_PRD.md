# Yourever — Product Requirements Document (PRD)

**Version:** 1.0 (UI-Only Implementation)  
**Status:** Ready for Development  
**Author:** Cline (Senior Frontend Engineer) • Yourever  
**Last Updated:** 2025-10-03

This PRD outlines the requirements for building "Yourever", a unified team workspace that integrates tasks, communication, planning, and administration into a seamless, VSCode-inspired interface. It draws from prior platform concepts but is tailored specifically for Yourever's focus on organization and division scoping, with a UI-only prototype using mocked data. No backend integration is included at this stage.

## 1. Introduction and Purpose

Yourever addresses the fragmentation in modern workflows by providing a single platform where teams can manage projects, collaborate via chat, schedule events, and handle administrative tasks—all scoped to specific organizations and divisions. The UI emphasizes discoverability, speed, and consistency, starting from a marketing landing page through onboarding to a fully interactive workspace.

### Key Objectives
- Deliver a polished, production-ready frontend application that simulates the full user experience without real data persistence or authentication.
- Ensure all routes are scoped by organization and division to enforce multi-tenancy from the outset.
- Implement a consistent shell layout across workspace routes for intuitive navigation and productivity.
- Incorporate marketing elements to attract users, followed by a guided onboarding flow.
- Demonstrate core interactions like drag-and-drop, form validations, and modal overlays using specified libraries.

### Out of Scope
- Actual server-side logic, database operations, or API integrations. All data is mocked locally.
- Advanced features like real-time collaboration or external service hooks.

## 2. Target Users and Use Cases

### Primary Users
- **Team Members**: Access dashboards, boards, timelines, and chat channels within their assigned division.
- **Project Managers**: Create and manage tasks, projects, and views (board, list, timeline, etc.) with team assignments.
- **Admins**: Configure branding, integrations, and access controls; review usage and audit logs.
- **New Users**: Navigate onboarding to set up profiles and select/join organizations.

### User Stories
- As a new visitor, I can explore the landing page, view pricing, and initiate login to start onboarding.
- As an onboarded user with multiple organizations, I select an org and division before entering the workspace.
- As a team member, I use the activity bar to switch between explorer, channels, calendar, and people views.
- As a user in a workspace, I open items (tasks, docs, channels) as tabs and interact via drag-and-drop or inline edits.
- As an admin, I fill out integration forms for services like Slack or Zoom, seeing validation and mock test results.

## 3. System Overview

### High-Level Architecture (UI-Only)
- **Frontend Stack**: React with Vite for build tooling, TypeScript for type safety, React Router for navigation.
- **Styling and UI**: Tailwind CSS for utilities, shadcn/ui for accessible components, Lucide for icons. Dark mode as default.
- **State Management**: Zustand for UI states (e.g., panels, tabs, theme); optional TanStack Query for mock data fetching.
- **Mocking and Persistence**: MSW for simulating API responses; localStorage for user preferences like pane sizes.
- **Interactions**: dnd-kit for drag-and-drop, react-hook-form with Zod for forms, date-fns for date handling.

### Routing Structure
- **Public Routes**: `/` (Landing), `/pricing` (Plans comparison), `/login` (Auth simulation).
- **Onboarding Routes**: `/onboarding/profile`, `/onboarding/work-profile`, `/onboarding/tool-stack`, `/onboarding/invite`, `/onboarding/workspace-hub`.
- **Selection Routes**: `/select-org` (Organization grid), `/:orgId/divisions` (Division grid).
- **Workspace Routes** (Scoped): `/:orgId/:divisionId/dashboard`, `/:orgId/:divisionId/workspace`, `/:orgId/:divisionId/channels`, `/:orgId/:divisionId/c/:channelId`, `/:orgId/:divisionId/dm/:userId`, `/:orgId/:divisionId/calendar`, `/:orgId/:divisionId/people`, `/:orgId/:divisionId/admin`, `/:orgId/:divisionId/p/:projectId`, `/:orgId/:divisionId/t/:taskId`.
- **Shortlink Routes**: `/p/:projectId`, `/t/:taskId`, `/c/:channelId` (Resolve to scoped workspace route).

Post-login navigation: Direct to dashboard if single org/division; otherwise, to selection flow.

### Workspace Shell
A persistent VSCode-like layout within all scoped routes:
- **Activity Bar** (Left): Icons for Dashboard, Workspace, Channels, Calendar, People, Admin, Command Palette (Cmd/Ctrl+K).
- **Sidebar** (Left Panel): Contextual content (e.g., project tree for workspace, channel list for channels).
- **Tabs Bar** (Top): Multi-tab support for opened items, with close/split options.
- **Editor Area** (Center): Primary content view.
- **Right Panel** (Toggleable): Filters, metadata, saved views.
- **Bottom Panel** (Toggleable): Notifications, chat huddles.
- **Status Bar** (Bottom): Current scope (Org · Division), presence indicators, theme toggle.

## 4. Feature Requirements

### 4.1 Marketing Pages
- **Landing (/)**: Sticky header with navigation and auth CTAs. Hero section with value props, composite screenshot, why Yourever cards, how-it-works steps, integrations strip, pricing teaser, security info, logos, final CTA, footer.
- **Pricing (/pricing)**: Tier cards (Free, Plus, Business, Enterprise) with feature table, CTAs, FAQ.
- **Login (/login)**: Social buttons (Google, GitHub), email magic link form with toasts. Simulates redirect based on mock user data.

### 4.2 Onboarding Wizard
Step-by-step modals/forms:
- **Profile**: Name and avatar upload.
- **Work Profile**: Role, responsibilities checkboxes.
- **Tool Stack**: Selections for existing tools (Slack, Asana, etc.).
- **Invite**: Email invites as chips.
- **Workspace Hub**: Create/select org, then division; fast-path if single option.

### 4.3 Selection Pages
- **Select Org**: Searchable grid of org cards with badges.
- **Divisions**: Grid filtered by user role (all for admins, assigned for members).

### 4.4 Workspace Features
- **Dashboard**: KPI metrics (e.g., On Track tasks), presence, quick adds, activity feed, pinned items.
- **Workspace**: Tabbed views:
  - Board: Draggable columns/cards with inline edits for assignee, due date, priority, status, why note.
  - List: Sortable/filterable table.
  - Timeline: Resizable event bars.
  - Calendar: Month/week views, drag-to-create events.
  - Mind-Map: Node-based canvas for connections.
  - Docs: Rich text editor with basic formatting and slash commands.
- **Channels**: List with badges; detail view with threads, reactions, files, search, huddle button (opens bottom panel).
- **DMs**: 1:1 chat with presence.
- **Calendar**: Shared event views with attendees and conflicts.
- **People**: User directory table; invite/deactivate modals.
- **Admin**:
  - Branding: Logo, theme preview.
  - Domain & Access: Domain input, SSO stubs.
  - Integrations: Forms for each service (Slack, Asana, Zoom, etc.) with fields like API key, scopes, sync direction; mock test button.
  - Usage: Mock charts for seats/storage.
  - Audit Log: Paginated table with filters.
- **Project/Task Details**: Header with edits; tabs/properties for subtasks, comments, attachments.

### 4.5 Interactions and UX
- **Command Palette** (Cmd/Ctrl+K): Quick actions (new item, switch scope, recent opens).
- **Global Shortcuts**: Documented in tooltips/status bar.
- **States**: Empty (with CTAs), loading (skeletons), error (retry toasts).
- **Forms**: Validation with Zod (e.g., required fields, URL checks); success/error feedback.
- **Accessibility**: WCAG AA compliance, keyboard navigation, ARIA labels, focus management.

### 4.6 Mock Data and APIs
- MSW endpoints: Session (user/orgs), orgs/divisions/projects/tasks/channels/events/people, shortlink resolution.
- Realistic fixtures: Sample orgs, divisions, 5-10 tasks/projects/channels per scope, user profiles.

## 5. Non-Functional Requirements
- **Performance**: Lazy-load routes, virtualize long lists.
- **Accessibility**: Screen reader support, color contrast, keyboard-only usability.
- **Theming**: Dark mode default; switchable.
- **Internationalization**: Layout-ready (i18n keys for future).
- **Testing**: UI smoke tests implied via polished states.

## 6. Acceptance Criteria
- App runs via `pnpm dev` without errors.
- All routes render correctly; shell persists across navigation.
- Interactions (dnd, forms, modals) feel responsive.
- Mocks simulate realistic data flow (e.g., login redirects properly).
- README includes setup, shortcuts, and structure overview.

## 7. Future Considerations
- Backend integration with RLS-enabled PostgreSQL.
- Real auth (e.g., Supabase/Auth0) and persistence.
- AI features for chat and automation.
