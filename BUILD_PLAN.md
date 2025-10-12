# Yourever Build Plan: Alignment with Specification

**Goal:** Bring Next.js implementation to full spec compliance through micro-slice tasks
**Target:** VSCode-style workspace UI with scoped routing, global integrations, and mock data layer
**Backend:** FastAPI REST API integration points defined

---

## 🚀 Phase 1: Foundation & Routing (Week 1)

### Task 1.1: Scope-Based Routing Structure
**Estimate:** 1 day
**Files to create/modify:**
- `src/app/[orgId]/[divisionId]/layout.tsx` (new)
- `src/app/[orgId]/[divisionId]/dashboard/page.tsx` (move from current)
- `src/app/[orgId]/[divisionId]/workspace/page.tsx` (move from current)
- `src/app/[orgId]/[divisionId]/calendar/page.tsx` (move from current)
- `src/app/[orgId]/[divisionId]/people/page.tsx` (move from current)
- `src/app/[orgId]/[divisionId]/admin/page.tsx` (move from current)

**FastAPI Endpoints needed:**
```typescript
// Organization & Division APIs
GET /api/organizations                    // List user's orgs
GET /api/organizations/{orgId}/divisions  // List divisions in org
GET /api/organizations/{orgId}/divisions/{divisionId} // Get division details
```

**Implementation steps:**
1. Create dynamic route structure `[orgId]/[divisionId]`
2. Move existing workspace pages under scoped routes
3. Update WorkspaceShell navigation to use scoped paths
4. Add org/division context providers

### Task 1.2: Scope Context Management
**Estimate:** 0.5 day
**Files to create/modify:**
- `src/contexts/scope-context.tsx` (new)
- `src/hooks/use-scope.ts` (new)
- `src/lib/scope-utils.ts` (new)

**Implementation steps:**
1. Create scope context for org/division state
2. Add scope validation and redirect logic
3. Create scope switching utilities
4. Update existing components to use scope context

### Task 1.3: Updated WorkspaceShell Navigation
**Estimate:** 0.5 day
**Files to modify:**
- `src/components/shell/workspace-shell.tsx`
- `src/components/shell/scope-switcher.tsx`

**Implementation steps:**
1. Update navigation to use `router.push('/${orgId}/${divisionId}/dashboard')`
2. Make ScopeSwitcher functional with real API integration
3. Add loading states for scope switching
4. Handle invalid org/division redirects

---

## 🚀 Phase 2: Missing Core Flows (Week 1-2)

### Task 2.1: Login Page
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(marketing)/login/page.tsx` (new)
- `src/components/auth/login-form.tsx` (new)
- `src/components/auth/social-login.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
POST /api/auth/login                  // Email login
POST /api/auth/google                 // Google OAuth
POST /api/auth/github                 // GitHub OAuth
POST /api/auth/magic-link             // Magic link request
GET  /api/auth/magic-link/{token}     // Magic link verification
GET  /api/auth/me                     // Current user info
GET  /api/auth/me/organizations        // User's orgs for redirect logic
```

**Implementation steps:**
1. Create login page with multiple auth options
2. Implement post-login redirect logic (single org → dashboard, multiple → select-org)
3. Add form validation and error handling
4. Connect to FastAPI endpoints

### Task 2.2: Organization Selection Page
**Estimate:** 0.5 day
**Files to create:**
- `src/app/select-org/page.tsx` (new)
- `src/components/selection/org-card.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
GET /api/organizations                    // List orgs with user's roles
GET /api/organizations/{orgId}/divisions  // List divisions for org selection
```

**Implementation steps:**
1. Create org selection grid with search
2. Add org cards with role badges (Owner/Admin/Member)
3. Implement navigation to selected org's division selection
4. Add empty states and loading skeletons

### Task 2.3: Division Selection Page
**Estimate:** 0.5 day
**Files to create:**
- `src/app/[orgId]/divisions/page.tsx` (new)
- `src/components/selection/division-card.tsx` (new)

**Implementation steps:**
1. Create division selection for specific org
2. Add division cards with project counts
3. Implement navigation to scoped workspace
4. Handle permission-based filtering

### Task 2.4: Onboarding Flow - Profile Setup
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(onboarding)/profile/page.tsx` (new)
- `src/components/onboarding/profile-form.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
PUT  /api/users/profile                  // Update user profile
POST /api/users/avatar                   // Upload avatar
```

**Implementation steps:**
1. Create profile setup with name, avatar, role
2. Add avatar upload functionality
3. Implement progress indicator
4. Add form validation and persistence

