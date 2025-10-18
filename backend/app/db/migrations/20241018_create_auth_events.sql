-- Creates audit log table for authentication events.

CREATE TABLE IF NOT EXISTS public.auth_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash TEXT,
    user_agent TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_occurred_at
    ON public.auth_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_events_event_type
    ON public.auth_events (event_type);
