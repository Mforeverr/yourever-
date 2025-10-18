# Phase 1: Mock Authentication & Foundation Routing

**Timeline:** Week 1
**Goal:** Implement mock authentication system and establish scoped routing architecture

**Current State Analysis:** ✅ Foundation already exists, needs auth system and scope implementation

---

## 🚀 Task 1.0: Mock Authentication System
**Estimate:** 0.5 day
**Priority:** High

### Rationale: Developer-First Approach
Since you have Supabase available but want to develop features rapidly, implement a mock authentication system that:
- **Bypasses Supabase setup** complexity during development
- **Provides immediate access** to user-specific features
- **Mimics real auth behavior** for testing user flows
- **Easy to swap** with real Supabase auth later

### Files to Create:
```
src/contexts/auth-context.tsx (NEW)
src/hooks/use-auth.ts (NEW)
src/lib/mock-users.ts (NEW)
src/lib/auth-utils.ts (NEW)
src/app/(auth)/layout.tsx (NEW)
src/app/(auth)/login/page.tsx (NEW)
src/app/select-org/page.tsx (NEW)
```

### Mock Authentication Implementation:

#### 1. Mock User System (`src/lib/mock-users.ts`)
```typescript
export interface MockUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
  organizations: Organization[]
  createdAt: string
  updatedAt: string
}

export const mockUsers: MockUser[] = [
  {
    id: 'user_1',
    email: 'dev@yourever.com',
    firstName: 'Dev',
    lastName: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
    role: 'owner',
    organizations: [
      {
        id: 'acme',
        name: 'Acme Corp',
        divisions: [
          { id: 'marketing', name: 'Marketing' },
          { id: 'engineering', name: 'Engineering' },
          { id: 'design', name: 'Design' }
        ],
        userRole: 'owner'
      },
      {
        id: 'yourever',
        name: 'Yourever Labs',
        divisions: [
          { id: 'product', name: 'Product' },
          { id: 'research', name: 'Research' }
        ],
        userRole: 'admin'
      }
    ],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'user_2',
    email: 'member@yourever.com',
    firstName: 'Team',
    lastName: 'Member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    role: 'member',
    organizations: [
      {
        id: 'yourever',
        name: 'Yourever Labs',
        divisions: [
          { id: 'product', name: 'Product' },
          { id: 'research', name: 'Research' }
        ],
        userRole: 'member'
      }
    ],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  }
]

// Development auto-login
export const getDevUser = (): MockUser => {
  if (typeof window !== 'undefined') {
    const storedUserId = localStorage.getItem('mock_auth_user_id')
    if (storedUserId) {
      const user = mockUsers.find(u => u.id === storedUserId)
      if (user) return user
    }
  }
  return mockUsers[0] // Default to dev user
}
```

#### 2. Auth Context (`src/contexts/auth-context.tsx`)
```typescript
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { MockUser } from '@/mocks/data/users'

interface AuthContext {
  user: MockUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isDevMode: boolean
}

const AuthContext = createContext<AuthContext | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Auto-login in development
  useEffect(() => {
    const initAuth = () => {
      // In development, auto-login with dev user
      if (process.env.NODE_ENV === 'development') {
        const devUser = getDevUser()
        setUser(devUser)
        localStorage.setItem('mock_auth_user_id', devUser.id)
      } else {
        // In production, check for stored auth
        const storedUserId = localStorage.getItem('mock_auth_user_id')
        if (storedUserId) {
          const storedUser = mockUsers.find(u => u.id === storedUserId)
          if (storedUser) setUser(storedUser)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - any password works for mock users
    const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem('mock_auth_user_id', foundUser.id)
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('mock_auth_user_id')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isDevMode: process.env.NODE_ENV === 'development'
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

#### 3. Auth Hook (`src/hooks/use-auth.ts`)
```typescript
import { useAuth } from '@/contexts/auth-context'

