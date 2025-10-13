# Backend Architecture Scaffold

**Author:** Eldrie (CTO Dev)  
**Date:** 2025-10-11  
**Role:** Backend coordination

## Overview
The backend follows a modular-monolith layout that mirrors the frontend module boundaries. Each domain module exposes a FastAPI router and depends on shared interfaces and dependencies rather than reaching into other modules directly.

**Environment variables**
- `YOUREVER_DATABASE_URL` (or `DATABASE_URL`) — async SQLAlchemy connection string (e.g. `postgresql+asyncpg://...`)
- `YOUREVER_DATABASE_ECHO` — set to `true` to enable SQL logging during development.

```
backend/
└── app/
    ├── api/                 # Aggregates all module routers before mounting on FastAPI
    ├── core/                # Shared config, logging, error helpers, service/repository bases
    ├── db/                  # Persistence bootstrap (sessions, migrations)
    ├── dependencies/        # DI-friendly adapters (Supabase auth, etc.)
    ├── interfaces/          # Cross-module contracts
    ├── modules/
    │   ├── admin/           # Back-office analytics (answer retrieval, exports)
    │   ├── health/          # Lightweight readiness probes
    │   ├── huddles/         # Team huddle endpoints (schemas, repository, service, router, di)
    │   ├── onboarding/      # Onboarding validation helpers shared across flows
    │   ├── projects/        # Projects REST module backed by SQLAlchemy
    │   └── users/           # Account/session persistence, publishers, aggregation workers
    └── main.py              # FastAPI bootstrap
```

### Why everything lives under `modules/`

- **Single registration surface.** `backend/app/modules/__init__.py` exposes a `MODULE_ROUTERS` tuple that the FastAPI app mounts. Keeping routers in `modules/*/router.py` makes the API boundary explicit and avoids scattering endpoint declarations across the codebase.
- **Encapsulated domain stacks.** Each folder contains its own schemas, services, repositories, publishers, and background workers. That keeps cohesion high while letting other domains interact through well-defined interfaces instead of reaching into internal classes.
- **Open/Closed growth.** Adding a capability (e.g., admin analytics) means creating a new folder with its router and wiring, then extending `MODULE_ROUTERS`. Existing modules stay untouched, which matches the modular-monolith guidelines in `AGENTS.md`.

When you trace a request, start at `modules/<domain>/router.py`, check any dependencies declared in `di.py`, and follow through to the service/repository layers. Background tasks (publishers, aggregators, exporters) sit beside the domain that owns the data so operational code and HTTP handlers evolve together.

## Module Anatomy
Every module under `backend/app/modules` should:

1. Define request/response schemas in `schemas.py`.
2. Encapsulate business logic inside a service class (e.g., `service.py`).
3. Provide dependency wiring in `di.py` so routers remain declarative.
4. Keep persistence concerns behind repositories (e.g., `repository.py`) which depend on shared interfaces.
5. Publish REST endpoints through `router.py`, importing dependencies from `backend.app.dependencies`.

Routers are registered in `backend/app/modules/__init__.py` and mounted via `backend/app/api/__init__.py`, keeping `main.py` minimal.

## Auth Integration
- `backend/app/dependencies/auth.py` validates Supabase JWTs and surfaces a `CurrentPrincipal`.
- Modules that require authentication should depend on `require_current_principal` and avoid re-decoding tokens.

## Next Steps
1. Introduce SQL migrations (Alembic or Prisma) so the models under `modules/*/models.py` stay in sync with the database.
2. Add new domain modules (e.g., command palette) by following the same folder pattern and extending `MODULE_ROUTERS`.
3. Create integration tests that spin up a transactional `AsyncSession` and exercise repositories/services with Supabase-scoped principals.
