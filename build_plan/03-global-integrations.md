# Phase 3: Global Integrations

**Timeline:** Week 2
**Goal:** Implement global command palette, state management, and persistence

---

## 🚀 Task 3.1: Global Command Palette
**Estimate:** 1 day
**Priority:** High

### Files to create/modify:
```
src/components/global/command-palette.tsx (move from demo)
src/components/global/quick-add-modal.tsx (new)
src/app/layout.tsx (add global providers)
```

### FastAPI Endpoints needed:
```typescript
GET /api/search/global?q={query}         // Global search
POST /api/tasks/quick                   // Quick task creation
POST /api/projects/quick                // Quick project creation
POST /api/channels/quick                // Quick channel creation
POST /api/events/quick                  // Quick event creation
```

### Implementation steps:
1. **Extract command palette** from demo page
2. **Add global keyboard shortcut** (Cmd/Ctrl+K)
3. **Implement quick actions** (new task, project, etc.)
4. **Add search functionality** with API integration
5. **Mount in root layout** for global access

### Code Structure:
```typescript
// command-palette.tsx
interface CommandPaletteAction {
  id: string
  title: string
  description?: string
  icon: React.ReactNode
  shortcut?: string
  action: () => void
  keywords?: string[]
}

// Quick actions structure
const quickActions = [
  {
    id: 'new-task',
    title: 'New Task',
    description: 'Create a new task',
    icon: Plus,
    action: () => openQuickAddModal('task')
  },
  {
    id: 'new-project',
    title: 'New Project',
    description: 'Create a new project',
    icon: Folder,
    action: () => openQuickAddModal('project')
  }
  // ... more actions
]
```

### Acceptance Criteria:
- [x] Command palette opens with Cmd/Ctrl+K
- [x] Quick actions functional (task, project, channel, event, doc)
- [x] Global search working across entities
- [x] Keyboard navigation supported
- [x] Search results show relevant entities
- [x] Quick add modal opens for selected action

---

## 🚀 Task 3.2: Zustand State Management Setup
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/state/ui.store.ts (new)
src/state/scope.store.ts (new)
src/state/palette.store.ts (new)
src/state/index.ts (new)
```

### Implementation steps:
1. **Create UI state store** (panels, tabs, sidebar state)
2. **Create scope store** (org, division, user context)
3. **Create palette store** (command palette state)
4. **Replace React context** with Zustand where appropriate

### Code Structure:
```typescript
// ui.store.ts
interface UIState {
  // Panel states
  leftSidebarCollapsed: boolean
  rightPanelCollapsed: boolean
  bottomPanelCollapsed: boolean

  // Tab states
  activeTabs: Tab[]
  activeTabId: string

  // Activity states
  activeActivity: string

  // Actions
  toggleLeftSidebar: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  setActiveTab: (tabId: string) => void
  closeTab: (tabId: string) => void
  setActiveActivity: (activity: string) => void
}

// scope.store.ts
interface ScopeState {
  orgId: string | null
  divisionId: string | null
  user: User | null
  organizations: Organization[]
  currentOrg: Organization | null
  currentDivision: Division | null

  // Actions
  setScope: (orgId: string, divisionId: string) => void
  setUser: (user: User) => void
  setOrganizations: (orgs: Organization[]) => void
  switchOrganization: (orgId: string) => void
  switchDivision: (divisionId: string) => void
}

// palette.store.ts
interface PaletteState {
  isOpen: boolean
  searchQuery: string
  selectedIndex: number
  searchResults: SearchResult[]

  // Actions
  openPalette: () => void
  closePalette: () => void
  setSearchQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  setSearchResults: (results: SearchResult[]) => void
}
```

### Acceptance Criteria:
- [x] UI state store manages panels and tabs
- [x] Scope store handles org/division context
- [x] Palette store manages command palette state
- [x] State persists across component unmounts
- [x] Zustand devtools working *(Integrated via `withOptionalDevtools`; enable instrumentation by setting `NEXT_PUBLIC_ENABLE_ZUSTAND_DEVTOOLS=true`.)*

---

## 🚀 Task 3.3: State Persistence
**Estimate:** 0.5 day
**Priority:** High

### Files to create/modify:
```
src/lib/storage.ts (new)
src/hooks/use-persistent-state.ts (new)
```

### Implementation steps:
1. **Create localStorage wrappers** for state persistence
2. **Persist UI state** (panel sizes, active tabs, sidebar state)
3. **Persist scope state** (last accessed org/division)
4. **Add migration logic** for state changes

### Code Structure:
```typescript
// storage.ts
interface StorageService {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  clear(): void
}

// Persistent state structure
interface PersistentUIState {
  leftSidebarCollapsed: boolean
  rightPanelCollapsed: boolean
  rightPanelWidth: number
  bottomPanelHeight: number
  activeTabs: Tab[]
}

interface PersistentScopeState {
  lastOrgId: string | null
  lastDivisionId: string | null
  recentOrgs: string[]
  recentDivisions: string[]
}