export const useCurrentUser = () => {
  const { user, ...auth } = useAuth()

  return {
    user,
    isAuthenticated: !!user,
    isDevUser: user?.email === 'dev@yourever.com',
    canAccessOrg: (orgId: string) => user?.organizations.some(org => org.id === orgId),
    canAccessDivision: (orgId: string, divisionId: string) => {
      const org = user?.organizations.find(o => o.id === orgId)
      return org?.divisions.some(division => division.id === divisionId) ?? false
    },
    ...auth
  }
}
```

#### 4. Login Page (`src/app/(auth)/login/page.tsx`)
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { mockUsers } from '@/mocks/data/users'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const success = await login(email, password)
    if (success) {
      router.push('/select-org')
    } else {
      alert('Invalid email. Use: dev@yourever.com or member@yourever.com')
    }

    setIsLoading(false)
  }

  // Quick login buttons for development
  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail)
    setPassword('any-password')
    const success = await login(userEmail, 'any-password')
    if (success) {
      router.push('/select-org')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Yourever</CardTitle>
          <CardDescription>
            Development Mode - Any password works for mock users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@yourever.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="any-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground">Quick Login:</p>
            {mockUsers.map((user) => (
              <Button
                key={user.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleQuickLogin(user.email)}
              >
                {user.firstName} {user.lastName} ({user.email})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Integration Points:

#### 1. Root Layout Update (`src/app/layout.tsx`)
```typescript
// Add AuthProvider around existing children
import { AuthProvider } from '@/contexts/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

#### 2. Protected Route Hook (`src/hooks/use-protected-route.ts`)
```typescript
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from './use-auth'

export const useProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading }
}
```

### Acceptance Criteria:
- [ ] Mock authentication system with 2+ test users
- [ ] Auto-login in development mode
- [ ] Login page with quick login buttons
- [ ] Organization selection page functional
- [ ] Protected routes redirect to login
- [ ] User context available throughout app
- [ ] Easy swap path to real Supabase auth

### Benefits:
1. **Immediate Development**: Start building user-specific features today
2. **Realistic Data**: Mock users have orgs/divisions for testing scoped features
3. **User Experience**: Full auth flow works for testing UI/UX
4. **Zero Dependencies**: No Supabase setup required
5. **Future-Proof**: Easy to replace with real auth when ready

---

## 🚀 Task 1.1: Organization Selection Page
**Estimate:** 0.5 day
**Priority:** High

### Files to Create:
```
src/app/select-org/page.tsx (NEW)
src/components/org/org-grid.tsx (NEW)
src/components/org/division-grid.tsx (NEW)
```

