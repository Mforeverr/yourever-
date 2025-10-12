-- Yourever — Database Schema (PostgreSQL 15+)
-- This schema defines the multi-tenant structure for Yourever, with support for organizations, divisions,
-- projects, tasks, channels, documents, events, and integrations. All entities scope to org_id and optional division_id.
-- Soft deletes and audit logging are included for data integrity.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "citext";

-- Application schema for helpers
CREATE SCHEMA IF NOT EXISTS app;

-- Session helpers for RLS (wired to JWT claims or session vars)
CREATE OR REPLACE FUNCTION app.user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.org_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.division_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.division_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.role', true), '');
$$;

-- Core Tenancy Tables
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text UNIQUE,  -- e.g., 'marketing'
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  timezone text DEFAULT 'UTC',
  role text DEFAULT 'member',  -- default for direct access
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization memberships with roles
CREATE TABLE IF NOT EXISTS org_memberships (
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Division-specific memberships (optional, extends org membership)
CREATE TABLE IF NOT EXISTS division_memberships (
  division_id uuid NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('lead', 'contributor', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (division_id, user_id)
);

-- Projects and Work Management
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  name text NOT NULL,
  key text UNIQUE,  -- e.g., 'PROJ-001'
  description text,
  lead_id uuid REFERENCES users(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'on_hold')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS project_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text DEFAULT 'contributor' CHECK (role IN ('lead', 'contributor', 'viewer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  section_id uuid REFERENCES project_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  why_note text,  -- Rationale or context for the task
  status text DEFAULT 'untouched' CHECK (status IN ('untouched', 'on_track', 'stuck', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  tags text[] DEFAULT '{}',  -- Array of tag strings
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Communication: Channels and Messages
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  name text NOT NULL,
  key text UNIQUE,  -- e.g., 'general'
  is_private boolean DEFAULT false,
  description text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS channel_members (
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_favorited boolean DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  thread_parent_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  attachments jsonb DEFAULT '[]',  -- Array of file metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  title text NOT NULL,
  current_version_id uuid REFERENCES doc_versions(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS doc_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),
  content jsonb NOT NULL,  -- Rich text structure (e.g., ProseMirror JSON)
  version_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  is_all_day boolean DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'maybe')),
  responded_at timestamptz,
  PRIMARY KEY (event_id, user_id)
);

-- Integrations for Admin
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('slack', 'asana', 'zoom', 'gmail', 'gcal', 'notion', 'clickup')),
  is_enabled boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  base_url text,
  api_key text,  -- Encrypted in prod
  oauth_app_id text,
  webhook_url text GENERATED ALWAYS AS (base_url || '/webhook') STORED,
  scopes text[] DEFAULT '{}',
  sync_direction text DEFAULT 'pull' CHECK (sync_direction IN ('pull', 'push', 'bidirectional')),
  default_mapping jsonb,  -- e.g., {"channel": "general"}
  test_status text DEFAULT 'untested',  -- passed|failed|untested
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shared Resources
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  division_id uuid REFERENCES divisions(id) ON DELETE SET NULL,
  name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  storage_key text NOT NULL,  -- S3 or local path
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('project', 'task', 'channel', 'doc', 'event')),
  target_id uuid NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,  -- create|update|delete|login|etc.
  resource_type text NOT NULL,  -- task|channel|user|etc.
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX idx_tasks_org_division ON tasks (org_id, division_id);
CREATE INDEX idx_tasks_status_priority ON tasks (status, priority);
CREATE INDEX idx_messages_channel_created ON messages (channel_id, created_at DESC);
CREATE INDEX idx_events_starts_ends ON events (starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_audit_org_action ON audit_logs (org_id, action, created_at DESC);

-- Views for Common Queries (optional)
CREATE VIEW active_tasks AS
  SELECT * FROM tasks WHERE deleted_at IS NULL AND status != 'done';