// use-persistent-state.ts
const usePersistentState = <T>(
  key: string,
  defaultValue: T,
  options?: {
    storage?: 'localStorage' | 'sessionStorage'
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  }
) => {
  // Implementation
}
```

### Acceptance Criteria:
- [x] UI state persists across page reloads
- [x] Scope state remembers last org/division
- [x] Panel sizes saved and restored *(Right-panel width and bottom-panel height persist via `useUIStore` setters invoked from resizable callbacks.)*
- [x] Tab state persists correctly
- [x] Migration logic handles schema changes

---

## 🚀 Task 3.4: Centralized Panel Controls
**Estimate:** 0.5 day
**Priority:** High

### Files to modify:
```
src/components/shell/workspace-shell.tsx
src/components/shell/right-panel.tsx
src/components/shell/bottom-panel.tsx (new)
```

### Implementation steps:
1. **Move panel state** to global store
2. **Centralize bottom panel control**
3. **Add keyboard shortcuts** for panel toggles
4. **Implement panel size persistence**

### Code Structure:
```typescript
// workspace-shell.tsx - Centralized panel control
const WorkspaceShell = () => {
  const {
    leftSidebarCollapsed,
    rightPanelCollapsed,
    bottomPanelCollapsed,
    toggleLeftSidebar,
    toggleRightPanel,
    toggleBottomPanel
  } = useUIStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleRightPanel()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        toggleLeftSidebar()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        toggleBottomPanel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Component JSX */}
    </div>
  )
}

// bottom-panel.tsx (new centralized component)
const BottomPanel = () => {
  const { bottomPanelCollapsed, toggleBottomPanel, bottomPanelHeight } = useUIStore()

  if (bottomPanelCollapsed) return null

  return (
    <ResizablePanel defaultSize={20} minSize={10} maxSize={40}>
      {/* Bottom panel content */}
    </ResizablePanel>
  )
}
```

### Acceptance Criteria:
- [x] Panel state managed by global store
- [x] Bottom panel centralized and controlled globally
- [x] Keyboard shortcuts working (Ctrl/Cmd+B, Ctrl/Cmd+Shift+B, Ctrl/Cmd+J)
- [x] Panel sizes persist across sessions *(Right panel width and huddle height hydrate from persisted `useUIStore` values.)*
- [ ] Smooth animations for panel transitions *(Current implementation relies on default Tailwind transitions; dedicated animation polish deferred until UX review.)*

---

## 🎯 Phase 3 Success Criteria

- [x] Command palette accessible globally (Cmd/Ctrl+K)
- [x] Quick actions working for all entity types
- [x] Global search functional across workspace
- [x] State persists across page reloads
- [x] Panel controls centralized and persistent *(Visibility and dimension state persist via `useUIStore` migrations.)*

### Technical Requirements:
- [x] Zustand stores implemented correctly
- [x] State persistence working with localStorage/sessionStorage
- [x] Keyboard shortcuts implemented globally
- [x] API integration for search and quick actions *(Command palette now delegates to `/api/search/global` and quick-create POST endpoints via the shared REST client.)*
- [ ] Performance optimized for global state *(Profiling/polish earmarked for the post-integration hardening pass.)*

### UX Requirements:
- [ ] Smooth animations for palette and panels *(Default transitions in place; dedicated motion tuning slated for the UX polish track.)*
- [x] Keyboard navigation fully supported
- [x] Visual feedback for all interactions
- [x] Responsive design for mobile devices
- [x] Accessibility compliance for keyboard users

*Notes:* Remaining gaps are targeted performance profiling for the global stores and motion polish for palette/panel transitions; both are queued for the Phase 4 hardening and UX tracks.

---

## 🔗 Dependencies

**Prerequisites:** Phase 1 (Foundation & Routing)
**Blocking:** Phase 4 (Entity Pages)
**Parallel:** FastAPI search and quick-create endpoints

---

## 📝 Notes

- **Performance:** Use debouncing for search queries
- **Accessibility:** Ensure full keyboard navigation support
- **Mobile:** Command palette should work on mobile devices
- **Security:** Validate all quick-create actions against permissions
- **Analytics:** Track command palette usage and popular actions


### Status Summary

**Task 3.1 – Global Command Palette ✅**
Command palette implemented with full keyboard shortcut support (Cmd/Ctrl+K), quick actions for all entity types, global search functionality, and keyboard navigation. API integration complete with search and quick-create endpoints.

**Task 3.2 – Zustand State Management ✅**
UI, scope, and palette stores replace the prior React context usage. State persists across unmounts via `zustand/persist`, and devtools support is available behind the `NEXT_PUBLIC_ENABLE_ZUSTAND_DEVTOOLS` flag.

**Task 3.3 – State Persistence ✅**
UI and scope slices persist across reloads (with migrations and namespaced storage wrappers). Tab, collapse, and panel dimension state restore correctly after reloads. Panel size persistence (rightPanelWidth, bottomPanelHeight) is implemented and working.

**Task 3.4 – Centralized Panel Controls ✅**
Panel visibility is controlled exclusively through `useUIStore`; shortcuts (Ctrl/Cmd+B, Ctrl+Shift+B, Ctrl/Cmd+J) are wired in `workspace-shell`. Bottom panel centralized with extensible helpers. Panel size persistence is fully implemented.

**Phase 3 Success Criteria**
Functional: command palette, quick actions, global search, and persistent state all working; panel controls centralized with persistent sizes.
Technical: Zustand stores and persistence are in place, shortcuts work, and the palette is wired to the FastAPI endpoints. Devtools integration available via environment flag.
UX: palette and panels reuse existing transitions, keyboard navigation is supported, metadata surfaces in the huddle bar. All core functionality complete.
