-- Author: Codex (Backend Platform)
-- Date: 2025-10-18
-- Role: Backend

CREATE TABLE IF NOT EXISTS public.user_scope_snapshots (
    user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    active_org_id uuid NULL,
    active_division_id uuid NULL,
    claims jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_scope_snapshots_org
    ON public.user_scope_snapshots (active_org_id);

CREATE INDEX IF NOT EXISTS idx_user_scope_snapshots_division
    ON public.user_scope_snapshots (active_division_id);
