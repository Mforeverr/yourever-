-- Author: Eldrie (CTO Dev)
-- Date: 2025-10-20
-- Role: Backend
--
-- Migration: Create kanban board tables
--
-- This migration creates the complete database schema for kanban board
-- task management with proper indexing, constraints, and row-level security.
-- Supports multi-tenant architecture with organization and division scoping.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- KANBAN BOARDS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kanban_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL,
    division_id UUID,
    project_id UUID,
    created_by UUID NOT NULL,
    is_public BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT kanban_boards_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT kanban_boards_org_id_not_null CHECK (organization_id IS NOT NULL)
);

-- ========================================
-- KANBAN COLUMNS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    position INTEGER NOT NULL,
    column_type TEXT NOT NULL DEFAULT 'custom',
    wip_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT kanban_columns_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT kanban_columns_position_non_negative CHECK (position >= 0),
    CONSTRAINT kanban_columns_wip_positive CHECK (wip_limit IS NULL OR wip_limit > 0),
    CONSTRAINT kanban_columns_type_valid CHECK (column_type IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'custom')),
    CONSTRAINT kanban_columns_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT kanban_columns_unique_position UNIQUE(board_id, position)
);

-- ========================================
-- KANBAN CARDS (TASKS) TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS kanban_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    column_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    position INTEGER NOT NULL,
    story_points INTEGER,
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    assigned_to UUID,
    labels JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT kanban_cards_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT kanban_cards_position_non_negative CHECK (position >= 0),
    CONSTRAINT kanban_cards_story_points_positive CHECK (story_points IS NULL OR story_points >= 0),
    CONSTRAINT kanban_cards_priority_valid CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT kanban_cards_due_after_start CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date)
);

-- ========================================
-- TASK COMMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT task_comments_content_not_empty CHECK (length(trim(content)) > 0)
);

-- ========================================
-- TASK ATTACHMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    uploaded_by UUID NOT NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT task_attachments_filename_not_empty CHECK (length(trim(filename)) > 0),
    CONSTRAINT task_attachments_path_not_empty CHECK (length(trim(storage_path)) > 0),
    CONSTRAINT task_attachments_size_positive CHECK (size_bytes > 0),
    CONSTRAINT task_attachments_size_limit CHECK (size_bytes <= 100000000) -- 100MB limit
);

-- ========================================
-- TASK ACTIVITIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID,
    board_id UUID,
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT task_activities_type_valid CHECK (activity_type IN (
        'task_created', 'task_updated', 'task_moved', 'task_assigned', 'task_unassigned',
        'comment_added', 'comment_updated', 'comment_deleted',
        'attachment_added', 'attachment_removed',
        'status_changed', 'priority_changed'
    )),
    CONSTRAINT task_activities_description_not_empty CHECK (length(trim(description)) > 0),
    CONSTRAINT task_activities_has_reference CHECK (task_id IS NOT NULL OR board_id IS NOT NULL)
);

-- ========================================
-- FOREIGN KEY CONSTRAINTS
-- ========================================

-- Boards foreign keys
ALTER TABLE kanban_boards
ADD CONSTRAINT kanban_boards_organization_fkey
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE kanban_boards
ADD CONSTRAINT kanban_boards_division_fkey
FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL;

ALTER TABLE kanban_boards
ADD CONSTRAINT kanban_boards_project_fkey
FOREIGN KEY (project_id) REFERENCES workspace_projects(id) ON DELETE SET NULL;

ALTER TABLE kanban_boards
ADD CONSTRAINT kanban_boards_creator_fkey
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Columns foreign keys
ALTER TABLE kanban_columns
ADD CONSTRAINT kanban_columns_board_fkey
FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE;

-- Cards foreign keys
ALTER TABLE kanban_cards
ADD CONSTRAINT kanban_cards_column_fkey
FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE;

ALTER TABLE kanban_cards
ADD CONSTRAINT kanban_cards_creator_fkey
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE kanban_cards
ADD CONSTRAINT kanban_cards_assignee_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Comments foreign keys
ALTER TABLE task_comments
ADD CONSTRAINT task_comments_task_fkey
FOREIGN KEY (task_id) REFERENCES kanban_cards(id) ON DELETE CASCADE;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_author_fkey
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_parent_fkey
FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE;

-- Attachments foreign keys
ALTER TABLE task_attachments
ADD CONSTRAINT task_attachments_task_fkey
FOREIGN KEY (task_id) REFERENCES kanban_cards(id) ON DELETE CASCADE;

ALTER TABLE task_attachments
ADD CONSTRAINT task_attachments_uploader_fkey
FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Activities foreign keys
ALTER TABLE task_activities
ADD CONSTRAINT task_activities_task_fkey
FOREIGN KEY (task_id) REFERENCES kanban_cards(id) ON DELETE CASCADE;

