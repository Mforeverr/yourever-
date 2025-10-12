# Zustand State Management

## Stores

- `useUIStore` (`src/state/ui.store.ts`): centralises workspace UI state (activity selection, panel toggles, tab metadata, floating assistant). Provides helpers such as `toggleLeftSidebar`, `toggleRightPanel`, `openBottomPanel`, `closeBottomPanel`, `openFloatingAssistant`, `toggleSplitView`, `openTab`, `closeTab`, `setActiveTabId`, as well as size persistence via `setRightPanelSize` and `setBottomPanelHeight`. Key slices persist to `localStorage` so layouts restore on reload.
- `usePaletteStore` (`src/state/palette.store.ts`): powers the global command palette and persists the latest search session using `sessionStorage`.
- `useScopeStore` (`src/state/scope.store.ts`): mirrors the active organization/division context so non-context consumers (e.g., palette, persistence) can read scoped IDs.

All stores are re-exported via `src/state/index.ts` for convenience.

## Usage

```tsx
import { useUIStore } from "@/state"

const leftSidebarCollapsed = useUIStore(state => state.leftSidebarCollapsed)
const toggleLeftSidebar = useUIStore(state => state.toggleLeftSidebar)
```

Keep selectors narrow to avoid unnecessary re-renders. Prefer store actions (e.g. `openTab`, `toggleRightPanel`) over mutating local component state.

For lightweight, component-level persistence use `usePersistentState`:

```tsx
const [draft, setDraft] = usePersistentState("quick-draft", "")
```

Bottom panel consumers can call the dedicated hook:

```tsx
import { useBottomPanel } from "@/hooks/use-bottom-panel"

const { open, close, session } = useBottomPanel()
open({ id: "call-1", title: "Call", participants: [...] })
```

To clear all persisted Yourever state on logout:

```ts
import { localStorageService, sessionStorageService } from "@/lib/storage"

localStorageService.clearByPrefix("yourever-")
sessionStorageService.clearByPrefix("yourever-")
```

## Component Wiring

- `WorkspaceShell` now pulls activity, panel, and tab state from `useUIStore`.
- `RightPanelProvider` delegates collapse state to `useUIStore` while retaining local filter/view data.
- `ScopeProvider` pushes snapshots into `useScopeStore` so other features can react without threading context props.

Panel visibility and sizing persistence (Task 3.3) now ride on the shared `persist` middleware; further polish (animation tuning, advanced migrations) is tracked for the UX polish phase.

## Devtools

Set `NEXT_PUBLIC_ENABLE_ZUSTAND_DEVTOOLS=true` in `.env.local` to enable runtime instrumentation for all stores. The helper in `src/state/store-utils.ts` ensures devtools are tree-shaken from production builds when the flag is omitted.
