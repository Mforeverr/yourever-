# Organization Creation Database Interaction Analysis

## Problem Analysis

### Issue Identified
The organization creation form is experiencing an **infinite loop** that causes spamming of the backend API endpoint `/api/organizations/slug/availability?slug=saa`. This is due to a React `useEffect` dependency array issue in `OrgCreationForm.tsx:197`.

### Root Cause
The `useEffect` hook for slug checking includes `checkSlugMutation` in its dependency array:

```typescript
// Line 197 in OrgCreationForm.tsx - PROBLEMATIC DEPENDENCY
}, [watchedSlug, checkSlugMutation, setValue, getValues])
```

Since `checkSlugMutation` is a TanStack Query mutation object that changes on every render, this causes the effect to re-run infinitely, triggering endless API calls.

## Database Schema and Interaction

### Organization Creation Flow

#### 1. Database Tables Involved

**organizations** table:
- `id` (UUID) - Primary key
- `name` (TEXT) - Organization display name
- `slug` (TEXT) - URL-friendly identifier (yourever.app/{slug})
- `description` (TEXT, optional) - Organization description
- `logo_url` (TEXT, optional) - Organization logo
- `created_at` (TIMESTAMP) - Creation timestamp
- `deleted_at` (TIMESTAMP, optional) - Soft deletion timestamp

**divisions** table:
- `id` (UUID) - Primary key
- `org_id` (UUID) - Foreign key to organizations
- `name` (TEXT) - Division display name
- `key` (TEXT) - URL-friendly identifier within organization
- `description` (TEXT, optional) - Division description
- `created_at` (TIMESTAMP) - Creation timestamp
- `deleted_at` (TIMESTAMP, optional) - Soft deletion timestamp

**org_memberships** table:
- `org_id` (UUID) - Foreign key to organizations
- `user_id` (UUID) - Foreign key to users
- `role` (TEXT) - User role (owner, admin, member)
- `joined_at` (TIMESTAMP) - When user joined

**division_memberships** table:
- `division_id` (UUID) - Foreign key to divisions
- `user_id` (UUID) - Foreign key to users
- `role` (TEXT) - User role (lead, member)
- `joined_at` (TIMESTAMP) - When user joined

#### 2. Organization Creation Process

**Step 1: Slug Generation and Validation**
```python
# repository.py:202-207
if create_data.slug:
    slug = create_data.slug.lower()
    if not await self.check_slug_availability(slug):
        raise ValueError(f"Slug '{slug}' is already taken")
else:
    slug = await self.generate_unique_slug(create_data.name)
```

**Step 2: Database Transaction (repository.py:213-313)**
1. **Create Organization Record**
   ```sql
   INSERT INTO public.organizations (
       id, name, slug, description, logo_url, created_at
   ) VALUES (
       :id, :name, :slug, :description, :logo_url, NOW()
   )
   ```

2. **Create Primary Division**
   ```sql
   INSERT INTO public.divisions (
       id, org_id, name, key, description, created_at
   ) VALUES (
       :id, :org_id, :name, :key, :description, NOW()
   )
   ```

3. **Create Organization Membership (Owner)**
   ```sql
   INSERT INTO public.org_memberships (org_id, user_id, role, joined_at)
   VALUES (:org_id, :user_id, 'owner', NOW())
   ```

4. **Create Division Membership (Lead)**
   ```sql
   INSERT INTO public.division_memberships (division_id, user_id, role, joined_at)
   VALUES (:division_id, :user_id, 'lead', NOW())
   ```

5. **Create Organization Settings**
   ```sql
   INSERT INTO public.organization_settings (
       id, org_id, default_tools, invitation_token, created_at, updated_at
   ) VALUES (
       :id, :org_id, :default_tools, :invitation_token, NOW(), NOW()
   )
   ```

#### 3. Slug Handling Logic

**Slug Generation (repository.py:61-72)**
```python
def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name."""
    # Convert to lowercase and replace spaces/underscores with hyphens
    slug = name.lower()
    slug = re.sub(r'[\s_]+', '-', slug)
    # Remove special characters except hyphens
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Remove consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug
```