### Implementation:
```typescript
// src/app/select-org/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, ArrowRight } from 'lucide-react'

export default function SelectOrgPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useCurrentUser()

  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  const handleOrgSelect = (orgId: string, divisionId: string) => {
    router.push(`/${orgId}/${divisionId}/dashboard`)
  }

  // Auto-redirect if user has only one org/division
  if (user.organizations.length === 1) {
    const org = user.organizations[0]
    if (org.divisions.length === 1) {
      router.push(`/${org.id}/${org.divisions[0].id}/dashboard`)
      return null
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Select Organization</h1>
          <p className="text-muted-foreground">Choose where you want to work</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {user.organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="size-5" />
                  {org.name}
                </CardTitle>
                <CardDescription>
                  {org.divisions.length} division{org.divisions.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {org.divisions.map((division) => (
                    <Button
                      key={division.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleOrgSelect(org.id, division.id)}
                    >
                      <Users className="size-4 mr-2" />
                      {division.name}
                      <ArrowRight className="size-4 ml-auto" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## 🚀 Task 1.2: Scope-Based Routing Structure
**Estimate:** 0.5 day (reduced from 1 day due to existing foundation)
**Priority:** High

### Current Existing Files to Modify:
```
src/app/(workspace)/dashboard/page.tsx ✅ (exists, needs scope)
src/app/(workspace)/workspace/page.tsx ✅ (exists, needs scope)
src/app/(workspace)/calendar/page.tsx ✅ (exists, needs scope)
src/app/(workspace)/people/page.tsx ✅ (exists, needs scope)
src/app/(workspace)/admin/page.tsx ✅ (exists, needs scope)
src/app/(workspace)/ai/page.tsx ✅ (exists, needs scope)
src/app/explorer/page.tsx ✅ (exists, needs to be moved)
```

### Files to Create:
```
src/app/[orgId]/[divisionId]/layout.tsx (new)
src/app/[orgId]/[divisionId]/dashboard/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/workspace/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/calendar/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/people/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/admin/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/ai/page.tsx (new scoped version)
src/app/[orgId]/[divisionId]/explorer/page.tsx (moved from explorer)
```

### Explorer Migration:
**Current Location:** `src/app/explorer/`
**Target Location:** `src/app/[orgId]/[divisionId]/explorer/`
**Files to Move:**
- `src/app/explorer/page.tsx` → `src/app/[orgId]/[divisionId]/explorer/page.tsx`
- `src/app/explorer/layout.tsx` → Delete (uses WorkspaceShell)
- `src/components/explorer/*` → Keep in current location

### Current WorkspaceShell Analysis:
**File:** `src/components/shell/workspace-shell.tsx`
**Current Navigation (lines 69-102):**
```typescript
// CURRENT: Root-level navigation
case 'home': router.push('/dashboard')
case 'workspace': router.push('/workspace')
case 'calendar': router.push('/calendar')
case 'people': router.push('/people')
case 'admin': router.push('/admin')
case 'channels': router.push('/c/general')
case 'explorer': router.push('/explorer')
case 'ai': router.push('/ai')
```

**Required Updates:**
1. **Add scope context import and usage**
2. **Update all navigation to use scoped paths**
3. **Update ScopeSwitcher to be functional**
4. **Add scope validation for invalid org/division**

### Current ScopeSwitcher Analysis:
**Lines 110-128:** Mock organizations already defined
```typescript
const mockOrganizations: Organization[] = [
  {
    id: 'acme',
    name: 'Acme',
    divisions: [{ id: 'marketing', name: 'Marketing' }, ...]
  },
  {
    id: 'yourever',
    name: 'Yourever Labs',
    divisions: [{ id: 'design', name: 'Design' }, ...]
  }
]
```

**Lines 190-194:** Currently static values
```typescript
<ScopeSwitcher
  organizations={mockOrganizations}
  currentOrgId="acme"           // ← STATIC
  currentDivisionId="marketing" // ← STATIC
/>
```

**Required Updates:**
1. **Extract mockOrganizations** to context/API
2. **Add onScopeChange handler** to ScopeSwitcher
3. **Update currentOrgId/currentDivisionId** from context
4. **Add scope switching logic**

### FastAPI Endpoints needed:
```typescript
// Organization & Division APIs
GET /api/organizations                    // List user's orgs
GET /api/organizations/{orgId}/divisions  // List divisions in org
GET /api/organizations/{orgId}/divisions/{divisionId} // Get division details
```

### Implementation Steps:
1. **Create dynamic route structure** `[orgId]/[divisionId]`
2. **Move explorer page** to scoped location
3. **Update WorkspaceShell navigation** to use scoped paths
4. **Create scope context providers**
5. **Make ScopeSwitcher functional** with real data
6. **Test route validation** and error handling

### Acceptance Criteria:
- [ ] Scoped routes accessible (`/acme/marketing/dashboard`)
- [ ] Explorer moved to `/acme/marketing/explorer`
- [ ] WorkspaceShell navigation uses scoped URLs
- [ ] ScopeSwitcher loads real org/division data
- [ ] Invalid org/division shows proper error page
- [ ] Context providers pass org/division data

---

## 🚀 Task 1.3: Scope Context Management
**Estimate:** 0.5 day
**Priority:** High

### Files to create/modify:
```
src/contexts/scope-context.tsx (new)
src/hooks/use-scope.ts (new)
src/lib/scope-utils.ts (new)
src/components/shell/scope-switcher.tsx (modify existing)
```

### Implementation Steps:
1. **Create scope context** using existing mockOrganization structure
2. **Extract mockOrganizations** from WorkspaceShell to context
3. **Add scope validation** and redirect logic
4. **Create scope switching utilities**
5. **Update existing ScopeSwitcher component** to be functional

### Code Structure:
```typescript
// scope-context.tsx (NEW)
interface ScopeContext {
  orgId: string
  divisionId: string
  org: Organization | null
  division: Division | null
  organizations: Organization[]
  isLoading: boolean
  error: string | null
  switchScope: (orgId: string, divisionId: string) => void
  validateScope: () => boolean
  refreshData: () => void
}

// scope-utils.ts (NEW)
export const extractOrgIdFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/([^\/]+)/)
  return match ? match[1] : null
}

export const extractDivisionIdFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/[^\/]+\/([^\/]+)/)
  return match ? match[1] : null
}

export const buildScopedPath = (orgId: string, divisionId: string, path: string): string => {
  return `/${orgId}/${divisionId}${path}`
}
```

### WorkspaceShell Integration Points:
**Lines to Modify in `workspace-shell.tsx`:**

1. **Add scope context import** (line 3-4 area):
```typescript
import { useScope } from '@/hooks/use-scope'
import { ScopeProvider } from '@/contexts/scope-context'
```

2. **Wrap in ScopeProvider** (line 186-187 area):
```typescript
<ScopeProvider>
  <RightPanelProvider>
    <div className={cn("h-screen flex flex-col bg-background", className)}>
      {/* existing content */}
    </div>
  </RightPanelProvider>