### Task 2.5: Onboarding Flow - Work Profile
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(onboarding)/work-profile/page.tsx` (new)
- `src/components/onboarding/work-profile-form.tsx` (new)

**Implementation steps:**
1. Create work profile setup (role, functions, intents)
2. Add checkbox selections for work preferences
3. Implement role-based suggestions
4. Connect to user preferences API

### Task 2.6: Onboarding Flow - Tool Stack
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(onboarding)/tool-stack/page.tsx` (new)
- `src/components/onboarding/tool-selection.tsx` (new)

**Implementation steps:**
1. Create tool selection interface (Slack, Asana, Zoom, etc.)
2. Add tool cards with descriptions
3. Implement integration setup flow
4. Add skip option for later setup

### Task 2.7: Onboarding Flow - Invite Team
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(onboarding)/invite/page.tsx` (new)
- `src/components/onboarding/invite-form.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
POST /api/invitations/bulk             // Send multiple invitations
GET  /api/invitations/status           // Check invitation status
```

**Implementation steps:**
1. Create team invitation interface
2. Add email input with validation
3. Implement role selection for invitees
4. Add invitation status tracking

### Task 2.8: Onboarding Flow - Workspace Hub
**Estimate:** 0.5 day
**Files to create:**
- `src/app/(onboarding)/workspace-hub/page.tsx` (new)
- `src/components/onboarding/workspace-creation.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
POST /api/organizations                  // Create new org
POST /api/organizations/{orgId}/divisions // Create new division
GET  /api/organizations/templates        // Get org templates
```

**Implementation steps:**
1. Create workspace selection/creation flow
2. Add org creation form with templates
3. Implement division setup within org
4. Add final onboarding completion flow

---

## 🚀 Phase 3: Global Integrations (Week 2)

### Task 3.1: Global Command Palette
**Estimate:** 1 day
**Files to create/modify:**
- `src/components/global/command-palette.tsx` (move from demo)
- `src/components/global/quick-add-modal.tsx` (new)
- `src/app/layout.tsx` (add global providers)

**FastAPI Endpoints needed:**
```typescript
GET /api/search/global?q={query}         // Global search
POST /api/tasks/quick                   // Quick task creation
POST /api/projects/quick                // Quick project creation
POST /api/channels/quick                // Quick channel creation
POST /api/events/quick                  // Quick event creation
```

**Implementation steps:**
1. Extract command palette from demo page
2. Add global keyboard shortcut (Cmd/Ctrl+K)
3. Implement quick actions (new task, project, etc.)
4. Add search functionality with API integration
5. Mount in root layout for global access

### Task 3.2: Zustand State Management Setup
**Estimate:** 0.5 day
**Files to create:**
- `src/state/ui.store.ts` (new)
- `src/state/scope.store.ts` (new)
- `src/state/palette.store.ts` (new)
- `src/state/index.ts` (new)

**Implementation steps:**
1. Create UI state store (panels, tabs, sidebar state)
2. Create scope store (org, division, user context)
3. Create palette store (command palette state)
4. Replace React context with Zustand where appropriate

### Task 3.3: State Persistence
**Estimate:** 0.5 day
**Files to create/modify:**
- `src/lib/storage.ts` (new)
- `src/hooks/use-persistent-state.ts` (new)

**Implementation steps:**
1. Create localStorage wrappers for state persistence
2. Persist UI state (panel sizes, active tabs, sidebar state)
3. Persist scope state (last accessed org/division)
4. Add migration logic for state changes

### Task 3.4: Centralized Panel Controls
**Estimate:** 0.5 day
**Files to modify:**
- `src/components/shell/workspace-shell.tsx`
- `src/components/shell/right-panel.tsx`
- `src/components/shell/bottom-panel.tsx` (new)

**Implementation steps:**
1. Move panel state to global store
2. Centralize bottom panel control
3. Add keyboard shortcuts for panel toggles
4. Implement panel size persistence

---

## 🚀 Phase 4: Entity Pages & Shortlinks (Week 2-3)

### Task 4.1: Project Detail Page
**Estimate:** 1 day
**Files to create:**
- `src/app/[orgId]/[divisionId]/projects/[projectId]/page.tsx` (new)
- `src/components/entities/project-header.tsx` (new)
- `src/components/entities/project-tabs.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
GET /api/projects/{projectId}           // Project details
PUT /api/projects/{projectId}           // Update project
DELETE /api/projects/{projectId}        // Delete project
GET /api/projects/{projectId}/tasks     // Project tasks
GET /api/projects/{projectId}/timeline  // Project timeline
GET /api/projects/{projectId}/docs      // Project docs
```

**Implementation steps:**
1. Create project detail page with tabs (Tasks/Timeline/Docs)
2. Add inline project name editing
3. Implement project member management
4. Add project settings and actions

### Task 4.2: Task Detail Page
**Estimate:** 1 day
**Files to create:**
- `src/app/[orgId]/[divisionId]/tasks/[taskId]/page.tsx` (new)
- `src/components/entities/task-header.tsx` (new)
- `src/components/entities/task-properties-grid.tsx` (new)
- `src/components/entities/why-note-editor.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
GET /api/tasks/{taskId}                 // Task details
PUT /api/tasks/{taskId}                 // Update task
DELETE /api/tasks/{taskId}              // Delete task
GET /api/tasks/{taskId}/comments        // Task comments
GET /api/tasks/{taskId}/subtasks        // Task subtasks
POST /api/tasks/{taskId}/comments       // Add comment
PUT /api/tasks/{taskId}/status          // Update status
```

**Implementation steps:**
1. Create task detail page with properties grid
2. Add inline task editing capabilities
3. Implement assignee, priority, status selectors
4. Add comments and activity feed
5. Implement sub-tasks and relationships

### Task 4.3: Shortlink Resolution Pages
**Estimate:** 0.5 day
**Files to create:**
- `src/app/p/[projectId]/page.tsx` (new)
- `src/app/t/[taskId]/page.tsx` (new)
- `src/app/c/[channelId]/page.tsx` (new)
- `src/components/global/resolving-splash.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
GET /api/shortlinks/resolve/{type}/{id} // Resolve shortlink to scoped URL
GET /api/projects/by-shortlink/{id}     // Get project by short ID
GET /api/tasks/by-shortlink/{id}        // Get task by short ID
GET /api/channels/by-shortlink/{id}     // Get channel by short ID
```

**Implementation steps:**
1. Create resolving splash screen component
2. Implement shortlink resolution logic
3. Add automatic redirect to scoped workspace
4. Handle invalid shortlinks gracefully

---

## 🚀 Phase 5: Admin Integration Forms (Week 3)

### Task 5.1: Per-Service Integration Forms
**Estimate:** 1 day
**Files to create:**
- `src/app/[orgId]/[divisionId]/admin/integrations/slack/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/zoom/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/gmail/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/gcal/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/notion/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/clickup/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/integrations/asana/page.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
// Generic integration endpoints
GET /api/integrations                     // List all integrations
GET /api/integrations/{service}          // Get specific integration config
PUT /api/integrations/{service}          // Update integration config
DELETE /api/integrations/{service}       // Remove integration
POST /api/integrations/{service}/test    // Test connection

