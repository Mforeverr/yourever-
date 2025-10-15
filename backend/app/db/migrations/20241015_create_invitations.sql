-- Create invitations table to manage workspace membership requests
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY,
    token UUID NOT NULL UNIQUE,
    org_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    division_id UUID NULL REFERENCES public.divisions (id) ON DELETE SET NULL,
    inviter_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    message TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ NULL,
    declined_at TIMESTAMPTZ NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS invitations_org_status_idx
    ON public.invitations (org_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_unique_pending_email
    ON public.invitations (org_id, LOWER(email))
    WHERE status = 'pending';

-- Trigger to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.touch_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_invitations_updated_at ON public.invitations;
CREATE TRIGGER trg_touch_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_invitations_updated_at();
