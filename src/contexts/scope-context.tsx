'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import type { ApiError } from '@/lib/api/http'
import { useScopeQuery } from '@/hooks/api/use-scope-query'
import { useCurrentUser } from '@/hooks/use-auth'
import { buildDivisionRoute, buildOrgRoute, buildProjectRoute } from '@/lib/routing'
import { toast } from '@/hooks/use-toast'
import type { WorkspaceDivision, WorkspaceOrganization } from '@/modules/auth/types'
import type { ScopeStatus } from '@/modules/scope/types'
import type { ScopeState } from '@/modules/scope/types'
import { useScopeStore } from '@/state/scope.store'
import type { ProjectScopeSource } from '@/state/scope.store'
import type { ProjectSummary } from '@/modules/projects/contracts'
import { useProjectsByScopeQuery, useProjectDetailQuery } from '@/hooks/api/use-project-query'
import { authDebugger } from '@/lib/debug/auth-debugger'

// Breadcrumb navigation item for scope hierarchy
interface ScopeBreadcrumbItem {
  id: string
  name: string
  type: 'organization' | 'division' | 'project'
  href: string
}

interface ScopeContextValue {
  organizations: WorkspaceOrganization[]
  currentOrganization: WorkspaceOrganization | null
  currentDivision: WorkspaceDivision | null
  currentProject: ProjectSummary | null
  currentOrgId: string | null
  currentDivisionId: string | null
  currentProjectId: string | null
  projectScopeSource: ProjectScopeSource
  projectScopeReason: string | null
  projectScopeUpdatedAt: string | null
  status: ScopeStatus
  error: ApiError | null
  isReady: boolean
  // Enhanced breadcrumb navigation
  breadcrumbs: ScopeBreadcrumbItem[]
  // Project switching validation and management
  canSwitchToProject: (projectId: string) => boolean
  getAvailableProjects: () => ProjectSummary[]
  switchToProject: (projectId: string, options?: { view?: string; reason?: string }) => Promise<boolean>
  switchToProjectBySlug: (slug: string, options?: { view?: string; reason?: string }) => Promise<boolean>
  // Enhanced scope functions
  setScope: (orgId: string, divisionId?: string | null, options?: { reason?: string }) => Promise<void>
  setDivision: (divisionId: string, options?: { reason?: string }) => Promise<void>
  setProjectScope: (projectId: string | null, options?: { reason?: string; syncToRoute?: boolean; projectData?: ProjectSummary }) => void
  clearProjectScope: (options?: { reason?: string }) => void
  refresh: () => Promise<void>
  // Enhanced project workspace navigation
  navigateToProject: (projectId: string, view?: string, options?: { reason?: string }) => void
  exitProject: (targetPath?: string) => void
  // Project context support
  getProjectHierarchy: () => { org: WorkspaceOrganization | null; division: WorkspaceDivision | null; project: ProjectSummary | null }
  isProjectActive: (projectId: string) => boolean
  validateProjectScope: (projectId: string) => { valid: boolean; reason?: string }
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined)

interface ProjectScopeAdapterState {
  projectId: string | null
  source: ProjectScopeSource
  reason: string | null
  updatedAt: string | null
  projectData: ProjectSummary | null
}

const sanitizeSlug = (value: string | null | undefined): string =>
  (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const computeProjectSlug = (project: ProjectSummary): string =>
  sanitizeSlug(project.slug ?? project.name ?? project.id)

class ScopeMutex {
  private current: Promise<void> = Promise.resolve()

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    let release: (() => void) | undefined
    const previous = this.current
    this.current = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
    try {
      return await task()
    } finally {
      release?.()
    }
  }
}

const fallbackContext: ScopeContextValue = {
  organizations: [],
  currentOrganization: null,
  currentDivision: null,
  currentProject: null,
  currentOrgId: null,
  currentDivisionId: null,
  currentProjectId: null,
  projectScopeSource: null,
  projectScopeReason: null,
  projectScopeUpdatedAt: null,
  status: 'idle',
  error: null,
  isReady: false,
  breadcrumbs: [],
  canSwitchToProject: () => false,
  getAvailableProjects: () => [],
  switchToProject: async () => false,
  switchToProjectBySlug: async () => false,
  setScope: async () => {},
  setDivision: async () => {},
  setProjectScope: () => {},
  clearProjectScope: () => {},
  refresh: async () => {},
  navigateToProject: () => {},
  exitProject: () => {},
  getProjectHierarchy: () => ({ org: null, division: null, project: null }),
  isProjectActive: () => false,
  validateProjectScope: () => ({ valid: false, reason: 'Authentication not ready - please wait' }),
}

const normalizeParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}


const deriveTrailingPath = (pathname: string | null | undefined): string => {
  if (!pathname) return '/dashboard'
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 2) {
    return '/dashboard'
  }
  const trailing = segments.slice(2).join('/') || 'dashboard'
  return `/${trailing.replace(/^\/+/, '')}`
}

const generateBreadcrumbs = (
  organization: WorkspaceOrganization | null,
  division: WorkspaceDivision | null,
  project: ProjectSummary | null,
  orgId: string | null,
  divisionId: string | null,
  projectId: string | null
): ScopeBreadcrumbItem[] => {
  const breadcrumbs: ScopeBreadcrumbItem[] = []

  if (organization && orgId) {
    breadcrumbs.push({
      id: orgId,
      name: organization.name,
      type: 'organization',
      href: buildOrgRoute(orgId, '/dashboard')
    })
  }

  if (division && divisionId && orgId) {
    breadcrumbs.push({
      id: divisionId,
      name: division.name,
      type: 'division',
      href: buildDivisionRoute(orgId, divisionId, '/dashboard')
    })
  }

  if (project && projectId && orgId && divisionId) {
    breadcrumbs.push({
      id: projectId,
      name: project.name,
      type: 'project',
      href: buildProjectRoute(orgId, divisionId, projectId, 'board')
    })
  }

  return breadcrumbs
}