// Service-specific endpoints
POST /api/integrations/slack/test        // Test Slack connection
GET /api/integrations/slack/workspaces   // Get Slack workspaces
POST /api/integrations/zoom/test         // Test Zoom connection
GET /api/integrations/zoom/templates     // Get Zoom meeting templates
```

**Implementation steps:**
1. Create individual integration form pages
2. Implement service-specific configuration fields
3. Add connection testing functionality
4. Include service-specific features (Slack workspaces, Zoom templates, etc.)

### Task 5.2: Admin Sections Enhancement
**Estimate:** 0.5 day
**Files to create:**
- `src/app/[orgId]/[divisionId]/admin/branding/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/domain/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/usage/page.tsx` (new)
- `src/app/[orgId]/[divisionId]/admin/audit/page.tsx` (new)

**FastAPI Endpoints needed:**
```typescript
// Branding
GET /api/organizations/{orgId}/branding  // Get branding settings
PUT /api/organizations/{orgId}/branding  // Update branding

// Domain & Access
GET /api/organizations/{orgId}/domain    // Get domain settings
PUT /api/organizations/{orgId}/domain    // Update domain settings
GET /api/organizations/{orgId}/sso       // Get SSO config

// Usage
GET /api/organizations/{orgId}/usage     // Get usage stats
GET /api/organizations/{orgId}/seats     // Get seat usage

