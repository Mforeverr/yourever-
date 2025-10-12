-- Yourever — Row Level Security (RLS) Policies
-- These policies enforce multi-tenant isolation, role-based access, and division scoping.
-- Assumes PostgreSQL with session variables set via JWT or connection params.
-- Enable RLS on all tables and apply policies for SELECT, INSERT, UPDATE, DELETE.

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Functions (already in schema)
-- app.user_id(), app.org_id(), app.division_id(), app.role()

-- Helper to check if user is member of a specific org
CREATE OR REPLACE FUNCTION app.current_user_is_org_member(p_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships 
    WHERE org_id = p_org_id AND user_id = app.user_id()
  );
$$;

-- Organizations: Users can only SELECT their own orgs
DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (app.current_user_is_org_member(id));

-- Divisions: Visible if user is member of the parent org
DROP POLICY IF EXISTS "div_select" ON divisions;
CREATE POLICY "div_select" ON divisions
  FOR ALL USING (app.current_user_is_org_member(org_id))
  WITH CHECK (app.current_user_is_org_member(org_id));

-- Users: Users can only SELECT themselves or org members (for directories)
DROP POLICY IF EXISTS "user_select" ON users;
CREATE POLICY "user_select" ON users
  FOR SELECT USING (
    id = app.user_id() OR 
    EXISTS (SELECT 1 FROM org_memberships WHERE user_id = users.id AND org_id = app.org_id())
  );

-- Org Memberships: Read own memberships
DROP POLICY IF EXISTS "org_mem_select" ON org_memberships;
CREATE POLICY "org_mem_select" ON org_memberships
  FOR SELECT USING (user_id = app.user_id());

DROP POLICY IF EXISTS "org_mem_insert_update" ON org_memberships;
CREATE POLICY "org_mem_insert_update" ON org_memberships
  FOR ALL USING (app.current_user_is_org_member(org_id) AND app.role() IN ('owner', 'admin'))
  WITH CHECK (app.current_user_is_org_member(org_id) AND app.role() IN ('owner', 'admin'));

-- Division Memberships: Scoped to division and org membership
DROP POLICY IF EXISTS "div_mem_all" ON division_memberships;
CREATE POLICY "div_mem_all" ON division_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM divisions WHERE id = division_memberships.division_id AND org_id = app.org_id()) AND
    app.current_user_is_org_member(app.org_id()) AND
    (user_id = app.user_id() OR app.role() IN ('owner', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM divisions WHERE id = division_memberships.division_id AND org_id = app.org_id()) AND
    app.current_user_is_org_member(app.org_id()) AND app.role() IN ('owner', 'admin')
  );

-- Template for Scoped Entities (projects, tasks, channels, etc.)
-- SELECT: Must be in current org/division
DO $$
DECLARE
  scoped_table text;
