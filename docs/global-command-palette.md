# Global Command Palette Integration

## Environment
- `NEXT_PUBLIC_ENABLE_GLOBAL_COMMAND_API=true` enables the FastAPI-backed search and quick-create endpoints. Without this flag the palette short-circuits with a warning.
- The flag lives in `.env.local` so the Next.js runtime exposes it during build and at runtime.

## State Architecture
- `usePaletteStore` (`src/state/palette.store.ts`) centralises palette UI state:
  - dialog visibility, search query/results lifecycle, loading/error flags.
  - quick-add launch options so the modal can render outside route trees.
  - helper actions (`openPalette`, `closePalette`, `togglePalette`, `openQuickAdd`, etc.) used across the app via `useCommandPalette`.
- `useScopeStore` (`src/state/scope.store.ts`) mirrors the active organization/division snapshot sourced from `ScopeProvider`. The palette reads `workspaceBasePath`, `currentOrgId`, and `currentDivisionId` to scope API requests and link generation.

## Request Flow
1. Opening the palette (Cmd/Ctrl+K or `useCommandPalette().openPalette`) hydrates the store and renders the global dialog once from `CommandPaletteProvider` in `src/app/layout.tsx`.
2. Typing updates the shared query. A debounced effect calls `GET /api/search/global` with `orgId`/`divisionId` when available.
3. Results return as `ApiSearchResult[]` and are mapped into scope-aware hrefs using the store's `workspaceBasePath`.
4. Selecting a quick action pushes the relevant route or triggers `openQuickAdd`, which spawns the shared `QuickAddModal`.
5. Quick-add submissions send the scoped payload (`orgId`/`divisionId`) to the FastAPI quick-create endpoints and surface toast feedback.

## Usage Tips
- Import `useCommandPalette` anywhere you need to open the dialog or quick-add flows without re-rendering the underlying components.
- When you add new entity types, extend:
  - the `GlobalEntityType` union and badge/icon maps in `command-palette.tsx`.
  - `QUICK_CREATE_ENDPOINTS` for quick-create support.
- Keep scope data flowing through `ScopeProvider`; it will automatically sync into the store for palette access.