**Slug Availability Check (repository.py:74-85)**
```python
async def check_slug_availability(self, slug: str) -> bool:
    """Check if a slug is available for use."""
    query = text(
        """
        SELECT COUNT(*) as count
        FROM public.organizations
        WHERE slug = :slug AND deleted_at IS NULL
        """
    )
    result = await self._session.execute(query, {"slug": slug})
    count = result.scalar()
    return count == 0
```

**Unique Slug Generation (repository.py:87-102)**
```python
async def generate_unique_slug(self, base_name: str) -> str:
    """Generate a unique slug from base name."""
    base_slug = self.generate_slug(base_name)

    if await self.check_slug_availability(base_slug):
        return base_slug

    # Add numeric suffix if slug is taken
    counter = 1
    while True:
        candidate_slug = f"{base_slug}-{counter}"
        if await self.check_slug_availability(candidate_slug):
            return candidate_slug
        counter += 1
        if counter > 1000:  # Safety limit
            raise ValueError("Unable to generate unique slug")
```

## URL Structure and Routing

### Organization URL Pattern
Based on your requirements, the slug is used in the URL structure as:

```
/:orgId/:divisionId/(page)
```

Where:
- `orgId` = Organization slug (e.g., "acme-corp")
- `divisionId` = Division key (e.g., "product-team")

**Example URLs:**
- `yourever.app/acme-corp/product-team/dashboard`
- `yourever.app/acme-corp/product-team/workspace`
- `yourever.app/acme-corp/product-team/channels`
- `yourever.app/acme-corp/product-team/c/general`
- `yourever.app/acme-corp/product-team/dm/user123`
- `yourever.app/acme-corp/product-team/calendar`
- `yourever.app/acme-corp/product-team/people`
- `yourever.app/acme-corp/product-team/admin`
- `yourever.app/acme-corp/product-team/p/project123`
- `yourever.app/acme-corp/product-team/t/task456`

### API Endpoints

**Organization Creation**
- `POST /api/organizations` - Create new organization
- Request body: `OrganizationCreate` schema
- Response: `WorkspaceCreationResponse`

**Slug Availability**
- `GET /api/organizations/slug/availability?slug={slug}` - Check slug availability
- Response: `SlugAvailability` with suggestions if taken

## Frontend-Backend Data Flow

### 1. Form Data Structure
```typescript
interface OrganizationCreateData {
  name: string                    // Organization display name
  slug?: string                   // Custom slug (optional)
  description?: string            // Organization description
  division_name: string           // Primary division name
  division_key?: string           // Division key (optional)
  invitations?: InvitationDraft[] // Optional invitations
}
```

### 2. API Response Structure
```typescript
interface WorkspaceCreationResult {
  organization: Organization      // Created organization data
  userRole: string               // User's role (always "owner")
  templateApplied?: string       // Applied template ID
  activeInvitations: Invitation[] // Sent invitations
  skippedInvites: string[]       // Emails skipped (already pending)
}
```

### 3. Organization Data Structure
```typescript
interface Organization {
  id: string                     // Organization UUID
  name: string                   // Display name
  slug: string                   // URL slug
  description?: string           // Description
  logo_url?: string             // Logo URL
  created_at: string            // Creation timestamp
  divisions: Division[]         // Organization divisions
  user_role: string             // User's role in org
}

interface Division {
  id: string                     // Division UUID
  name: string                   // Display name
  key?: string                   // Division key
  description?: string           // Description
  org_id: string                 // Parent organization ID
  created_at: string            // Creation timestamp
  user_role?: string             // User's role in division
}
```

## Error Analysis

### Current Error
1. **Infinite Loop**: React useEffect re-triggers slug check infinitely
2. **API Spam**: Backend receives hundreds of slug availability requests
3. **Form Failure**: Organization creation fails due to resource exhaustion

### Required Fix
Remove `checkSlugMutation` from the useEffect dependency array in `OrgCreationForm.tsx:197`.

```typescript
// BEFORE (Problematic):
}, [watchedSlug, checkSlugMutation, setValue, getValues])

// AFTER (Fixed):
}, [watchedSlug, setValue, getValues])
```

## Transaction Safety

The organization creation process uses database transactions to ensure atomicity:

1. **Begin Transaction** (repository.py:214)
2. **Execute all INSERT statements**
3. **Commit Transaction** (repository.py:313)
4. **Rollback on Error** (repository.py:348)

This ensures that either all organization data is created successfully, or none of it is created, maintaining database consistency.