</ScopeProvider>
```

3. **Update handleActivityChange** (lines 70-102):
```typescript
const handleActivityChange = (activity: string) => {
  const { orgId, divisionId } = useScope()

  switch (activity) {
    case 'home':
      router.push(buildScopedPath(orgId, divisionId, '/dashboard'))
      break
    case 'workspace':
      router.push(buildScopedPath(orgId, divisionId, '/workspace'))
      break
    case 'calendar':
      router.push(buildScopedPath(orgId, divisionId, '/calendar'))
      break
    case 'people':
      router.push(buildScopedPath(orgId, divisionId, '/people'))
      break
    case 'admin':
      router.push(buildScopedPath(orgId, divisionId, '/admin'))
      break
    case 'channels':
      router.push(buildScopedPath(orgId, divisionId, '/c/general'))
      break
    case 'explorer':
      router.push(buildScopedPath(orgId, divisionId, '/explorer'))
      break
    case 'ai':
      router.push(buildScopedPath(orgId, divisionId, '/ai'))
      break
    default:
      router.push(buildScopedPath(orgId, divisionId, '/dashboard'))
      break
  }
}
```

4. **Update ScopeSwitcher section** (lines 190-194):
```typescript
const { orgId, divisionId, organizations, switchScope } = useScope()

<ScopeSwitcher
  organizations={organizations}
  currentOrgId={orgId}
  currentDivisionId={divisionId}
  onScopeChange={switchScope}
/>
```

5. **Remove static mockOrganizations** (lines 110-128) - move to context

### Acceptance Criteria:
- [ ] Scope context provides org/division data
- [ ] WorkspaceShell uses scoped navigation
- [ ] ScopeSwitcher functional with real data
- [ ] Invalid scopes trigger redirects to selection page
- [ ] Scope switching updates URL and context
- [ ] Loading states handled gracefully

---

## 🚀 Task 1.4: Explorer Migration & Route Updates
**Estimate:** 0.5 day
**Priority:** High

### Files to create/modify:
```
src/app/[orgId]/[divisionId]/explorer/page.tsx (create - move from existing)
src/app/explorer/page.tsx (delete - moved)
src/app/explorer/layout.tsx (delete - not needed)
src/app/(workspace)/**/*.tsx (update routing paths)
```

### Explorer Migration Implementation:

**1. Create New Explorer Page:**
```typescript
// src/app/[orgId]/[divisionId]/explorer/page.tsx
'use client'

import { useScope } from '@/hooks/use-scope'
import { ExplorerView } from "@/components/explorer/explorer-view"
import { Button } from "@/components/ui/button"
import { Plus, FolderPlus, FilePlus, Upload } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuickActionsDropdown } from "@/components/explorer/explorer-dropdown"

