-- Seedable workspace entities supporting live data and editable templates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.workspace_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    division_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    badge_count INTEGER NOT NULL DEFAULT 0,
    dot_color TEXT NOT NULL DEFAULT 'bg-blue-500',
    status TEXT NOT NULL DEFAULT 'active',
    default_view TEXT NOT NULL DEFAULT 'board',
    lead_user_id UUID,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT fk_workspace_projects_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_workspace_projects_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_projects_org_name
    ON public.workspace_projects (org_id, name)
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_projects_org_division
    ON public.workspace_projects (org_id, COALESCE(division_id, org_id));

CREATE INDEX IF NOT EXISTS idx_workspace_projects_template
    ON public.workspace_projects (org_id, is_template);

CREATE TABLE IF NOT EXISTS public.workspace_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    division_id UUID,
    project_id UUID,
    name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Medium',
    badge_variant TEXT NOT NULL DEFAULT 'secondary',
    dot_color TEXT NOT NULL DEFAULT 'bg-blue-500',
    due_at TIMESTAMPTZ,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT fk_workspace_tasks_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_workspace_tasks_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL,
    CONSTRAINT fk_workspace_tasks_project FOREIGN KEY (project_id) REFERENCES public.workspace_projects (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_tasks_org_division
    ON public.workspace_tasks (org_id, COALESCE(division_id, org_id));

CREATE INDEX IF NOT EXISTS idx_workspace_tasks_template
    ON public.workspace_tasks (org_id, is_template);

CREATE TABLE IF NOT EXISTS public.workspace_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    division_id UUID,
    name TEXT NOT NULL,
    url TEXT,
    summary TEXT,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT fk_workspace_docs_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_workspace_docs_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_docs_org_division
    ON public.workspace_docs (org_id, COALESCE(division_id, org_id));

CREATE INDEX IF NOT EXISTS idx_workspace_docs_template
    ON public.workspace_docs (org_id, is_template);

CREATE TABLE IF NOT EXISTS public.workspace_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    division_id UUID,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL DEFAULT 'public',
    topic TEXT,
    description TEXT,
    member_count INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    unread_count INTEGER NOT NULL DEFAULT 0,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    CONSTRAINT fk_workspace_channels_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_workspace_channels_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_channels_org_slug
    ON public.workspace_channels (org_id, slug)
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_channels_org_division
    ON public.workspace_channels (org_id, COALESCE(division_id, org_id));

CREATE INDEX IF NOT EXISTS idx_workspace_channels_template
    ON public.workspace_channels (org_id, is_template);

CREATE TABLE IF NOT EXISTS public.workspace_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    division_id UUID,
    actor_id UUID,
    actor_name TEXT,
    actor_role TEXT,
    activity_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    template_source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_workspace_activities_org FOREIGN KEY (org_id) REFERENCES public.organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_workspace_activities_division FOREIGN KEY (division_id) REFERENCES public.divisions (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_activities_org_division
    ON public.workspace_activities (org_id, COALESCE(division_id, org_id), occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_activities_template
    ON public.workspace_activities (org_id, is_template);

CREATE OR REPLACE FUNCTION public.touch_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.clear_template_flag_after_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_template AND (NEW IS DISTINCT FROM OLD) THEN
        NEW.is_template = FALSE;
        NEW.template_source = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_workspace_projects ON public.workspace_projects;
CREATE TRIGGER trg_touch_workspace_projects
BEFORE UPDATE ON public.workspace_projects
FOR EACH ROW
EXECUTE FUNCTION public.touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_touch_workspace_tasks ON public.workspace_tasks;
CREATE TRIGGER trg_touch_workspace_tasks
BEFORE UPDATE ON public.workspace_tasks
FOR EACH ROW
EXECUTE FUNCTION public.touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_touch_workspace_docs ON public.workspace_docs;
CREATE TRIGGER trg_touch_workspace_docs
BEFORE UPDATE ON public.workspace_docs
FOR EACH ROW
EXECUTE FUNCTION public.touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_touch_workspace_channels ON public.workspace_channels;
CREATE TRIGGER trg_touch_workspace_channels
BEFORE UPDATE ON public.workspace_channels
FOR EACH ROW
EXECUTE FUNCTION public.touch_workspace_updated_at();

DROP TRIGGER IF EXISTS trg_clear_template_projects ON public.workspace_projects;
CREATE TRIGGER trg_clear_template_projects
BEFORE UPDATE ON public.workspace_projects
FOR EACH ROW
EXECUTE FUNCTION public.clear_template_flag_after_update();

DROP TRIGGER IF EXISTS trg_clear_template_tasks ON public.workspace_tasks;
CREATE TRIGGER trg_clear_template_tasks
BEFORE UPDATE ON public.workspace_tasks
FOR EACH ROW
EXECUTE FUNCTION public.clear_template_flag_after_update();

DROP TRIGGER IF EXISTS trg_clear_template_docs ON public.workspace_docs;
CREATE TRIGGER trg_clear_template_docs
BEFORE UPDATE ON public.workspace_docs
FOR EACH ROW
EXECUTE FUNCTION public.clear_template_flag_after_update();

DROP TRIGGER IF EXISTS trg_clear_template_channels ON public.workspace_channels;
CREATE TRIGGER trg_clear_template_channels
BEFORE UPDATE ON public.workspace_channels
FOR EACH ROW
EXECUTE FUNCTION public.clear_template_flag_after_update();

DROP TRIGGER IF EXISTS trg_clear_template_activities ON public.workspace_activities;
CREATE TRIGGER trg_clear_template_activities
BEFORE UPDATE ON public.workspace_activities
FOR EACH ROW
EXECUTE FUNCTION public.clear_template_flag_after_update();
