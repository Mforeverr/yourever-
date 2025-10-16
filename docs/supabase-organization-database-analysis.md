# Supabase Organization Database Analysis

## Database Overview

This document analyzes the current organization structure in the Supabase database as of October 16, 2025.

## Organization-Related Tables Schema

### 1. Organizations Table (`organizations`)
- **Records**: 2 organizations
- **RLS Enabled**: Yes
- **Primary Key**: `id` (UUID, auto-generated)

**Columns:**
- `id` (UUID, primary, default: `gen_random_uuid()`)
- `name` (TEXT) - Organization display name
- `slug` (TEXT, unique) - URL-friendly identifier
- `description` (TEXT, nullable) - Organization description
- `logo_url` (TEXT, nullable) - Organization logo URL
- `created_at` (TIMESTAMPTZ, default: `now()`)
- `deleted_at` (TIMESTAMPTZ, nullable) - Soft deletion timestamp

**Foreign Key Relationships:**
- Referenced by `divisions.org_id`
- Referenced by `tool_integrations.org_id`
- Referenced by `invitations.org_id`
- Referenced by `organization_settings.org_id`
- Referenced by `org_memberships.org_id`

### 2. Divisions Table (`divisions`)
- **Records**: 1 division
- **RLS Enabled**: Yes
- **Primary Key**: `id` (UUID, auto-generated)

**Columns:**
- `id` (UUID, primary, default: `gen_random_uuid()`)
- `org_id` (UUID) - Foreign key to organizations
- `name` (TEXT) - Division display name
- `key` (TEXT, unique, nullable) - URL-friendly division identifier
- `description` (TEXT, nullable) - Division description
- `created_at` (TIMESTAMPTZ, default: `now()`)
- `deleted_at` (TIMESTAMPTZ, nullable) - Soft deletion timestamp

**Foreign Key Relationships:**
- References `organizations.id`
- Referenced by `invitations.division_id`
- Referenced by `division_memberships.division_id`

### 3. Organization Memberships Table (`org_memberships`)
- **Records**: 4 memberships
- **RLS Enabled**: Yes
- **Composite Primary Key**: `org_id`, `user_id`

**Columns:**
- `org_id` (UUID) - Foreign key to organizations
- `user_id` (UUID) - Foreign key to users
- `role` (TEXT, constraint: `role = ANY (ARRAY['owner', 'admin', 'member', 'viewer'])`)
- `joined_at` (TIMESTAMPTZ, default: `now()`)

**Foreign Key Relationships:**
- References `organizations.id`
- References `users.id`

### 4. Division Memberships Table (`division_memberships`)
- **Records**: 2 memberships
- **RLS Enabled**: Yes
- **Composite Primary Key**: `division_id`, `user_id`

**Columns:**
- `division_id` (UUID) - Foreign key to divisions
- `user_id` (UUID) - Foreign key to users
- `role` (TEXT, constraint: `role = ANY (ARRAY['lead', 'contributor', 'viewer'])`)
- `joined_at` (TIMESTAMPTZ, default: `now()`)

**Foreign Key Relationships:**
- References `divisions.id`
- References `users.id`

### 5. Organization Settings Table (`organization_settings`)
- **Records**: 2 settings
- **RLS Enabled**: Yes
- **Primary Key**: `id` (UUID, auto-generated)

**Columns:**
- `id` (UUID, primary, default: `gen_random_uuid()`)
- `org_id` (UUID, unique) - Foreign key to organizations
- `default_tools` (JSONB, nullable) - Default tools configuration
- `invitation_token` (TEXT, unique, nullable) - Invitation token
- `onboarding_complete` (BOOLEAN, default: `false`)
- `created_at` (TIMESTAMPTZ, default: `now()`)
- `updated_at` (TIMESTAMPTZ, default: `now()`)

**Foreign Key Relationships:**
- References `organizations.id`

### 6. Invitations Table (`invitations`)
- **Records**: 0 invitations
- **RLS Enabled**: Yes
- **Primary Key**: `id` (UUID, auto-generated)

**Columns:**
- `id` (UUID, primary, default: `gen_random_uuid()`)
- `email` (CITEXT) - Invitee email address
- `inviter_id` (UUID) - Foreign key to users (who sent invitation)
- `org_id` (UUID, nullable) - Foreign key to organizations
- `division_id` (UUID, nullable) - Foreign key to divisions
- `token` (TEXT, unique) - Invitation token
- `role` (TEXT, default: `'member'`, constraint: `role = ANY (ARRAY['owner', 'admin', 'member', 'viewer'])`)
- `status` (TEXT, default: `'pending'`, constraint: `status = ANY (ARRAY['pending', 'accepted', 'expired', 'revoked'])`)
- `message` (TEXT, nullable) - Personal invitation message
- `expires_at` (TIMESTAMPTZ, nullable) - Invitation expiration
- `accepted_at` (TIMESTAMPTZ, nullable) - When invitation was accepted
- `created_at` (TIMESTAMPTZ, default: `now()`)
- `updated_at` (TIMESTAMPTZ, default: `now()`)
- `declined_at` (TIMESTAMPTZ, nullable) - When invitation was declined
- `metadata` (JSONB, default: `'{}'`) - Additional invitation metadata

