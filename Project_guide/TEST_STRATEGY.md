# Test Strategy — Yourever

## Layers
- **Unit/Component (Vitest + RTL)**: logic, rendering, a11y roles, keyboard handlers.
- **Integration (Vitest + RTL)**: router rendering, shell interactions, command palette.
- **E2E (Playwright)**: key journeys, shortlink resolver redirects, workspace tabs, channel messaging stub.

## Coverage targets
- 80% statements/branches on `components/ui` + `components/shell`.
- Smoke coverage on each route renders without console errors.

## Running
```bash
pnpm test
pnpm e2e
```