BEGIN
  FOREACH scoped_table IN ARRAY ARRAY[
    'projects', 'project_sections', 'project_members',
    'tasks', 'task_subtasks', 'task_assignees', 'task_comments',
    'channels', 'channel_members', 'messages',
    'documents', 'doc_versions',
    'events', 'event_attendees',
    'integrations',
    'files', 'shortlinks',
    'audit_logs'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%I_select" ON %I;
      CREATE POLICY "%I_select" ON %I
      FOR SELECT USING (
        org_id = app.org_id() AND 
        app.current_user_is_org_member(org_id) AND
        (division_id IS NULL OR division_id = app.division_id())
      );', scoped_table, scoped_table, scoped_table, scoped_table);
  END LOOP;
END $$;

-- INSERT for Scoped Entities: Same as SELECT + role check
DO $$
DECLARE
  scoped_table text;
BEGIN
  FOREACH scoped_table IN ARRAY ARRAY[
    'projects', 'project_sections', 'project_members',
    'tasks', 'task_subtasks', 'task_assignees', 'task_comments',
    'channels', 'channel_members', 'messages',
    'documents', 'doc_versions',
    'events', 'event_attendees',
    'integrations', 'integration_configs',
    'files', 'shortlinks'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%I_insert" ON %I;
      CREATE POLICY "%I_insert" ON %I
      FOR INSERT WITH CHECK (
        org_id = app.org_id() AND 
        app.current_user_is_org_member(org_id) AND
        (division_id IS NULL OR division_id = app.division_id()) AND
        app.role() IN (''owner'', ''admin'', ''member'')
      );', scoped_table, scoped_table, scoped_table, scoped_table);
  END LOOP;
END $$;

-- UPDATE for Scoped Entities: Scoped + role check
DO $$
DECLARE
  scoped_table text;
BEGIN
  FOREACH scoped_table IN ARRAY ARRAY[
    'projects', 'project_sections', 'project_members',
    'tasks', 'task_subtasks', 'task_assignees', 'task_comments',
    'channels', 'channel_members',
    'documents', 'doc_versions',
    'events', 'event_attendees',
    'integrations', 'integration_configs',
    'files', 'shortlinks'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%I_update" ON %I;
      CREATE POLICY "%I_update" ON %I
      FOR UPDATE USING (
        org_id = app.org_id() AND 
        app.current_user_is_org_member(org_id) AND
        (division_id IS NULL OR division_id = app.division_id()) AND
        app.role() IN (''owner'', ''admin'', ''member'')
      )
      WITH CHECK (
        org_id = app.org_id() AND 
        (division_id IS NULL OR division_id = app.division_id())
      );', scoped_table, scoped_table, scoped_table, scoped_table);
  END LOOP;
END $$;

-- DELETE for Scoped Entities: Restricted to admin/owner
DO $$
DECLARE
  scoped_table text;
BEGIN
  FOREACH scoped_table IN ARRAY ARRAY[
    'projects', 'project_sections', 'project_members',
    'tasks', 'task_subtasks', 'task_assignees', 'task_comments',
    'channels', 'channel_members',
    'documents', 'doc_versions',
    'events', 'event_attendees',
    'integrations', 'integration_configs',
    'files', 'shortlinks'
  ]
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%I_delete" ON %I;
      CREATE POLICY "%I_delete" ON %I
      FOR DELETE USING (
        org_id = app.org_id() AND 
        app.current_user_is_org_member(org_id) AND
        (division_id IS NULL OR division_id = app.division_id()) AND
        app.role() IN (''owner'', ''admin'')
      );', scoped_table, scoped_table, scoped_table, scoped_table);
  END LOOP;
END $$;

-- Special Policies for Audit Logs: Read by org admins, insert by system
DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (
    org_id = app.org_id() AND 
    app.current_user_is_org_member(org_id) AND
    app.role() IN ('owner', 'admin')
  );

-- Messages: Additional check for private channels
DROP POLICY IF EXISTS "msg_select_private_check" ON messages;
CREATE POLICY "msg_select_private_check" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM channels c 
    JOIN channel_members cm ON c.id = cm.channel_id 
    WHERE c.id = messages.channel_id AND 
          cm.user_id = app.user_id() AND 
          (NOT c.is_private OR cm.user_id = app.user_id())
  )
);

-- Integration Configs: Specific to org admins
DROP POLICY IF EXISTS "int_config_all" ON integration_configs;
CREATE POLICY "int_config_all" ON integration_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM integrations i WHERE i.id = integration_configs.integration_id AND i.org_id = app.org_id()) AND
    app.current_user_is_org_member(app.org_id()) AND app.role() IN ('owner', 'admin')
  )
  WITH CHECK (app.role() IN ('owner', 'admin'));

-- Ensure no bypass for users table updates (system-only)
DROP POLICY IF EXISTS "user_update_restrict" ON users;
CREATE POLICY "user_update_restrict" ON users
  FOR UPDATE USING (false)  -- Only superuser or triggers
  WITH CHECK (false);
