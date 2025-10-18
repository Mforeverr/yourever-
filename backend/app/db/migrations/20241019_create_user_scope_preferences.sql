-- Persist per-user workspace scope selections while keeping history minimal.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_scope_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    preference_type TEXT NOT NULL DEFAULT 'workspace',
    org_id UUID NOT NULL,
    division_id UUID,
    remembered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_scope_preferences_user FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_scope_preferences_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_scope_preferences_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scope_preferences_user_type
    ON public.user_scope_preferences (user_id, preference_type);

CREATE INDEX IF NOT EXISTS idx_scope_preferences_org
    ON public.user_scope_preferences (org_id);

CREATE INDEX IF NOT EXISTS idx_scope_preferences_division
    ON public.user_scope_preferences (division_id);

CREATE OR REPLACE FUNCTION public.touch_user_scope_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_user_scope_preferences_updated_at ON public.user_scope_preferences;

CREATE TRIGGER trg_touch_user_scope_preferences_updated_at
BEFORE UPDATE ON public.user_scope_preferences
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_scope_preferences_updated_at();
