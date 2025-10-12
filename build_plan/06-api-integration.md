# Phase 6: API Integration & Data Layer

**Timeline:** Week 3-4
**Goal:** Implement mock data layer and FastAPI client integration

---

## 🚀 Task 6.1: FastAPI Client Setup
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/lib/api-client.ts (new)
src/lib/api-endpoints.ts (new)
src/lib/api-types.ts (new)
src/lib/api-errors.ts (new)
```

### Implementation steps:
1. **Create FastAPI client** with proper error handling
2. **Define API endpoints** with TypeScript types
3. **Implement authentication** and request interceptors
4. **Add response handling** and error types

### Code Structure:
```typescript
// api-client.ts
class ApiClient {
  private baseURL: string
  private accessToken: string | null = null

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
  }

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new ApiError(response.status, error.message || 'Request failed')
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(0, 'Network error')
    }
  }

  // HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // File upload
  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    })
  }
}

// api-endpoints.ts
export const apiEndpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    google: '/auth/google',
    github: '/auth/github',
  },

  // Organizations
  organizations: {
    list: '/organizations',
    create: '/organizations',
    get: (id: string) => `/organizations/${id}`,
    update: (id: string) => `/organizations/${id}`,
    delete: (id: string) => `/organizations/${id}`,
    divisions: (id: string) => `/organizations/${id}/divisions`,
    branding: (id: string) => `/organizations/${id}/branding`,
    usage: (id: string) => `/organizations/${id}/usage`,
    audit: (id: string) => `/organizations/${id}/audit`,
  },

  // Projects
  projects: {
    list: (orgId: string, divisionId: string) => `/organizations/${orgId}/divisions/${divisionId}/projects`,
    create: (orgId: string, divisionId: string) => `/organizations/${orgId}/divisions/${divisionId}/projects`,
    get: (id: string) => `/projects/${id}`,
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
    tasks: (id: string) => `/projects/${id}/tasks`,
    timeline: (id: string) => `/projects/${id}/timeline`,
    docs: (id: string) => `/projects/${id}/docs`,
    members: (id: string) => `/projects/${id}/members`,
  },

  // Tasks
  tasks: {
    list: (orgId: string, divisionId: string) => `/organizations/${orgId}/divisions/${divisionId}/tasks`,
    create: (orgId: string, divisionId: string) => `/organizations/${orgId}/divisions/${divisionId}/tasks`,
    get: (id: string) => `/tasks/${id}`,
    update: (id: string) => `/tasks/${id}`,
    delete: (id: string) => `/tasks/${id}`,
    comments: (id: string) => `/tasks/${id}/comments`,
    subtasks: (id: string) => `/tasks/${id}/subtasks`,
    relations: (id: string) => `/tasks/${id}/relations`,
  },

  // Search
  search: {
    global: '/search/global',
    projects: '/search/projects',
    tasks: '/search/tasks',
    channels: '/search/channels',
  },

  // Integrations
  integrations: {
    list: '/integrations',
    get: (service: string) => `/integrations/${service}`,
    update: (service: string) => `/integrations/${service}`,
    delete: (service: string) => `/integrations/${service}`,
    test: (service: string) => `/integrations/${service}/test`,
  },
}

// api-types.ts
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role: string
  organizations: Organization[]
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  domain?: string
  logo?: string
  branding?: Branding
  divisions: Division[]
  userRole: 'owner' | 'admin' | 'member'
}

export interface Division {
  id: string
  name: string
  description?: string
  organizationId: string
  projects: Project[]
  userRole: 'owner' | 'admin' | 'member'
}

// ... more types

// api-errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Please log in to continue'
      case 403:
        return 'You don\'t have permission to perform this action'
      case 404:
        return 'The requested resource was not found'
      case 422:
        return 'Invalid data provided'
      case 500:
        return 'Server error. Please try again later'
      default:
        return error.message || 'An error occurred'
    }
  }
  return 'An unexpected error occurred'
}
```

### Acceptance Criteria:
- [ ] FastAPI client created with proper error handling
- [ ] All API endpoints defined with TypeScript types
- [ ] Authentication interceptor working
- [ ] Error handling implemented with user-friendly messages

---

## 🚀 Task 6.2: TanStack Query Integration
**Estimate:** 0.5 day
**Priority:** High

### Files to create:
```
src/lib/query-client.ts (new)
src/hooks/api/use-organizations.ts (new)
src/hooks/api/use-projects.ts (new)
src/hooks/api/use-tasks.ts (new)
src/hooks/api/use-auth.ts (new)
src/hooks/api/use-search.ts (new)
```

### Implementation steps:
1. **Set up QueryClient** with proper configuration
2. **Create API hooks** for common data fetching
3. **Add caching and invalidation strategies**
4. **Implement optimistic updates** where appropriate

### Code Structure:
```typescript
// query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false // Don't retry client errors
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})

