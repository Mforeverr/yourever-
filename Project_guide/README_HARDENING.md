# Yourever — Hardening Pack

This bundle contains configs, scaffolds, and docs to raise the UI-only repo closer to production readiness.

## How to integrate
1. Copy `config/**` and `docs/**` into your repo (merge paths).  
2. Copy `src_additions/**` into your repo `src/**` (or selectively).
3. Merge the JSON from `package-patches/package.json.merge.txt` into your `package.json`.
4. Install dev dependencies (see Hardening Plan).

## Where to use
- Wrap your top-level router with `ErrorBoundary` and `AsyncBoundary`.
- Use `DataTableVirtualized` for large lists (rows > 2000).
- Wrap the app with `I18nProvider` and call `useT()` for strings.
- Replace `lib/sentry.ts` with real Sentry SDK when ready.