// Audit
GET /api/organizations/{orgId}/audit     // Get audit logs
GET /api/organizations/{orgId}/audit/export // Export logs
```

**Implementation steps:**
1. Create dedicated admin section pages
2. Implement branding configuration with preview
3. Add domain access management interface
4. Create usage analytics dashboard
5. Build audit log interface with filtering

---

## 🚀 Phase 6: Mock Data Layer & API Integration (Week 3-4)

### Task 6.1: MSW Setup (or FastAPI Client)
**Estimate:** 0.5 day
**Files to create:**
- `src/mocks/handlers.ts` (new)
- `src/mocks/browser.ts` (new)
- `src/mocks/fixtures/` (new directory)

**FastAPI Client Alternative:**
- `src/lib/api-client.ts` (new)
- `src/lib/api-endpoints.ts` (new)

**Implementation steps:**
1. Choose approach: MSW for mocking OR FastAPI client
2. Set up API client with error handling
3. Create mock data fixtures for development
4. Implement request/response interceptors

### Task 6.2: TanStack Query Integration
**Estimate:** 0.5 day
**Files to create:**
- `src/lib/query-client.ts` (new)
- `src/hooks/api/use-organizations.ts` (new)
- `src/hooks/api/use-projects.ts` (new)
- `src/hooks/api/use-tasks.ts` (new)

**Implementation steps:**
1. Set up QueryClient with proper configuration
2. Create API hooks for common data fetching
3. Add caching and invalidation strategies
4. Implement optimistic updates where appropriate

### Task 6.3: Data Fetching Integration
**Estimate:** 1 day
**Files to modify:**
- Multiple components and pages

**Implementation steps:**
1. Replace static data with API calls
2. Add loading states and error handling
3. Implement proper data refetching
4. Add offline/fallback data strategies

---

## 🚀 Phase 7: Polish & Performance (Week 4)

### Task 7.1: Accessibility Improvements
**Estimate:** 0.5 day
**Implementation steps:**
1. Add ARIA labels and descriptions
2. Implement keyboard navigation
3. Add focus management
4. Test with screen readers

### Task 7.2: Performance Optimization
**Estimate:** 0.5 day
**Implementation steps:**
1. Implement code splitting for large components
2. Add image optimization
3. Optimize bundle size
4. Add loading skeletons

### Task 7.3: Error Handling & Edge Cases
**Estimate:** 0.5 day
**Implementation steps:**
1. Add comprehensive error boundaries
2. Implement retry logic for API calls
3. Add empty states for all data displays
4. Create 404 and error pages

### Task 7.4: Testing Setup
**Estimate:** 0.5 day
**Implementation steps:**
1. Set up unit testing framework
2. Add integration tests for critical flows
3. Implement E2E tests for user journeys
4. Add visual regression testing

---

## 📋 FastAPI Backend Requirements Summary

### Authentication & Users
```typescript
POST /api/auth/login
POST /api/auth/google
POST /api/auth/github
POST /api/auth/magic-link
GET  /api/auth/me
PUT  /api/users/profile
POST /api/users/avatar
```

### Organizations & Divisions
```typescript
GET /api/organizations
GET /api/organizations/{orgId}
POST /api/organizations
GET /api/organizations/{orgId}/divisions
POST /api/organizations/{orgId}/divisions
GET /api/organizations/{orgId}/divisions/{divisionId}
PUT /api/organizations/{orgId}/branding
PUT /api/organizations/{orgId}/domain
```

### Projects & Tasks
```typescript
GET /api/projects
POST /api/projects
GET /api/projects/{projectId}
PUT /api/projects/{projectId}
DELETE /api/projects/{projectId}
GET /api/projects/{projectId}/tasks
POST /api/tasks
GET /api/tasks/{taskId}
PUT /api/tasks/{taskId}
DELETE /api/tasks/{taskId}
```

### Channels & Communication
```typescript
GET /api/channels
POST /api/channels
GET /api/channels/{channelId}
GET /api/channels/{channelId}/messages
POST /api/channels/{channelId}/messages
```

### Admin & Integrations
```typescript
GET /api/integrations
GET /api/integrations/{service}
PUT /api/integrations/{service}
POST /api/integrations/{service}/test
GET /api/organizations/{orgId}/usage
GET /api/organizations/{orgId}/audit
```

### Search & Shortlinks
```typescript
GET /api/search/global
GET /api/shortlinks/resolve/{type}/{id}
GET /api/projects/by-shortlink/{id}
GET /api/tasks/by-shortlink/{id}
```

---

## 🎯 Success Criteria

- [ ] All routes implement scoped `/:orgId/:divisionId/...` structure
- [ ] Complete onboarding and selection flows implemented
- [ ] Global command palette functional (Cmd/Ctrl+K)
- [ ] State persistence working across sessions
- [ ] All admin integration forms implemented
- [ ] FastAPI endpoints integrated with proper error handling
- [ ] Shortlink resolution working
- [ ] Project and task detail pages complete
- [ ] Full accessibility compliance achieved
- [ ] Performance benchmarks met

**Total Estimated Time:** 3-4 weeks
**Dependencies:** FastAPI backend development parallel to frontend implementation