// use-organizations.ts
export const useOrganizations = () => {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.get<Organization[]>(apiEndpoints.organizations.list),
    staleTime: 10 * 60 * 1000, // Organizations change rarely
  })
}

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: () => apiClient.get<Organization>(apiEndpoints.organizations.get(id)),
    enabled: !!id,
  })
}

export const useCreateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrganizationData) =>
      apiClient.post<Organization>(apiEndpoints.organizations.create, data),
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationData }) =>
      apiClient.put<Organization>(apiEndpoints.organizations.update(id), data),
    onSuccess: (updatedOrg) => {
      queryClient.setQueryData(['organizations', updatedOrg.id], updatedOrg)
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// use-projects.ts
export const useProjects = (orgId: string, divisionId: string) => {
  return useQuery({
    queryKey: ['projects', orgId, divisionId],
    queryFn: () => apiClient.get<Project[]>(apiEndpoints.projects.list(orgId, divisionId)),
    enabled: !!(orgId && divisionId),
  })
}

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => apiClient.get<Project>(apiEndpoints.projects.get(id)),
    enabled: !!id,
  })
}

export const useCreateProject = (orgId: string, divisionId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProjectData) =>
      apiClient.post<Project>(apiEndpoints.projects.create(orgId, divisionId), data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, divisionId] })
      toast.success('Project created successfully')
      // Navigate to new project
      router.push(`/${orgId}/${divisionId}/projects/${newProject.id}`)
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      apiClient.put<Project>(apiEndpoints.projects.update(id), data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['projects', id] })

      // Snapshot the previous value
      const previousProject = queryClient.getQueryData(['projects', id])

      // Optimistically update to the new value
      queryClient.setQueryData(['projects', id], (old: Project) => ({
        ...old,
        ...data,
      }))

      return { previousProject }
    },
    onError: (err, newProject, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['projects', newProject.id], context?.previousProject)
      toast.error(handleApiError(err))
    },
    onSettled: (newProject) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['projects', newProject.id] })
    },
  })
}

// use-search.ts
export const useGlobalSearch = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['search', 'global', query],
    queryFn: () => apiClient.get<SearchResult[]>(`${apiEndpoints.search.global}?q=${encodeURIComponent(query)}`),
    enabled: enabled && query.length > 2,
    staleTime: 2 * 60 * 1000, // Search results can be stale quickly
  })
}

// use-auth.ts
export const useAuth = () => {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<User>(apiEndpoints.auth.me),
    staleTime: 15 * 60 * 1000, // User data changes rarely
    retry: false,
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginData) =>
      apiClient.post<{ user: User; token: string }>(apiEndpoints.auth.login, data),
    onSuccess: ({ user, token }) => {
      apiClient.setAccessToken(token)
      queryClient.setQueryData(['auth', 'me'], user)
      localStorage.setItem('accessToken', token)

      // Handle post-login redirect
      if (user.organizations.length === 1 && user.organizations[0].divisions.length === 1) {
        const org = user.organizations[0]
        const division = org.divisions[0]
        router.push(`/${org.id}/${division.id}/dashboard`)
      } else {
        router.push('/select-org')
      }
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}
```

### Acceptance Criteria:
- [ ] QueryClient configured with proper defaults
- [ ] API hooks implemented for all major entities
- [ ] Caching strategies implemented correctly
- [ ] Optimistic updates working for mutations
- [ ] Error handling integrated with toast notifications

---

## 🚀 Task 6.3: Data Fetching Integration
**Estimate:** 1 day
**Priority:** High

### Files to modify:
```
Multiple components and pages throughout the application
```

### Implementation steps:
1. **Replace static data** with API calls using hooks
2. **Add loading states** and error handling everywhere
3. **Implement proper data refetching** strategies
4. **Add offline/fallback data** strategies

### Migration Examples:
```typescript
// Before: Static data in component
const ProjectPage = ({ params }: { params: { projectId: string } }) => {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Static mock data
    setProject(mockProject)
    setIsLoading(false)
  }, [])

  return (
    // JSX with static data
  )
}