const buildOptimisticState = (
  previous: ScopeState | undefined,
  orgId: string,
  divisionId: string | null,
): ScopeState | undefined => {
  if (!previous) return undefined
  const next: ScopeState = {
    ...previous,
    active: previous.active
      ? {
          ...previous.active,
          orgId,
          divisionId,
          lastUpdatedAt: new Date().toISOString(),
        }
      : {
          orgId,
          divisionId,
          role: null,
          divisionRole: null,
          permissions: ['scope:read'],
          lastUpdatedAt: new Date().toISOString(),
        },
    cachedAt: new Date().toISOString(),
  }
  return next
}

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ orgId?: string; divisionId?: string; projectId?: string }>()
  const { user, isAuthenticated, isLoading: isAuthLoading, sessionInitialized } = useCurrentUser()

  // Enhanced authentication state tracking with proper loading states
  const authState = useMemo(() => {
    // When auth is loading or session is not initialized, we consider it "not ready" but don't treat as unauthenticated
    if (isAuthLoading || !sessionInitialized) {
      console.log('[SCOPE DEBUG] auth-not-ready:', {
        isAuthLoading,
        sessionInitialized,
        hasUser: !!user,
        userId: user?.id
      })
      return {
        isAuthenticated: false,
        isReady: false,
        isLoading: true,
        user: null
      }
    }

    // Only consider authenticated when we have a confirmed user, auth is not loading, and session is initialized
    const isUserAuthenticated = Boolean(user)
    console.log('[SCOPE DEBUG] auth-ready:', {
      isUserAuthenticated,
      userId: user?.id,
      sessionInitialized,
      isAuthLoading
    })

    return {
      isAuthenticated: isUserAuthenticated,
      isReady: true,
      isLoading: false,
      user
    }
  }, [user, isAuthLoading, sessionInitialized])

  const { data, status: queryStatus, error: queryError, refetch, isFetching, setScopeCache, mutateScope } = useScopeQuery({
    // Only enable scope query when auth is fully ready and user is authenticated
    enabled: authState.isReady && authState.isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as ApiError).status === 401) {
        console.warn('[SCOPE DEBUG] Scope query failed with 401, user may not be properly authenticated')
        return false
      }
      if (failureCount >= 2) {
        console.error('[SCOPE DEBUG] Scope query failed after retries', { failureCount, error })
        return false
      }
      return true
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff with 5s max
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const scopeState = data ?? undefined
  const organizations = scopeState?.organizations ?? []
  const activeOrgId = scopeState?.active?.orgId ?? null
  const activeDivisionId = scopeState?.active?.divisionId ?? null
  const isReady = authState.isReady && queryStatus === 'success' && Boolean(scopeState?.active || organizations.length === 0)

  // Fetch projects available in the current scope
  const { data: scopeProjects, isLoading: projectsLoading } = useProjectsByScopeQuery(
    activeOrgId,
    activeDivisionId,
    {
      enabled: Boolean(activeOrgId && isReady && authState.isAuthenticated),
      staleTime: 60_000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Fetch current project details if a project is active
  const rawRouteProjectId = normalizeParam(params?.projectId)
  const routeProjectId = rawRouteProjectId ?? null
  const routeIncludesProject = typeof rawRouteProjectId !== 'undefined'
  const { data: currentProjectDetails } = useProjectDetailQuery(
    routeProjectId,
    {
      orgId: activeOrgId ?? undefined,
      enabled: Boolean(routeProjectId && activeOrgId && authState.isAuthenticated && authState.isReady),
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes,
    }
  )
  const [mutationPending, setMutationPending] = useState(false)
  const [mutationError, setMutationError] = useState<ApiError | null>(null)
  const scopeMutexRef = useRef(new ScopeMutex())
  const [projectScope, setProjectScopeState] = useState<ProjectScopeAdapterState>({
    projectId: null,
    source: null,
    reason: null,
    updatedAt: null,
    projectData: null,
  })

  // Auth timeout mechanism to prevent indefinite loading states
  const [authTimeout, setAuthTimeout] = useState(false)
  useEffect(() => {
    if (isAuthLoading && !authTimeout) {
      const timeout = setTimeout(() => {
        console.error('[SCOPE DEBUG] Auth initialization timeout after 15 seconds')
        setAuthTimeout(true)
        toast({
          title: 'Authentication Issue',
          description: 'Authentication is taking longer than expected. Please refresh the page.',
          variant: 'destructive',
        })
      }, 15000) // 15 second timeout

      return () => clearTimeout(timeout)
    } else if (!isAuthLoading && authTimeout) {
      setAuthTimeout(false)
    }
  }, [isAuthLoading, authTimeout])

  useEffect(() => {
    // Handle auth loading state - don't clear scope when auth is still loading
    if (authState.isLoading) {
      // Keep existing scope state but mark as not ready
      useScopeStore.getState().setSnapshot(prev => ({
        ...prev,
        isReady: false,
        status: 'loading',
        error: null,
      }))
      return
    }

    // Clear scope state when user is definitively not authenticated
    if (!authState.isAuthenticated) {
      setMutationPending(false)
      setMutationError(null)
      setProjectScopeState({ projectId: null, source: null, reason: null, updatedAt: null, projectData: null })
      useScopeStore.getState().setSnapshot({
        userId: null,
        organizations: [],
        currentOrgId: null,
        currentDivisionId: null,
        currentProjectId: null,
        currentOrganization: null,
        currentDivision: null,
        status: 'idle',
        error: null,
        isReady: false,
        lastSyncedAt: null,
        projectScopeSource: null,
        projectScopeReason: null,
        projectScopeUpdatedAt: null,
        projectData: null,
        breadcrumbs: [],
      })
      return
    }

    // When auth is ready and user is authenticated, ensure scope store reflects ready state
    if (authState.isReady && authState.isAuthenticated) {
      useScopeStore.getState().setSnapshot(prev => ({
        ...prev,
        userId: authState.user?.id ?? null,
        isReady: true,
      }))
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.isReady, authState.user?.id])

  const combinedError = useMemo<ApiError | null>(() => {
    if (authTimeout) {
      return new Error('Authentication initialization timed out. Please refresh the page.') as ApiError
    }
    if (mutationError) {
      return mutationError
    }
    return queryStatus === 'error' ? queryError ?? null : null
  }, [authTimeout, mutationError, queryError, queryStatus])

  const status = useMemo<ScopeStatus>(() => {
    // When auth times out, mark scope as error
    if (authTimeout) {
      return 'error'
    }

    // When auth is loading, scope is also loading
    if (authState.isLoading) {
      return 'loading'
    }

    // When auth is ready but user is not authenticated, scope is idle
    if (authState.isReady && !authState.isAuthenticated) {
      return 'idle'
    }

    // When auth is ready and user is authenticated, check query status
    if (authState.isReady && authState.isAuthenticated) {
      if (queryStatus === 'pending' || isFetching) {
        return 'loading'
      }
      if (mutationPending) {
        return 'loading'
      }
      if (mutationError) {
        return 'error'
      }
      if (queryStatus === 'error') {
        return 'error'
      }
      if (queryStatus === 'success') {
        return 'ready'
      }
    }

    // Default fallback
    return 'idle'
  }, [authTimeout, authState.isLoading, authState.isReady, authState.isAuthenticated, isFetching, mutationError, mutationPending, queryStatus])

  const currentOrganization = useMemo(() => {
    if (!activeOrgId) return null
    return organizations.find((organization) => organization.id === activeOrgId) ?? null
  }, [activeOrgId, organizations])

  const currentDivision = useMemo(() => {
    if (!currentOrganization || !activeDivisionId) return null
    return currentOrganization.divisions.find((division) => division.id === activeDivisionId) ?? null
  }, [currentOrganization, activeDivisionId])

  
  
  // Generate breadcrumb navigation
  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(
      currentOrganization,
      currentDivision,
      projectScope.projectData,
      activeOrgId,
      activeDivisionId,
      projectScope.projectId
    )
  }, [currentOrganization, currentDivision, projectScope.projectData, activeOrgId, activeDivisionId, projectScope.projectId])

  // Enhanced project validation function with comprehensive auth checks
  const canSwitchToProject = useCallback((projectId: string) => {
    if (!projectId) {
      console.warn('[scope] canSwitchToProject: No project ID provided')
      return false
    }

    // Check if user is authenticated and auth is ready
    if (!authState.isAuthenticated || !authState.isReady) {
      console.warn('[scope] canSwitchToProject: User not authenticated or auth not ready', {
        isAuthenticated: authState.isAuthenticated,
        isReady: authState.isReady,
        isLoading: authState.isLoading
      })
      return false
    }

    // Check if user has basic scope access
    const currentOrg = scopeState?.organizations?.find((organization) => organization.id === activeOrgId)
    if (!currentOrg) {
      // Fallback to currentOrganization from context
      if (!currentOrganization) {
        console.warn('[scope] canSwitchToProject: No organization context available')
        return false
      }
      return true
    }

    if (!activeDivisionId) {
      // If no division is selected, user can access org-level projects
      return true
    }

    const currentDiv = currentOrg.divisions.find((division) => division.id === activeDivisionId)
    if (!currentDiv) {
      console.warn('[scope] canSwitchToProject: Division not found in organization', { activeDivisionId })
      return false
    }

    // Check if project exists and is accessible in current scope
    if (!scopeProjects) {
      console.warn('[scope] canSwitchToProject: No projects loaded for scope')
      return false
    }

    const project = scopeProjects.find((p) => p.id === projectId)
    if (!project) {
      console.warn('[scope] canSwitchToProject: Project not found in scope', { projectId })
      return false
    }

    // Additional validation: ensure project belongs to current org/division scope
    if (project.organizationId !== activeOrgId) {
      console.warn('[scope] canSwitchToProject: Project belongs to different organization', {
        projectId,
        projectOrgId: project.organizationId,
        currentOrgId: activeOrgId
      })
      return false
    }

    if (activeDivisionId && project.divisionId && project.divisionId !== activeDivisionId) {
      // If project has a specific division, it must match the current division
      console.warn('[scope] canSwitchToProject: Project belongs to different division', {
        projectId,
        projectDivId: project.divisionId,
        currentDivId: activeDivisionId
      })
      return false
    }

    console.log('[scope] canSwitchToProject: Access granted', { projectId, orgId: activeOrgId, divisionId: activeDivisionId })
    return true
  }, [activeDivisionId, activeOrgId, currentOrganization, scopeState?.organizations, scopeProjects, authState.isAuthenticated, authState.isReady])

  useEffect(() => {
    if (!routeIncludesProject) {
      return
    }

    setProjectScopeState((previous) => {
      if (previous.projectId === routeProjectId && previous.source === 'route') {
        return previous
      }

      return {
        projectId: routeProjectId,
        source: 'route',
        reason: routeProjectId ? 'route-param' : 'route-cleared',
        updatedAt: new Date().toISOString(),
        projectData: null, // Will be loaded separately
      }
    })
  }, [routeIncludesProject, routeProjectId])

  // Update project data when current project details are fetched
  useEffect(() => {
    if (currentProjectDetails && projectScope.projectId) {
      setProjectScopeState((previous) => {
        if (previous.projectData?.id === currentProjectDetails.project.id) {
          return previous
        }
        return {
          ...previous,
          projectData: currentProjectDetails.project,
          updatedAt: new Date().toISOString(),
        }
      })
    }
  }, [currentProjectDetails, projectScope.projectId])

  // Optimize scope store updates to prevent unnecessary re-renders
  useEffect(() => {
    useScopeStore.getState().setSnapshot({
      userId: scopeState?.userId ?? user?.id ?? null,
      organizations,
      currentOrgId: activeOrgId,
      currentDivisionId: activeDivisionId,
      currentProjectId: projectScope.projectId,
      currentOrganization,
      currentDivision,
      status,
      error: combinedError ? combinedError.message : null,
      isReady,
      lastSyncedAt: scopeState?.cachedAt ?? null,
      projectScopeSource: projectScope.source,
      projectScopeReason: projectScope.reason,
      projectScopeUpdatedAt: projectScope.updatedAt,
      projectData: projectScope.projectData,
      breadcrumbs,
    })
  }, [
    scopeState?.userId,
    scopeState?.cachedAt,
    user?.id,
    organizations,
    activeOrgId,
    activeDivisionId,
    currentOrganization,
    currentDivision,
    status,
    combinedError,
    isReady,
    projectScope.projectId,
    projectScope.reason,
    projectScope.source,
    projectScope.updatedAt,
  ])

  
  // Fixed route synchronization effect to handle direct URL access
  useEffect(() => {
    // Wait for auth to be ready before doing any route synchronization
    if (!authState.isReady) {
      return
    }

    // Don't do route sync if user is not authenticated
    if (!authState.isAuthenticated) {
      return
    }

    // Ensure scope is ready before proceeding
    if (!isReady) {
      return
    }

    if (pathname?.startsWith('/workspace-hub')) {
      return
    }

    const routeOrgId = normalizeParam(params?.orgId)
    const routeDivisionId = normalizeParam(params?.divisionId)
    const trailing = deriveTrailingPath(pathname)

    // If no org/division in route, navigate to active scope or workspace hub
    if (!routeOrgId) {
      if (scopeState?.active) {
        if (scopeState.active.divisionId) {
          router.replace(buildDivisionRoute(scopeState.active.orgId, scopeState.active.divisionId, trailing))
        } else {
          router.replace(buildOrgRoute(scopeState.active.orgId, trailing))
        }
      } else {
        router.replace('/workspace-hub')
      }
      return
    }

    // Check if route matches current active scope
    const routeMatchesActive =
      routeOrgId === scopeState?.active?.orgId &&
      (routeDivisionId ?? null) === (scopeState?.active?.divisionId ?? null)

    // If route matches active scope, no action needed
    if (routeMatchesActive) {
      return
    }

    // Find the requested organization
    const candidateOrg = organizations.find((organization) => organization.id === routeOrgId)
    if (!candidateOrg) {
      // Organization not found, navigate to active scope or workspace hub
      if (scopeState?.active) {
        if (scopeState.active.divisionId) {
          router.replace(buildDivisionRoute(scopeState.active.orgId, scopeState.active.divisionId, trailing))
        } else {
          router.replace(buildOrgRoute(scopeState.active.orgId, trailing))
        }
      } else {
        router.replace('/workspace-hub')
      }
      return
    }

    // Find the requested division (or use first available)
    const candidateDivision = routeDivisionId
      ? candidateOrg.divisions.find((division) => division.id === routeDivisionId) ?? null
      : candidateOrg.divisions[0] ?? null

    // Check if candidate scope would be the same as active scope (to prevent unnecessary updates)
    const candidateWouldMatchActive =
      candidateOrg.id === scopeState?.active?.orgId &&
      (candidateDivision?.id ?? null) === (scopeState?.active?.divisionId ?? null)

    if (candidateWouldMatchActive) {
      return
    }

    // Update scope to match the route
    void scopeMutexRef.current.runExclusive(async () => {
      const optimistic = buildOptimisticState(scopeState, candidateOrg.id, candidateDivision?.id ?? null)
      if (optimistic) {
        setScopeCache(optimistic)
      }
      setMutationPending(true)
      try {
        await mutateScope({
          orgId: candidateOrg.id,
          divisionId: candidateDivision?.id ?? null,
          reason: 'route-sync',
        })
        setMutationError(null)
      } catch (mutationError) {
        // Restore previous state on error
        if (scopeState) {
          setScopeCache(scopeState)
        }
        // Navigate to active scope or workspace hub on error
        if (scopeState?.active) {
          if (scopeState.active.divisionId) {
            router.replace(buildDivisionRoute(scopeState.active.orgId, scopeState.active.divisionId, trailing))
          } else {
            router.replace(buildOrgRoute(scopeState.active.orgId, trailing))
          }
        } else {
          router.replace('/workspace-hub')
        }
        if (mutationError instanceof Error) {
          const apiError = mutationError as ApiError
          setMutationError(apiError)
        }
      } finally {
        setMutationPending(false)
      }
    })
  }, [
    authState.isReady,
    authState.isAuthenticated,
    isReady,
    mutateScope,
    organizations,
    pathname,
    params?.orgId,
    params?.divisionId,
    router,
    scopeState,
    setScopeCache,
  ])

  const setScope = useCallback(
    async (orgId: string, divisionId?: string | null, options?: { reason?: string }) => {
      if (!authState.isAuthenticated || !authState.isReady) {
        console.warn('[scope] setScope: Cannot set scope - user not authenticated or auth not ready', {
          isAuthenticated: authState.isAuthenticated,
          isReady: authState.isReady,
          isLoading: authState.isLoading
        })
        return
      }
      const desiredDivision = divisionId ?? null
      const optimistic = buildOptimisticState(scopeState, orgId, desiredDivision)
      const reason = options?.reason ?? 'manual-selection'
      await scopeMutexRef.current.runExclusive(async () => {
        if (optimistic) {
          setScopeCache(optimistic)
        }
        setMutationPending(true)
        const previous = scopeState
        try {
          const response = await mutateScope({ orgId, divisionId: desiredDivision, reason })
          setMutationError(null)
          if (response.active?.divisionId) {
            router.replace(buildDivisionRoute(response.active.orgId, response.active.divisionId, deriveTrailingPath(pathname)))
          } else {
            router.replace(buildOrgRoute(response.active?.orgId ?? orgId, deriveTrailingPath(pathname)))
          }
        } catch (mutationError) {
          if (previous) {
            setScopeCache(previous)
          }
          if (mutationError instanceof Error) {
            const apiError = mutationError as ApiError
            setMutationError(apiError)
            toast({
              title: 'Scope switch failed',
              description: apiError.body?.detail ?? apiError.message,
              variant: 'destructive',
            })
          }
          throw mutationError
        } finally {
          setMutationPending(false)
        }
      })
    },
    [authState.isAuthenticated, authState.isReady, mutateScope, pathname, router, scopeState, setScopeCache]
  )

  const setDivision = useCallback(
    async (divisionId: string, options?: { reason?: string }) => {
      if (!activeOrgId) {
        return
      }
      await setScope(activeOrgId, divisionId, { reason: options?.reason ?? 'division-selection' })
    },
    [activeOrgId, setScope]
  )

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const setProjectScope = useCallback(
    (projectId: string | null, options?: { reason?: string; syncToRoute?: boolean; projectData?: ProjectSummary }) => {
      setProjectScopeState({
        projectId,
        source: 'manual',
        reason: options?.reason ?? 'manual-selection',
        updatedAt: new Date().toISOString(),
        projectData: options?.projectData ?? null,
      })

      if (options?.syncToRoute && projectId && activeOrgId && activeDivisionId) {
        const destination = buildProjectRoute(activeOrgId, activeDivisionId, projectId, 'board')
        router.replace(destination)
      }
    },
    [activeOrgId, activeDivisionId, router]
  )

  const clearProjectScope = useCallback((options?: { reason?: string }) => {
    setProjectScopeState({
      projectId: null,
      source: 'system',
      reason: options?.reason ?? 'adapter-reset',
      updatedAt: new Date().toISOString(),
      projectData: null,
    })
  }, [])

  // Enhanced project management functions
  const getAvailableProjects = useCallback((): ProjectSummary[] => {
    // Return real project data from the API
    return scopeProjects || []
  }, [scopeProjects])

  const switchToProject = useCallback(async (
    projectId: string,
    options?: { view?: string; reason?: string }
  ): Promise<boolean> => {
    // Enhanced validation with detailed logging
    if (!authState.isAuthenticated || !authState.isReady) {
      console.error('[scope] switchToProject: User not authenticated or auth not ready', {
        isAuthenticated: authState.isAuthenticated,
        isReady: authState.isReady,
        isLoading: authState.isLoading
      })
      toast({
        title: authState.isLoading ? 'Authentication Loading' : 'Authentication Required',
        description: authState.isLoading
          ? 'Please wait while authentication is being verified.'
          : 'Please sign in to access projects.',
        variant: 'destructive',
      })
      return false
    }

    if (!activeOrgId) {
      console.error('[scope] switchToProject: No organization selected')
      toast({
        title: 'Organization Required',
        description: 'Please select an organization first.',
        variant: 'destructive',
      })
      return false
    }

    if (!activeDivisionId) {
      console.error('[scope] switchToProject: No division selected')
      toast({
        title: 'Division Required',
        description: 'Please select a division first.',
        variant: 'destructive',
      })
      return false
    }

    if (!canSwitchToProject(projectId)) {
      console.error('[scope] switchToProject: Access denied to project', { projectId, orgId: activeOrgId, divisionId: activeDivisionId })
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project or it may not exist.',
        variant: 'destructive',
      })
      return false
    }

    if (projectId === projectScope.projectId) {
      console.log('[scope] switchToProject: Already on project', { projectId })
      return true // Already on this project
    }

    try {
      // Find the project data to pre-populate the scope
      const projectData = scopeProjects?.find(p => p.id === projectId)

      if (!projectData) {
        console.error('[scope] switchToProject: Project data not found', { projectId })
        toast({
          title: 'Project Not Found',
          description: 'The requested project could not be found.',
          variant: 'destructive',
        })
        return false
      }

      console.log('[scope] switchToProject: Switching to project', {
        projectId,
        projectName: projectData.name,
        orgId: activeOrgId,
        divisionId: activeDivisionId,
        view: options?.view
      })

      setProjectScope(projectId, {
        reason: options?.reason || 'manual-switch',
        syncToRoute: true,
        projectData: projectData,
      })

      // Navigate to the specified view or default to board
      const view = options?.view || 'board'
      const destination = buildProjectRoute(activeOrgId, activeDivisionId, projectId, view)
      router.push(destination)

      return true
    } catch (error) {
      console.error('[scope] switchToProject: Failed to switch to project', { projectId, error })
      toast({
        title: 'Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch to the selected project.',
        variant: 'destructive',
      })
      return false
    }
  }, [authState.isAuthenticated, authState.isReady, authState.isLoading, activeOrgId, activeDivisionId, canSwitchToProject, projectScope.projectId, setProjectScope, router, scopeProjects])

  const switchToProjectBySlug = useCallback(async (
    slug: string,
    options?: { view?: string; reason?: string }
  ): Promise<boolean> => {
    const availableProjects = getAvailableProjects()
    const normalizedSlug = sanitizeSlug(slug)
    const project = availableProjects.find((candidate) => computeProjectSlug(candidate) === normalizedSlug)

    if (!project) {
      toast({
        title: 'Project Not Found',
        description: `Project with slug "${slug}" was not found.`,
        variant: 'destructive',
      })
      return false
    }

    return await switchToProject(project.id, options)
  }, [getAvailableProjects, switchToProject])

  // Enhanced project navigation functions
  const navigateToProject = useCallback((projectId: string, view?: string, options?: { reason?: string }) => {
    if (!activeOrgId || !activeDivisionId) {
      toast({
        title: 'Scope Required',
        description: 'Please select an organization and division before navigating to a project.',
        variant: 'destructive',
      })
      return
    }

    if (!canSwitchToProject(projectId)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project.',
        variant: 'destructive',
      })
      return
    }

    // Find the project data to pre-populate the scope
    const projectData = scopeProjects?.find(p => p.id === projectId)

    setProjectScope(projectId, {
      reason: options?.reason || 'navigation',
      syncToRoute: true,
      projectData: projectData || undefined,
    })

    const destination = buildProjectRoute(activeOrgId, activeDivisionId, projectId, view || 'board')
    router.push(destination)
  }, [activeOrgId, activeDivisionId, canSwitchToProject, setProjectScope, router, scopeProjects])

  const exitProject = useCallback((targetPath?: string) => {
    clearProjectScope({ reason: 'project-exit' })

    if (activeOrgId && activeDivisionId) {
      const destination = targetPath || buildDivisionRoute(activeOrgId, activeDivisionId, '/dashboard')
      router.replace(destination)
    } else if (activeOrgId) {
      const destination = targetPath || buildOrgRoute(activeOrgId, '/dashboard')
      router.replace(destination)
    } else {
      router.replace('/workspace-hub')
    }
  }, [activeOrgId, activeDivisionId, clearProjectScope, router])

  // Project context support functions
  const getProjectHierarchy = useCallback(() => {
    return {
      org: currentOrganization,
      division: currentDivision,
      project: projectScope.projectData,
    }
  }, [currentOrganization, currentDivision, projectScope.projectData])

  const isProjectActive = useCallback((projectId: string) => {
    return projectScope.projectId === projectId
  }, [projectScope.projectId])

  const validateProjectScope = useCallback((projectId: string) => {
    if (!authState.isAuthenticated || !authState.isReady) {
      return {
        valid: false,
        reason: authState.isLoading
          ? 'Authentication is still loading - please wait'
          : 'Authentication required - please sign in'
      }
    }

    if (!projectId) {
      return { valid: false, reason: 'Project ID is required' }
    }

    if (!activeOrgId) {
      return { valid: false, reason: 'Organization context required - please select an organization' }
    }

    if (!activeDivisionId) {
      return { valid: false, reason: 'Division context required - please select a division' }
    }

    if (!currentOrganization) {
      return { valid: false, reason: 'Organization data not available' }
    }

    if (!scopeProjects || scopeProjects.length === 0) {
      return { valid: false, reason: 'No projects available in current scope' }
    }

    if (!canSwitchToProject(projectId)) {
      const project = scopeProjects.find(p => p.id === projectId)
      if (!project) {
        return { valid: false, reason: 'Project not found or not accessible in current scope' }
      }
      if (project.organizationId !== activeOrgId) {
        return { valid: false, reason: 'Project belongs to a different organization' }
      }
      if (activeDivisionId && project.divisionId && project.divisionId !== activeDivisionId) {
        return { valid: false, reason: 'Project belongs to a different division' }
      }
      return { valid: false, reason: 'Access denied to project - insufficient permissions' }
    }

    console.log('[scope] validateProjectScope: Project scope validation passed', {
      projectId,
      orgId: activeOrgId,
      divisionId: activeDivisionId
    })

    return { valid: true }
  }, [authState.isAuthenticated, authState.isReady, authState.isLoading, activeOrgId, activeDivisionId, currentOrganization, scopeProjects, canSwitchToProject])

  const value = useMemo<ScopeContextValue>(() => {
    // Always return a valid context value, even during authentication loading
    if (!authState.isReady) {
      // Return loading context when auth is not ready
      return {
        ...fallbackContext,
        status: 'loading',
        error: null,
      }
    }

    if (!authState.isAuthenticated) {
      return fallbackContext
    }

    return {
      organizations,
      currentOrganization,
      currentDivision,
      currentProject: projectScope.projectData,
      currentOrgId: activeOrgId,
      currentDivisionId: activeDivisionId,
      currentProjectId: projectScope.projectId,
      projectScopeSource: projectScope.source,
      projectScopeReason: projectScope.reason,
      projectScopeUpdatedAt: projectScope.updatedAt,
      status,
      error: combinedError,
      isReady,
      breadcrumbs,
      canSwitchToProject,
      getAvailableProjects,
      switchToProject,
      switchToProjectBySlug,
      setScope,
      setDivision,
      setProjectScope,
      clearProjectScope,
      refresh,
      navigateToProject,
      exitProject,
      getProjectHierarchy,
      isProjectActive,
      validateProjectScope,
    }
  }, [
    activeDivisionId,
    activeOrgId,
    currentDivision,
    currentOrganization,
    combinedError,
    authState.isAuthenticated,
    authState.isReady,
    authState.isLoading,
    isReady,
    organizations,
    refresh,
    projectScope.projectId,
    projectScope.reason,
    projectScope.source,
    projectScope.updatedAt,
    projectScope.projectData,
    breadcrumbs,
    canSwitchToProject,
    getAvailableProjects,
    switchToProject,
    switchToProjectBySlug,
    setDivision,
    setProjectScope,
    clearProjectScope,
    setScope,
    status,
    navigateToProject,
    exitProject,
    getProjectHierarchy,
    isProjectActive,
    validateProjectScope,
  ])

  // Ensure we never pass undefined to the provider
  const safeValue = value || fallbackContext

  return <ScopeContext.Provider value={safeValue}>{children}</ScopeContext.Provider>
}

export const useScope = () => {
  const context = useContext(ScopeContext)
  if (!context) {
    throw new Error('useScope must be used within a ScopeProvider')
  }
  return context
}