export default function ExplorerPage() {
  const { orgId, divisionId } = useScope()

  return (
    <div className="h-full flex flex-col">
      {/* Explorer Header */}
      <div className="p-4 border-b border-border bg-surface-panel">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">File Explorer</h1>
            <p className="text-sm text-muted-foreground">
              Browse and manage your files in {orgId}/{divisionId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FolderPlus className="size-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FilePlus className="size-4 mr-2" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Upload className="size-4 mr-2" />
                  Upload Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <QuickActionsDropdown />
          </div>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-hidden">
        <ExplorerView orgId={orgId} divisionId={divisionId} />
      </div>
    </div>
  )
}
```

**2. Update ExplorerView Component** (src/components/explorer/explorer-view.tsx):
```typescript
// Add orgId/divisionId props to ExplorerView
interface ExplorerViewProps {
  orgId: string
  divisionId: string
}

export function ExplorerView({ orgId, divisionId }: ExplorerViewProps) {
  // Use scoped data for file operations
  const { data: files, isLoading } = useFiles(orgId, divisionId)

  // Existing implementation with scoped data
  return (
    // Current ExplorerView implementation
    // Update API calls to use orgId/divisionId
  )
}
```

### Route Path Updates Required:

**Current ActivityBar Routes (workspace-shell.tsx lines 47-67):**
```typescript
// UPDATE: Add scope detection for explorer
React.useEffect(() => {
  if (pathname.startsWith('/dashboard')) {
    setActiveActivity('home')
  } else if (pathname.startsWith('/workspace')) {
    setActiveActivity('workspace')
  } else if (pathname.startsWith('/calendar')) {
    setActiveActivity('calendar')
  } else if (pathname.startsWith('/people')) {
    setActiveActivity('people')
  } else if (pathname.startsWith('/admin')) {
    setActiveActivity('admin')
  } else if (pathname.startsWith('/c/') || pathname.startsWith('/dm/')) {
    setActiveActivity('channels')
  } else if (pathname.match(/^\/[^\/]+\/[^\/]+\/explorer/)) {  // NEW: Match scoped explorer
    setActiveActivity('explorer')
  } else if (pathname.startsWith('/explorer')) {  // REMOVE: Old explorer route
    setActiveActivity('explorer')
  } else if (pathname.startsWith('/ai')) {
    setActiveActivity('ai')
  } else {
    setActiveActivity('home')
  }
}, [pathname])
```

### Button Actions Analysis & Processing:

**Explorer Header Buttons:**

1. **"New" Dropdown Button** (lines 28-51 in explorer/page.tsx):
   - **Current:** Static dropdown with "New Folder", "New Document", "Upload Files"
   - **Action:** Open modals for each action
   - **Processing:**
     - "New Folder" → Open folder creation modal with name input
     - "New Document" → Open document creation modal with template selection
     - "Upload Files" → Open file upload dialog
     - **API Integration:** All actions should use `orgId/divisionId` for scoping

2. **QuickActionsDropdown** (line 51):
   - **Current:** Custom dropdown component
   - **Action:** Provides additional quick actions
   - **Processing:** Should use scoped context for operations

**ActivityBar Button Actions** (workspace-shell.tsx):

3. **Home Button** (activity 'home'):
   - **Current:** `router.push('/dashboard')`
   - **Updated:** `router.push(buildScopedPath(orgId, divisionId, '/dashboard'))`
   - **Processing:** Navigate to scoped dashboard

4. **Workspace Button** (activity 'workspace'):
   - **Current:** `router.push('/workspace')`
   - **Updated:** `router.push(buildScopedPath(orgId, divisionId, '/workspace'))`
   - **Processing:** Navigate to scoped workspace

5. **Explorer Button** (activity 'explorer'):
   - **Current:** `router.push('/explorer')`
   - **Updated:** `router.push(buildScopedPath(orgId, divisionId, '/explorer'))`
   - **Processing:** Navigate to scoped explorer

6. **AI Button** (activity 'ai'):
   - **Current:** `router.push('/ai')`
   - **Updated:** `router.push(buildScopedPath(orgId, divisionId, '/ai'))`
   - **Processing:** Navigate to scoped AI assistant

### Acceptance Criteria:
- [ ] Explorer moved to scoped route `/orgId/divisionId/explorer`
- [ ] All navigation uses scoped URLs
- [ ] Explorer actions use orgId/divisionId for scoping
- [ ] Old `/explorer` route redirects to scoped version
- [ ] ActivityBar buttons navigate to correct scoped locations
- [ ] Explorer header shows current scope in description
- [ ] File operations scoped to current org/division

### Migration Tasks:
1. **Create scoped explorer page** with scope context
2. **Update ExplorerView component** to accept scope props
3. **Update WorkspaceShell navigation** to handle scoped routes
4. **Remove old explorer layout** (uses WorkspaceShell)
5. **Update ActivityBar** path detection for explorer
6. **Test all navigation flows** with different scopes

---

## 🎯 Phase 1 Success Criteria

### Authentication Requirements:
- [ ] Mock authentication system functional with dev users
- [ ] Auto-login works in development mode
- [ ] Organization selection page handles single/multiple orgs
- [ ] Protected routes redirect to login when unauthenticated

### Functional Requirements:
- [ ] All workspace routes use scoped structure `/:orgId/:divisionId/...`
- [ ] Scope context provides consistent org/division data
- [ ] Navigation maintains scope across all pages
- [ ] Error handling for invalid org/division combinations

### Technical Requirements:
- [ ] Dynamic routes implemented correctly
- [ ] Context providers work across route changes
- [ ] Loading states implemented everywhere
- [ ] Mock users system ready for Supabase migration

### Testing Requirements:
- [ ] Manual testing of authentication flow
- [ ] Manual testing of all scoped routes
- [ ] Invalid scope handling tested
- [ ] Navigation flow tested end-to-end
- [ ] Organization selection flow tested

### Total Timeline: 2 days
- Task 1.0: Mock Authentication - 0.5 day
- Task 1.1: Organization Selection - 0.5 day
- Task 1.2: Scope-Based Routing - 0.5 day
- Task 1.3: Scope Context Management - 0.5 day
- Task 1.4: Explorer Migration - 0.5 day

---

## 🔗 Dependencies

**Prerequisites:** None
**Blocking:** Phase 2 (Core Flows)
**Parallel:** FastAPI endpoint development

---

## 📝 Notes

- **Route Structure:** Follow Next.js dynamic routing conventions
- **Error Handling:** Implement proper 404 and unauthorized states
- **Performance:** Use Next.js ISR for org/division data if needed
- **Security:** Validate user permissions for org/division access