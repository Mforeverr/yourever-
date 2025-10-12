# Yourever — Hardening Plan (UI-Only Repo)

This pack upgrades your UI scaffold toward production readiness without adding a backend.

## Scope
- **Tooling & CI**: Vitest/RTL, Playwright, Storybook, ESLint strict, TS strict, GitHub Actions CI.
- **Resilience Components**: Error boundaries, Suspense/Async boundary, virtualized table.
- **Ops & Quality**: A11y checklist, test strategy, perf hooks, feature flags, Sentry stub.
- **i18n scaffold**: Lightweight context-based translator (no external dependency).

## Apply (Quick)
1. Unzip beside your repo root.
2. Copy from `src_additions/**` into your repo `src/**` (keep paths).
3. Merge configs from `config/**` into your repo (see filenames).
4. Merge `package-patches/package.json.merge.txt` into your `package.json` (deps & scripts).
5. Run:
   ```bash
   pnpm add -D @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest jsdom @vitejs/plugin-react @storybook/react-vite @storybook/test @storybook/addon-essentials storybook @types/testing-library__jest-dom playwright @playwright/test eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
   ```
6. Optional: `pnpm dlx playwright install --with-deps` (CI does this automatically).

## New scripts (after merge)
- `pnpm test` — Vitest (jsdom)
- `pnpm test:watch` — watch mode
- `pnpm e2e` — Playwright tests
- `pnpm storybook` — run Storybook
- `pnpm build-storybook` — static Storybook
- `pnpm lint` — ESLint (strict)
- `pnpm typecheck:strict` — TS strict project

## Phased Checklist
**M1 – Frontend stability**
- [ ] ErrorBoundary & AsyncBoundary wrapped around route trees
- [ ] Route-level code splitting (lazy suspense)
- [ ] Virtualized DataTable for large lists
- [ ] CI: typecheck, lint, unit tests, build
- [ ] A11y: smoke axe run locally + checklist pass

**M2 – Real data & permissions (later)**
- [ ] Switch mock queries → real gateway
- [ ] Introduce request/response schemas and error mappers

**M3 – Realtime & collaboration (later)**
- [ ] Presence, channels, cursors, conflict UI

**M4 – Enterprise & compliance (later)**
- [ ] SSO/SCIM, retention/export, audit evidencing
