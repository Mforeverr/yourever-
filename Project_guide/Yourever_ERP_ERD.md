# Yourever — Entity Relationship Diagram (ERD) and Data Model

**Version:** 1.0 (Adapted for Yourever Workspace)  
**Last Updated:** 2025-10-03

This document presents the logical data model for Yourever, focusing on multi-tenancy with organizations and divisions as core scopes. The ERD visualizes relationships between entities like users, projects, tasks, channels, documents, events, and integrations. It supports the UI prototype's mocked data and serves as a blueprint for the backend schema in Yourever_DB_Tables.sql.

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    organizations ||--o{ divisions : "contains"
    organizations ||--o{ org_memberships : "has"
    users ||--o{ org_memberships : "belongs to"
    divisions ||--o{ division_memberships : "has"
    users ||--o{ division_memberships : "belongs to"
    divisions ||--o{ projects : "supports"
    projects ||--o{ project_sections : "organized into"
    projects ||--o{ project_members : "involves"
    users ||--o{ project_members : "participates in"
    projects ||--o|| tasks : "tracks"
    tasks ||--o{ task_subtasks : "includes"
    tasks ||--o{ task_assignees : "assigned to"
    tasks ||--o{ task_comments : "has"
    users ||--o{ task_assignees : "assignees"
    users ||--o{ task_comments : "authors"
    divisions ||--o{ channels : "hosts"
    channels ||--o{ channel_members : "members"
    users ||--o{ channel_members : "member of"
    channels ||--o{ messages : "contains"
    users ||--o{ messages : "authors"
    messages ||--|| messages : "threads into (self)"
    divisions ||--o{ documents : "stores"
    documents ||--o{ doc_versions : "versions"
    users ||--o{ doc_versions : "edits"
    divisions ||--o{ events : "schedules"
    events ||--o{ event_attendees : "attended by"
    users ||--o{ event_attendees : "attends"
    organizations ||--o{ integrations : "configures"
    integrations ||--|{ integration_configs : "uses"
    organizations ||--o{ files : "stores"
    organizations ||--o{ shortlinks : "provides"
    organizations ||--o{ audit_logs : "records"
    users ||--o{ audit_logs : "performed by"
    tasks ||--o{ files : "attaches (via foreign)"
    channels ||--o{ files : "attaches (via foreign)"
    documents ||--o{ files : "attaches (via foreign)"
```

### Diagram Notes
- **Cardinality**: `||--o{` denotes one-to-many (e.g., one org has many divisions).
- **Self-References**: Messages thread into parent messages.
- **Scoped Fields**: All entities include `org_id` (mandatory) and `division_id` (optional, NULL for org-wide resources).
- **Soft Deletes**: `deleted_at` field on most tables for non-destructive removal.
- **Polymorphic Attachments**: Files can be linked to tasks, messages, docs via additional junction tables if needed (not shown for simplicity).

## Data Dictionary

### Core Tenancy
- **organizations**
  - `id`: UUID (PK)
  - `name`: Text (required)
  - `slug`: Text (unique identifier)
  - `logo_url`: Text (optional)
  - `created_at`, `deleted_at`: Timestamptz

- **divisions**
  - `id`: UUID (PK)
  - `org_id`: UUID (FK to organizations)
  - `name`: Text (required)
  - `key`: Text (unique within org, e.g., 'engineering')
  - `description`: Text
  - Timestamps

- **users**
  - `id`: UUID (PK)
  - `email`: Citext (unique)
  - `name`: Text (required)
  - `avatar_url`: Text
  - `timezone`: Text (default 'UTC')
  - Timestamps

- **org_memberships**
  - `org_id`, `user_id`: Composite PK (FKs)
  - `role`: Text ('owner', 'admin', 'member', 'viewer')
  - `joined_at`: Timestamptz

- **division_memberships**
  - `division_id`, `user_id`: Composite PK
  - `role`: Text ('lead', 'contributor', 'viewer')
  - `joined_at`: Timestamptz

### Work Management
- **projects**
  - `id`: UUID (PK)
  - `org_id`, `division_id`: FKs
  - `name`, `key` (unique), `description`: Text
  - `lead_id`: UUID (FK to users)
  - `status`: Text ('active', 'archived', 'on_hold')
  - Timestamps

- **project_sections**
  - `id`: UUID (PK)
  - `project_id`: FK
  - `name`: Text
  - `position`: Integer (ordering)
  - `created_at`: Timestamptz

- **project_members**
  - `project_id`, `user_id`: Composite PK
  - `role`: Text ('lead', 'contributor', 'viewer')
  - `joined_at`: Timestamptz

- **tasks**
  - `id`: UUID (PK)
  - `org_id`, `division_id`, `project_id`, `section_id`: FKs (nullable except org_id)
  - `title`: Text (required)
  - `description`, `why_note`: Text
  - `status`: Text ('untouched', 'on_track', 'stuck', 'done')
  - `priority`: Text ('low', 'medium', 'high', 'urgent')
  - `due_date`: Date
  - `tags`: Text[] (array)
  - `created_by`: UUID (FK)
  - Timestamps

- **task_subtasks**
  - `id`, `task_id`: PK/FK
  - `title`: Text
  - `is_completed`: Boolean
  - `position`: Integer

- **task_assignees**
  - `task_id`, `user_id`: Composite PK
  - `assigned_at`: Timestamptz

- **task_comments**
  - `id`: UUID (PK)
  - `task_id`, `org_id`, `division_id`: FKs
  - `author_id`: UUID (FK)
  - `body`: Text
  - `created_at`: Timestamptz

### Communication
- **channels**
  - `id`: UUID (PK)
  - `org_id`, `division_id`: FKs
  - `name`, `key` (unique), `description`: Text
  - `is_private`: Boolean
  - `created_by`: UUID (FK)
  - Timestamps

- **channel_members**
  - `channel_id`, `user_id`: Composite PK
  - `is_favorited`: Boolean
  - `joined_at`: Timestamptz

- **messages**
  - `id`: UUID (PK)
  - `org_id`, `division_id`, `channel_id`, `thread_parent_id`: FKs
  - `author_id`: UUID (FK)
  - `body`: Text
  - `attachments`: JSONB (file metadata array)
  - `created_at`: Timestamptz

### Documents and Events
- **documents**
  - `id`: UUID (PK)
  - `org_id`, `division_id`: FKs
  - `title`: Text (required)
  - `current_version_id`: UUID (FK)
  - `created_by`: UUID (FK)
  - Timestamps

- **doc_versions**
  - `id`: UUID (PK)
  - `doc_id`, `author_id`: FKs
  - `content`: JSONB (rich text)
  - `version_number`: Integer
  - `created_at`: Timestamptz

- **events**
  - `id`: UUID (PK)
  - `org_id`, `division_id`: FKs
  - `title`, `description`, `location`: Text
  - `starts_at`, `ends_at`: Timestamptz
  - `is_all_day`: Boolean
  - `created_by`: UUID (FK)
  - Timestamps

- **event_attendees**
  - `event_id`, `user_id`: Composite PK
  - `status`: Text ('invited', 'accepted', 'declined', 'maybe')
  - `responded_at`: Timestamptz

### Integrations and Resources
- **integrations**
  - `id`: UUID (PK)
  - `org_id`: FK
  - `provider`: Text (enum: 'slack', 'asana', etc.)
  - `is_enabled`: Boolean
  - Timestamps

- **integration_configs**
  - `id`: UUID (PK)
  - `integration_id`: FK
  - `display_name`, `base_url`, `api_key`, `oauth_app_id`: Text
  - `scopes`: Text[]
  - `sync_direction`: Text ('pull', 'push', 'bidirectional')
  - `default_mapping`: JSONB
  - `test_status`: Text
  - `created_at`, `updated_at`: Timestamptz

- **files**
  - `id`: UUID (PK)
  - `org_id`, `division_id`: FKs
  - `name`, `mime_type`: Text
  - `size_bytes`: Bigint
  - `storage_key`: Text
  - `uploaded_by`: UUID (FK)
  - `created_at`: Timestamptz

- **shortlinks**
  - `id`: UUID (PK)
  - `org_id`: FK
  - `type`: Text ('project', 'task', etc.)
  - `target_id`: UUID
  - `slug`: Text (unique)
  - `created_at`: Timestamptz

- **audit_logs**
  - `id`: UUID (PK)
  - `org_id`, `actor_id`: FKs
  - `action`, `resource_type`: Text
  - `resource_id`: UUID
  - `old_values`, `new_values`, `metadata`: JSONB
  - `ip_address`: Inet
  - `created_at`: Timestamptz

## Model Principles
- **Multi-Tenancy Isolation**: RLS policies (see Yourever_RLS.sql) enforce access by current org/division and role.
- **Flexibility**: JSONB for semi-structured data (attachments, mappings); arrays for tags/scopes.
- **Performance**: Indexes on scoping fields, timestamps, and common filters (e.g., task status).
- **Extensibility**: Open for new providers in integrations; versioned docs support collaboration.