ALTER TABLE task_activities
ADD CONSTRAINT task_activities_board_fkey
FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE;

ALTER TABLE task_activities
ADD CONSTRAINT task_activities_user_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Board indexes
CREATE INDEX IF NOT EXISTS idx_kanban_boards_org_div ON kanban_boards(organization_id, division_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_project ON kanban_boards(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_boards_creator ON kanban_boards(created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_name ON kanban_boards USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Column indexes
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_position ON kanban_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board ON kanban_columns(board_id);

-- Card indexes
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_position ON kanban_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assigned_to ON kanban_cards(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_due_date ON kanban_cards(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kanban_cards_priority ON kanban_cards(priority);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_creator ON kanban_cards(created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_search ON kanban_cards USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_kanban_cards_labels ON kanban_cards USING gin(labels);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_archived ON kanban_cards(is_archived) WHERE is_archived = true;

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON task_comments(parent_id) WHERE parent_id IS NOT NULL;

-- Attachment indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploader ON task_attachments(uploaded_by);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_board ON task_activities(board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_user ON task_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_type ON task_activities(activity_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_tasks ON kanban_cards(c.board_id, c.position)
FROM kanban_cards c
JOIN kanban_columns col ON c.column_id = col.id;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_kanban_boards_updated_at
    BEFORE UPDATE ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_columns_updated_at
    BEFORE UPDATE ON kanban_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kanban_cards_updated_at
    BEFORE UPDATE ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Boards RLS policies
CREATE POLICY "Users can view boards in their organizations" ON kanban_boards
    FOR SELECT USING (
        organization_id IN (
            SELECT org_id FROM user_organization_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can view division-scoped boards" ON kanban_boards
    FOR SELECT USING (
        division_id IS NULL OR
        division_id IN (
            SELECT division_id FROM user_division_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create boards in their organizations" ON kanban_boards
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT org_id FROM user_organization_memberships
            WHERE user_id = auth.uid() AND is_active = true
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update boards they created" ON kanban_boards
    FOR UPDATE USING (
        created_by = auth.uid() AND
        organization_id IN (
            SELECT org_id FROM user_organization_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete boards they created" ON kanban_boards
    FOR DELETE USING (
        created_by = auth.uid() AND
        organization_id IN (
            SELECT org_id FROM user_organization_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Columns RLS policies (inherit from boards)
CREATE POLICY "Users can view columns in accessible boards" ON kanban_columns
    FOR SELECT USING (
        board_id IN (
            SELECT id FROM kanban_boards
            WHERE organization_id IN (
                SELECT org_id FROM user_organization_memberships
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "Users can manage columns in accessible boards" ON kanban_columns
    FOR ALL USING (
        board_id IN (
            SELECT id FROM kanban_boards
            WHERE created_by = auth.uid() AND
            organization_id IN (
                SELECT org_id FROM user_organization_memberships
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Cards RLS policies (inherit from boards through columns)
CREATE POLICY "Users can view cards in accessible boards" ON kanban_cards
    FOR SELECT USING (
        column_id IN (
            SELECT id FROM kanban_columns
            WHERE board_id IN (
                SELECT id FROM kanban_boards
                WHERE organization_id IN (
                    SELECT org_id FROM user_organization_memberships
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can create cards in accessible boards" ON kanban_cards
    FOR INSERT WITH CHECK (
        column_id IN (
            SELECT id FROM kanban_columns
            WHERE board_id IN (
                SELECT id FROM kanban_boards
                WHERE organization_id IN (
                    SELECT org_id FROM user_organization_memberships
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        ) AND
        created_by = auth.uid()
    );

CREATE POLICY "Users can update cards they created" ON kanban_cards
    FOR UPDATE USING (
        created_by = auth.uid() AND
        column_id IN (
            SELECT id FROM kanban_columns
            WHERE board_id IN (
                SELECT id FROM kanban_boards
                WHERE organization_id IN (
                    SELECT org_id FROM user_organization_memberships
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can delete cards they created" ON kanban_cards
    FOR DELETE USING (
        created_by = auth.uid() AND
        column_id IN (
            SELECT id FROM kanban_columns
            WHERE board_id IN (
                SELECT id FROM kanban_boards
                WHERE organization_id IN (
                    SELECT org_id FROM user_organization_memberships
                    WHERE user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

-- Comments RLS policies
CREATE POLICY "Users can view comments on accessible cards" ON task_comments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM kanban_cards
            WHERE column_id IN (
                SELECT id FROM kanban_columns
                WHERE board_id IN (
                    SELECT id FROM kanban_boards
                    WHERE organization_id IN (
                        SELECT org_id FROM user_organization_memberships
                        WHERE user_id = auth.uid() AND is_active = true
                    )
                )
            )
        )
    );

CREATE POLICY "Users can create comments on accessible cards" ON task_comments
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM kanban_cards
            WHERE column_id IN (
                SELECT id FROM kanban_columns
                WHERE board_id IN (
                    SELECT id FROM kanban_boards
                    WHERE organization_id IN (
                        SELECT org_id FROM user_organization_memberships
                        WHERE user_id = auth.uid() AND is_active = true
                    )
                )
            )
        ) AND
        author_id = auth.uid()
    );

CREATE POLICY "Users can update their own comments" ON task_comments
    FOR UPDATE USING (
        author_id = auth.uid()
    );

CREATE POLICY "Users can delete their own comments" ON task_comments
    FOR DELETE USING (
        author_id = auth.uid()
    );

-- Attachments RLS policies
CREATE POLICY "Users can view attachments on accessible cards" ON task_attachments
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM kanban_cards
            WHERE column_id IN (
                SELECT id FROM kanban_columns
                WHERE board_id IN (
                    SELECT id FROM kanban_boards
                    WHERE organization_id IN (
                        SELECT org_id FROM user_organization_memberships
                        WHERE user_id = auth.uid() AND is_active = true
                    )
                )
            )
        )
    );

CREATE POLICY "Users can upload attachments to accessible cards" ON task_attachments
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM kanban_cards
            WHERE column_id IN (
                SELECT id FROM kanban_columns
                WHERE board_id IN (
                    SELECT id FROM kanban_boards
                    WHERE organization_id IN (
                        SELECT org_id FROM user_organization_memberships
                        WHERE user_id = auth.uid() AND is_active = true
                    )
                )
            )
        ) AND
        uploaded_by = auth.uid()
    );

CREATE POLICY "Users can delete their own attachments" ON task_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
    );

-- Activities RLS policies (read-only for organizational members)
CREATE POLICY "Users can view activities in accessible boards" ON task_activities
    FOR SELECT USING (
        board_id IN (
            SELECT id FROM kanban_boards
            WHERE organization_id IN (
                SELECT org_id FROM user_organization_memberships
                WHERE user_id = auth.uid() AND is_active = true
            )
        ) OR
        task_id IN (
            SELECT id FROM kanban_cards
            WHERE column_id IN (
                SELECT id FROM kanban_columns
                WHERE board_id IN (
                    SELECT id FROM kanban_boards
                    WHERE organization_id IN (
                        SELECT org_id FROM user_organization_memberships
                        WHERE user_id = auth.uid() AND is_active = true
                    )
                )
            )
        )
    );

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Board summary view
CREATE OR REPLACE VIEW kanban_board_summary AS
SELECT
    b.id,
    b.name,
    b.description,
    b.organization_id,
    b.division_id,
    b.project_id,
    b.is_public,
    b.created_at,
    b.updated_at,
    COUNT(DISTINCT c.id) as column_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT CASE WHEN c.column_type = 'done' THEN t.id END) as completed_tasks,
    ROUND(
        (COUNT(DISTINCT CASE WHEN c.column_type = 'done' THEN t.id END)::float /
         NULLIF(COUNT(DISTINCT t.id), 0)) * 100, 2
    ) as completion_rate
FROM kanban_boards b
LEFT JOIN kanban_columns c ON b.id = c.board_id
LEFT JOIN kanban_cards t ON c.id = t.column_id AND t.is_archived = false
GROUP BY b.id, b.name, b.description, b.organization_id, b.division_id,
         b.project_id, b.is_public, b.created_at, b.updated_at;

-- Task summary view
CREATE OR REPLACE VIEW kanban_task_summary AS
SELECT
    t.id,
    t.title,
    t.priority,
    t.position,
    t.due_date,
    t.assigned_to,
    t.labels,
    t.is_archived,
    t.updated_at,
    c.name as column_name,
    c.color as column_color,
    b.id as board_id,
    b.name as board_name,
    u.name as assignee_name,
    u.email as assignee_email,
    COUNT(tc.id) as comment_count,
    COUNT(ta.id) as attachment_count,
    CASE WHEN t.due_date < NOW() AND t.completed_at IS NULL THEN true ELSE false END as is_overdue
FROM kanban_cards t
JOIN kanban_columns c ON t.column_id = c.id
JOIN kanban_boards b ON c.board_id = b.id
LEFT JOIN users u ON t.assigned_to = u.id
LEFT JOIN task_comments tc ON t.id = tc.task_id
LEFT JOIN task_attachments ta ON t.id = ta.task_id
GROUP BY t.id, t.title, t.priority, t.position, t.due_date, t.assigned_to,
         t.labels, t.is_archived, t.updated_at, c.name, c.color,
         b.id, b.name, u.name, u.email;