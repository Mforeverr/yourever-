-- Author: Codex (Architecture Engineer)
-- Date: 2025-10-24
-- Role: Database Migration
--
-- Purpose: Introduce human-readable slugs for organizations and divisions while
--          preserving existing UUID identifiers. Slugs are populated for existing
--          records and enforced via NOT NULL + uniqueness constraints.

BEGIN;

-- Utility: canonicalise strings into URL-safe slugs (lowercase, hyphen-separated).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.slugify(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    normalized TEXT;
BEGIN
    IF raw IS NULL OR length(btrim(raw)) = 0 THEN
        RETURN NULL;
    END IF;

    normalized := lower(unaccent(raw));
    normalized := regexp_replace(normalized, '[^a-z0-9\s-]', '', 'gi');
    normalized := regexp_replace(normalized, '\s+', '-', 'gi');
    normalized := regexp_replace(normalized, '-{2,}', '-', 'g');
    normalized := trim(both '-' FROM normalized);

    IF normalized IS NULL OR normalized = '' THEN
        RETURN NULL;
    END IF;

    RETURN normalized;
END;
$$;

-- Ensure pg_trgm extension is available if we later want fuzzy search on slugs.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- Organizations
-- ============================================================================

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill slug values using organization names (fallback to UUID when missing).
DO
$$
DECLARE
    rec RECORD;
    base_slug TEXT;
    candidate TEXT;
    suffix INTEGER;
BEGIN
    FOR rec IN
        SELECT id, name, slug
        FROM public.organizations
    LOOP
        IF rec.slug IS NOT NULL THEN
            CONTINUE;
        END IF;

        base_slug := slugify(COALESCE(rec.name, rec.id::text));
        IF base_slug IS NULL THEN
            base_slug := lower(replace(rec.id::text, '-', ''));
        END IF;

        candidate := base_slug;
        suffix := 0;

        WHILE EXISTS (
            SELECT 1
            FROM public.organizations o
            WHERE o.slug = candidate
              AND o.id <> rec.id
        )
        LOOP
            suffix := suffix + 1;
            candidate := base_slug || '-' || suffix::text;
        END LOOP;

        UPDATE public.organizations
        SET slug = candidate,
            display_name = COALESCE(display_name, name)
        WHERE id = rec.id;
    END LOOP;
END;
$$;

ALTER TABLE public.organizations
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT organizations_slug_not_blank CHECK (length(btrim(slug)) > 0),
    ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

-- ============================================================================
-- Divisions
-- ============================================================================

ALTER TABLE public.divisions
    ADD COLUMN IF NOT EXISTS slug TEXT;

DO
$$
DECLARE
    rec RECORD;
    base_slug TEXT;
    candidate TEXT;
    suffix INTEGER;
BEGIN
    FOR rec IN
        SELECT id, org_id, name, slug
        FROM public.divisions
    LOOP
        IF rec.slug IS NOT NULL THEN
            CONTINUE;
        END IF;

        base_slug := slugify(COALESCE(rec.name, rec.id::text));
        IF base_slug IS NULL THEN
            base_slug := lower(replace(rec.id::text, '-', ''));
        END IF;

        candidate := base_slug;
        suffix := 0;

        WHILE EXISTS (
            SELECT 1
            FROM public.divisions d
            WHERE d.org_id = rec.org_id
              AND d.slug = candidate
              AND d.id <> rec.id
        )
        LOOP
            suffix := suffix + 1;
            candidate := base_slug || '-' || suffix::text;
        END LOOP;

        UPDATE public.divisions
        SET slug = candidate
        WHERE id = rec.id;
    END LOOP;
END;
$$;

ALTER TABLE public.divisions
    ALTER COLUMN slug SET NOT NULL,
    ADD CONSTRAINT divisions_slug_not_blank CHECK (length(btrim(slug)) > 0),
    ADD CONSTRAINT divisions_org_slug_unique UNIQUE (org_id, slug);

CREATE INDEX IF NOT EXISTS idx_divisions_org_slug ON public.divisions (org_id, slug);

COMMIT;
