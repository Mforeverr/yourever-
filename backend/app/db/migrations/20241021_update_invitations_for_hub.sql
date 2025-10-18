-- Harden invitation storage for workspace hub live data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS token_hash TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Backfill hashed tokens for existing rows when a raw token is present
UPDATE public.invitations
SET token_hash = encode(digest(token::text, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_unique
    ON public.invitations (token_hash)
    WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS invitations_email_idx
    ON public.invitations (LOWER(email));

CREATE INDEX IF NOT EXISTS invitations_status_idx
    ON public.invitations (status);