// After: API integration with TanStack Query
const ProjectPage = ({ params }: { params: { projectId: string } }) => {
  const { data: project, isLoading, error } = useProject(params.projectId)

  if (isLoading) return <ProjectSkeleton />
  if (error) return <ErrorState error={error} />
  if (!project) return <NotFoundState />

  return (
    // JSX with real data
  )
}

// Before: Static organization selection
const OrgSelection = () => {
  const [organizations] = useState(mockOrganizations)

  return (
    // JSX with static data
  )
}

// After: API integration
const OrgSelection = () => {
  const { data: organizations, isLoading, error } = useOrganizations()

  if (isLoading) return <OrgSelectionSkeleton />
  if (error) return <ErrorState error={error} />
  if (!organizations || organizations.length === 0) return <EmptyState />

  return (
    // JSX with real data
  )
}

// Integration with command palette search
const CommandPalette = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: searchResults, isLoading } = useGlobalSearch(searchQuery)

  return (
    // Command palette with real search results
  )
}
```

### Components to Update:
- **Auth Components:** Login forms, user profile
- **Organization Components:** Selection, management, branding
- **Project Components:** Lists, details, creation, editing
- **Task Components:** Lists, details, properties, comments
- **Admin Components:** Usage stats, audit logs, integrations
- **Search Components:** Global search, command palette
- **Navigation Components:** Breadcrumbs, scope switcher

### Acceptance Criteria:
- [ ] All static data replaced with API calls
- [ ] Loading states implemented everywhere
- [ ] Error handling with user-friendly messages
- [ ] Data refetching working appropriately
- [ ] Offline/fallback strategies implemented

---

## 🚀 Task 6.4: Error Boundaries & Offline Support
**Estimate:** 0.5 day
**Priority:** Medium

### Files to create:
```
src/components/error/error-boundary.tsx (new)
src/components/error/error-fallback.tsx (new)
src/components/error/network-error.tsx (new)
src/hooks/use-network-status.ts (new)
```

### Implementation steps:
1. **Add error boundaries** for better error handling
2. **Implement network status** detection
3. **Add offline data** strategies
4. **Create retry mechanisms** for failed requests

### Code Structure:
```typescript
// error-boundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }

    return this.props.children
  }
}

// use-network-status.ts
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Network-aware component
const NetworkAwareComponent = () => {
  const isOnline = useNetworkStatus()

  if (!isOnline) {
    return <OfflineBanner />
  }

  return <Component />
}
```

### Acceptance Criteria:
- [ ] Error boundaries implemented at appropriate levels
- [ ] Network status detection working
- [ ] Offline banners shown when offline
- [ ] Retry mechanisms for failed requests
- [ ] Graceful degradation for network issues

---

## 🎯 Phase 6 Success Criteria

### Functional Requirements:
- [ ] FastAPI client fully integrated
- [ ] TanStack Query working with proper caching
- [ ] All components using real API data
- [ ] Error boundaries implemented
- [ ] Network status detection working

### Technical Requirements:
- [ ] TypeScript types for all API responses
- [ ] Proper error handling throughout
- [ ] Loading states implemented everywhere
- [ ] Optimistic updates for mutations
- [ ] Query invalidation strategies working

### Performance Requirements:
- [ ] Efficient caching strategies
- [ ] Minimal unnecessary API calls
- [ ] Fast response times for cached data
- [ ] Proper memory management
- [ ] Background refetching working

---

## 🔗 Dependencies

**Prerequisites:** Phase 1-5 (All previous phases)
**Blocking:** Phase 7 (Polish & Performance)
**Parallel:** FastAPI backend development

---

## 📝 Notes

- **Environment:** Configure different API endpoints for development/staging/production
- **Authentication:** Implement proper token refresh mechanisms
- **Performance:** Monitor query performance and optimize as needed
- **Security:** Ensure proper handling of sensitive data
- **Testing:** Add integration tests for API interactions