**Foreign Key Relationships:**
- References `users.id` (inviter)
- References `organizations.id`
- References `divisions.id`

## Current Data Analysis

### Organizations
1. **Demo Organization** (`ac33906b-7da2-4194-bf61-4a6fcea3a894`)
   - Slug: `demo`
   - Description: "A demo organization for testing"
   - Created: October 7, 2025
   - Members: 2 (Test User as member, Alyssa Hacker as admin)

2. **Test Organization** (`13657eed-30f3-492b-9ab4-4f9232a6cd97`)
   - Slug: `est-rganization` (note: appears to have a slug generation issue - missing 't')
   - Description: "A test organization for onboarding"
   - Created: October 8, 2025
   - Members: 2 (Test User as owner, Jamal Rivers as member)

### Divisions
1. **Engineering Division** (`dea842d3-e0cd-4da0-9c84-d79b9e485fef`)
   - Organization: Test Organization
   - Key: `ngineering` (note: missing 'E' - slug generation issue)
   - Description: "Engineering division"
   - Created: October 8, 2025
   - Members: 2 (Test User as lead, Jamal Rivers as contributor)

### Organization Memberships
1. **Test User** (`ea39bb6d-a5f2-4d75-8e84-56922f08f634`)
   - Demo Organization: member (since Oct 7, 2025)
   - Test Organization: owner (since Oct 8, 2025)

2. **Alyssa Hacker** (`cb9314b2-f7e9-4701-ace8-21c6b40c7f88`)
   - Demo Organization: admin (since Oct 11, 2025)

3. **Jamal Rivers** (`882eee9c-025a-47e6-be54-53bcaa172e3a`)
   - Test Organization: member (since Oct 11, 2025)

### Division Memberships
1. **Test User** (`ea39bb6d-a5f2-4d75-8e84-56922f08f634`)
   - Engineering Division: lead (since Oct 8, 2025)

2. **Jamal Rivers** (`882eee9c-025a-47e6-be54-53bcaa172e3a`)
   - Engineering Division: contributor (since Oct 11, 2025)

### Organization Settings
Both organizations have default tools configured: `["Slack", "Notion", "Zoom"]`
Both have `onboarding_complete: false`
Both have `invitation_token: null`

## Issues Identified

### 1. Slug Generation Problems
- Organization slug: `est-rganization` (missing 't' from "Test")
- Division key: `ngineering` (missing 'E' from "Engineering")

This suggests there's an issue with the slug generation algorithm in the backend code, likely related to character filtering.

### 2. Missing Organization Settings Fields
The backend code expects additional fields that aren't present in the current schema:
- `invitation_token` is present but might need to be populated
- Missing `default_tools` field population

### 3. RLS (Row Level Security)
All organization-related tables have RLS enabled, which is good for security but needs proper policies to be configured.

## Database Relationships Summary

```
organizations (1) -----> (many) divisions
    |                           |
    |                           |
    v                           v
org_memberships (many)      division_memberships (many)
    |                           |
    |                           |
    v                           v
users (many) <--------------- (many) users

organizations (1) -----> (1) organization_settings
organizations (1) -----> (many) invitations
divisions (1) -----> (many) invitations
users (1) -----> (many) invitations (as inviter)
```

## URL Structure Implementation

Based on the current data, the URL structure would be:

- Demo Organization: `yourever.app/demo/` (no divisions yet)
- Test Organization: `yourever.app/est-rganization/engineering/`

Expected pages would follow the pattern:
- `/:orgSlug/:divisionKey/dashboard`
- `/:orgSlug/:divisionKey/channels`
- `/:orgSlug/:divisionKey/c/:channelId`
- `/:orgSlug/:divisionKey/dm/:userId`
- `/:orgSlug/:divisionKey/calendar`
- `/:orgSlug/:divisionKey/people`
- `/:orgSlug/:divisionKey/admin`
- `/:orgSlug/:divisionKey/p/:projectId`
- `/:orgSlug/:divisionKey/t/:taskId`

## Recommendations

### 1. Fix Slug Generation
Investigate and fix the slug generation algorithm in `backend/app/modules/organizations/repository.py` to properly handle all characters.

### 2. Populate Missing Organization Settings
Ensure that when organizations are created, the `invitation_token` field is properly populated with a UUID.

### 3. Review RLS Policies
Verify that RLS policies are properly configured to allow appropriate access while maintaining security.

### 4. Add Data Validation
Implement proper validation to ensure slugs and keys are generated correctly before insertion.

### 5. Add Indexes
Consider adding indexes on frequently queried fields like `organizations.slug` and `divisions.key` for better performance.