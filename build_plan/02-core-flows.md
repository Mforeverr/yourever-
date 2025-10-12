# Phase 2: Core User Flows

**Timeline:** Week 1-2
**Goal:** Implement login, onboarding, and organization/division selection flows

---

## 🚀 Task 2.1: Login Page
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/app/(marketing)/login/page.tsx (new)
src/components/auth/login-form.tsx (new)
src/components/auth/social-login.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
POST /api/auth/login                  // Email login
POST /api/auth/google                 // Google OAuth
POST /api/auth/github                 // GitHub OAuth
POST /api/auth/magic-link             // Magic link request
GET  /api/auth/magic-link/{token}     // Magic link verification
GET  /api/auth/me                     // Current user info
GET  /api/auth/me/organizations        // User's orgs for redirect logic
```

### Implementation steps:
1. **Create login page** with multiple auth options
2. **Implement post-login redirect logic** (single org → dashboard, multiple → select-org)
3. **Add form validation** and error handling
4. **Connect to FastAPI endpoints**

### Code Structure:
```typescript
// login-form.tsx
interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

// Post-login redirect logic
const handlePostLoginRedirect = (user: User) => {
  if (user.organizations.length === 1 &&
      user.organizations[0].divisions.length === 1) {
    // Single org/division → direct to workspace
    const org = user.organizations[0]
    const division = org.divisions[0]
    router.push(`/${org.id}/${division.id}/dashboard`)
  } else {
    // Multiple orgs/divisions → selection page
    router.push('/select-org')
  }
}
```

### Acceptance Criteria:
- [ ] Email/password login functional
- [ ] Social login buttons implemented
- [ ] Magic link login flow working
- [ ] Post-login redirects correct
- [ ] Error states handled gracefully

---

## 🚀 Task 2.2: Organization Selection Page
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/app/select-org/page.tsx (new)
src/components/selection/org-card.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
GET /api/organizations                    // List orgs with user's roles
GET /api/organizations/{orgId}/divisions  // List divisions for org selection
```

### Implementation steps:
1. **Create org selection grid** with search
2. **Add org cards** with role badges (Owner/Admin/Member)
3. **Implement navigation** to selected org's division selection
4. **Add empty states** and loading skeletons

### Code Structure:
```typescript
// org-card.tsx
interface OrganizationCardProps {
  org: Organization & {
    role: 'owner' | 'admin' | 'member'
    divisionCount: number
  }
  onSelect: (orgId: string) => void
}
```

### Acceptance Criteria:
- [ ] Organizations displayed in grid layout
- [ ] Role badges shown correctly
- [ ] Search functionality working
- [ ] Loading states implemented
- [ ] Empty state for no orgs

---

## 🚀 Task 2.3: Division Selection Page
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/app/[orgId]/divisions/page.tsx (new)
src/components/selection/division-card.tsx (new)
```

### Implementation steps:
1. **Create division selection** for specific org
2. **Add division cards** with project counts
3. **Implement navigation** to scoped workspace
4. **Handle permission-based filtering**

### Code Structure:
```typescript
// division-card.tsx
interface DivisionCardProps {
  division: Division & {
    projectCount: number
    memberCount: number
    userRole: 'owner' | 'admin' | 'member'
  }
  orgId: string
  onSelect: (divisionId: string) => void
}
```

### Acceptance Criteria:
- [ ] Divisions displayed for selected org
- [ ] Project/member counts shown
- [ ] Navigation to scoped workspace works
- [ ] Permission filtering applied
- [ ] Back to org selection functional

---

## 🚀 Task 2.4: Onboarding Flow - Profile Setup
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/app/(onboarding)/profile/page.tsx (new)
src/components/onboarding/profile-form.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
PUT  /api/users/profile                  // Update user profile
POST /api/users/avatar                   // Upload avatar
```

### Implementation steps:
1. **Create profile setup** with name, avatar, role
2. **Add avatar upload functionality**
3. **Implement progress indicator**
4. **Add form validation** and persistence

### Code Structure:
```typescript
// profile-form.tsx
interface ProfileFormData {
  firstName: string
  lastName: string
  role: string
  avatar?: File
  bio?: string
}
```

### Acceptance Criteria:
- [ ] Profile form fields functional
- [ ] Avatar upload working
- [ ] Progress indicator accurate
- [ ] Form validation implemented
- [ ] Data persists to backend

---

