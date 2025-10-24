-- Author: Eldrie (CTO Dev)
-- Date: 2025-10-24
-- Role: Backend
--
-- Migration: Add project metadata column to projects table
--
-- Business Impact: Restores API support for returning project metadata to clients,
-- preventing 500 errors when listing division projects.
-- Rollback Plan: Drop the project_metadata column after verifying no dependent
-- application code requires it.

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_metadata JSON NOT NULL DEFAULT '{}'::json;

COMMENT ON COLUMN public.projects.project_metadata IS
'Stores structured metadata required for project workspace configuration.';
