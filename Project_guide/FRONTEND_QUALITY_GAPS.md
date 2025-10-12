# Frontend Quality Gaps — Yourever

This document captures gaps between the current scaffold and a production bar similar to Asana/Notion/Teams/ClickUp.

## 1) Testing
- **Unit/Component**: Add Vitest + RTL coverage on all primitives and data views.
- **Integration**: Test route guards, shell toggles, command palette actions.
- **E2E**: Playwright smoke (marketing → login → select-org → dashboard), drag/drop happy path.
- **A11y**: axe against critical pages; keyboard trap tests.

## 2) Resilience
- Error boundaries at route shells; Async boundaries around lazy routes.
- Centralized toast + error mapper for API failures (future real backend).
- Retry/backoff patterns with cancellation.

## 3) Performance
- Route code-splitting + prefetch on hover.
- Virtualized large lists and channels.
- Memoization hygiene; selector-based Zustand patterns.
- Perf budgets and bundle checks (vite build output).

## 4) Accessibility & i18n
- Focus management on route change; skip links.
- Color contrast tokens; prefers-reduced-motion.
- i18n (EN baseline + ID example) and timezone awareness.

## 5) Design System & Docs
- Full shadcn set; variants via `cva`.
- Storybook stories for every reusable component.
- Screenshot/visual regression (Chromatic or Playwright screenshots).

## 6) Observability & Security-in-UI
- Sentry wiring with environment gates and PII scrubbing (stub provided).
- CSP + link-safety patterns for external links.
- Feature flags for high-risk features.