## 🚀 Task 2.5: Onboarding Flow - Work Profile
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/app/(onboarding)/work-profile/page.tsx (new)
src/components/onboarding/work-profile-form.tsx (new)
```

### Implementation steps:
1. **Create work profile setup** (role, functions, intents)
2. **Add checkbox selections** for work preferences
3. **Implement role-based suggestions**
4. **Connect to user preferences API**

### Code Structure:
```typescript
// work-profile-form.tsx
interface WorkProfileData {
  role: string
  functions: string[]
  intents: string[]
  experience: string
  teamSize: string
}
```

### Acceptance Criteria:
- [ ] Work profile form complete
- [ ] Checkbox selections functional
- [ ] Role suggestions working
- [ ] Progress updated correctly
- [ ] Data saved to user profile

---

## 🚀 Task 2.6: Onboarding Flow - Tool Stack
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/app/(onboarding)/tool-stack/page.tsx (new)
src/components/onboarding/tool-selection.tsx (new)
```

### Implementation steps:
1. **Create tool selection interface** (Slack, Asana, Zoom, etc.)
2. **Add tool cards** with descriptions
3. **Implement integration setup flow**
4. **Add skip option** for later setup

### Code Structure:
```typescript
// tool-selection.tsx
interface ToolOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  setupRequired: boolean
}
```

### Acceptance Criteria:
- [ ] Tool selection interface functional
- [ ] Tool cards display correctly
- [ ] Integration flow initiated
- [ ] Skip option available
- [ ] Selected tools saved for later

---

## 🚀 Task 2.7: Onboarding Flow - Invite Team
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/app/(onboarding)/invite/page.tsx (new)
src/components/onboarding/invite-form.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
POST /api/invitations/bulk             // Send multiple invitations
GET  /api/invitations/status           // Check invitation status
```

### Implementation steps:
1. **Create team invitation interface**
2. **Add email input** with validation
3. **Implement role selection** for invitees
4. **Add invitation status tracking**

### Code Structure:
```typescript
// invite-form.tsx
interface InviteFormData {
  emails: string[]
  defaultRole: 'admin' | 'member'
  message?: string
}
```

### Acceptance Criteria:
- [ ] Email input functional
- [ ] Multiple emails supported
- [ ] Role selection working
- [ ] Invitations sent successfully
- [ ] Skip option available

---

## 🚀 Task 2.8: Onboarding Flow - Workspace Hub
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/app/(onboarding)/workspace-hub/page.tsx (new)
src/components/onboarding/workspace-creation.tsx (new)
```

### FastAPI Endpoints needed:
```typescript
POST /api/organizations                  // Create new org
POST /api/organizations/{orgId}/divisions // Create new division
GET  /api/organizations/templates        // Get org templates
```

### Implementation steps:
1. **Create workspace selection/creation flow**
2. **Add org creation form** with templates
3. **Implement division setup** within org
4. **Add final onboarding completion flow**

### Code Structure:
```typescript
// workspace-creation.tsx
interface WorkspaceData {
  choice: 'join' | 'create'
  organization?: OrganizationData
  division?: DivisionData
}

interface OrganizationData {
  name: string
  domain?: string
  template?: string
}
```

### Acceptance Criteria:
- [ ] Join vs create workspace choice
- [ ] Org creation functional
- [ ] Division setup working
- [ ] Templates applied correctly
- [ ] Onboarding completion flow
- [ ] Redirect to workspace

---

## 🎯 Phase 2 Success Criteria

### Functional Requirements:
- [ ] Login page functional with all auth methods
- [ ] Organization selection flow working
- [ ] Division selection flow working
- [ ] Complete onboarding flow implemented
- [ ] Post-onboarding navigation to workspace

### Technical Requirements:
- [ ] All FastAPI auth endpoints integrated
- [ ] Form validation implemented everywhere
- [ ] Progress tracking across onboarding
- [ ] Error handling for all API calls
- [ ] Loading states implemented

### UX Requirements:
- [ ] Smooth transitions between steps
- [ ] Clear progress indicators
- [ ] Helpful error messages
- [ ] Mobile-responsive design
- [ ] Accessibility compliance

---

## 🔗 Dependencies

**Prerequisites:** Phase 1 (Foundation & Routing)
**Blocking:** Phase 3 (Global Integrations)
**Parallel:** FastAPI authentication endpoints

---

## 📝 Notes

- **Security:** Implement proper CSRF protection for forms
- **Validation:** Use Zod schemas for form validation
- **Persistence:** Save onboarding progress to allow completion later
- **Mobile:** Ensure all forms work well on mobile devices
- **Analytics:** Track onboarding completion rates