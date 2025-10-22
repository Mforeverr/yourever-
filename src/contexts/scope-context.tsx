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
import { authStorage } from '@/lib/auth-utils'
import { buildDivisionRoute, buildOrgRoute, buildProjectRoute } from '@/lib/routing'
import { toast } from '@/hooks/use-toast'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { WorkspaceDivision, WorkspaceOrganization } from '@/modules/auth/types'
import type { ScopeStatus } from '@/modules/scope/types'
import type { ScopeState } from '@/modules/scope/types'
import { useScopeStore } from '@/state/scope.store'
import type { ProjectScopeSource } from '@/state/scope.store'
import type { ProjectSummary } from '@/modules/projects/contracts'

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
  validateProjectScope: () => ({ valid: false, reason: 'Not authenticated' }),
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
  const { user, isAuthenticated } = useCurrentUser()
  const { data, status: queryStatus, error: queryError, refetch, isFetching, setScopeCache, mutateScope } = useScopeQuery({
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error && (error as ApiError).status === 401) {
        return false
      }
      return failureCount < 1
    },
  })
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

  useEffect(() => {
    if (!isAuthenticated) {
      setMutationPending(false)
      setMutationError(null)
      authStorage.clearActiveOrganizationId()
      authStorage.clearActiveDivisionId()
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
  }, [isAuthenticated])

  const scopeState = data ?? undefined
  const organizations = scopeState?.organizations ?? []
  const activeOrgId = scopeState?.active?.orgId ?? null
  const activeDivisionId = scopeState?.active?.divisionId ?? null
  const combinedError = useMemo<ApiError | null>(() => {
    if (mutationError) {
      return mutationError
    }
    return queryStatus === 'error' ? queryError ?? null : null
  }, [mutationError, queryError, queryStatus])

  const status = useMemo<ScopeStatus>(() => {
    if (!isAuthenticated) {
      return 'idle'
    }
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
    return 'idle'
  }, [isAuthenticated, isFetching, mutationError, mutationPending, queryStatus])

  const currentOrganization = useMemo(() => {
    if (!activeOrgId) return null
    return organizations.find((organization) => organization.id === activeOrgId) ?? null
  }, [activeOrgId, organizations])

  const currentDivision = useMemo(() => {
    if (!currentOrganization || !activeDivisionId) return null
    return currentOrganization.divisions.find((division) => division.id === activeDivisionId) ?? null
  }, [currentOrganization, activeDivisionId])

  const isReady = status === 'ready' && Boolean(scopeState?.active || organizations.length === 0)

  const rawRouteProjectId = normalizeParam(params?.projectId)
  const routeProjectId = rawRouteProjectId ?? null
  const routeIncludesProject = typeof rawRouteProjectId !== 'undefined'

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

  // Project validation function
  const canSwitchToProject = useCallback((projectId: string) => {
    // Get available projects from either live data or mock data
    const liveDataEnabled = isFeatureEnabled('workspace.liveData', process.env.NODE_ENV !== 'production')

    if (liveDataEnabled && scopeState?.organizations) {
      // Use live data when available
      const currentOrg = scopeState.organizations.find(org => org.id === activeOrgId)
      const currentDiv = currentOrg?.divisions.find(div => div.id === activeDivisionId)
      // For now, use a simple validation - this would be enhanced with actual project data
      return Boolean(currentOrg && currentDiv && projectId)
    }

    // Fallback validation - assume project access is valid if org and division are set
    return Boolean(currentOrganization && currentDivision && projectId)
  }, [currentOrganization, currentDivision, activeOrgId, activeDivisionId, scopeState])

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

  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      return
    }

    if (activeOrgId) {
      authStorage.setActiveOrganizationId(activeOrgId)
    } else {
      authStorage.clearActiveOrganizationId()
    }

    if (activeDivisionId) {
      authStorage.setActiveDivisionId(activeDivisionId)
    } else {
      authStorage.clearActiveDivisionId()
    }
  }, [isAuthenticated, isReady, activeOrgId, activeDivisionId])

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

  
  // Temporarily disabled to prevent infinite API calls during debugging
  // TODO: Re-enable after fixing the infinite loop issue
  /*
  useEffect(() => {
    if (!isAuthenticated || !isReady) {
      return
    }

    if (!scopeState?.active) {
      router.replace('/workspace-hub')
      return
    }

    const routeOrgId = normalizeParam(params?.orgId)
    const routeDivisionId = normalizeParam(params?.divisionId)
    const trailing = deriveTrailingPath(pathname)

    const navigateToActive = () => {
      if (!scopeState.active) {
        router.replace('/workspace-hub')
        return
      }
      if (scopeState.active.divisionId) {
        router.replace(buildDivisionRoute(scopeState.active.orgId, scopeState.active.divisionId, trailing))
      } else {
        router.replace(buildOrgRoute(scopeState.active.orgId, trailing))
      }
    }

    if (!routeOrgId) {
      navigateToActive()
      return
    }

    if (routeOrgId === scopeState.active.orgId && (routeDivisionId ?? null) === (scopeState.active.divisionId ?? null)) {
      return
    }

    const candidateOrg = organizations.find((organization) => organization.id === routeOrgId)
    if (!candidateOrg) {
      navigateToActive()
      return
    }

    const candidateDivision = routeDivisionId
      ? candidateOrg.divisions.find((division) => division.id === routeDivisionId) ?? null
      : candidateOrg.divisions[0] ?? null

    // Additional check to prevent unnecessary updates
    if (candidateOrg.id === scopeState.active.orgId &&
        (candidateDivision?.id ?? null) === (scopeState.active.divisionId ?? null)) {
      return
    }

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
          if (scopeState) {
            setScopeCache(scopeState)
          }
          navigateToActive()
          if (mutationError instanceof Error) {
            const apiError = mutationError as ApiError
            setMutationError(apiError)
          }
        } finally {
          setMutationPending(false)
        }
      })
  }, [
    isAuthenticated,
    isReady,
    mutateScope,
    organizations,
    routeOrgId,
    routeDivisionId,
    trailing,
    router,
    scopeState?.active?.orgId,
    scopeState?.active?.divisionId,
    setScopeCache,
  ])
  */

  const setScope = useCallback(
    async (orgId: string, divisionId?: string | null, options?: { reason?: string }) => {
      if (!isAuthenticated) return
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
    [isAuthenticated, mutateScope, pathname, router, scopeState, setScopeCache]
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
    // For now, return empty array. This would be populated with actual project data
    // from the API in a real implementation
    return []
  }, [])

  const switchToProject = useCallback(async (
    projectId: string,
    options?: { view?: string; reason?: string }
  ): Promise<boolean> => {
    if (!activeOrgId || !activeDivisionId) {
      toast({
        title: 'Scope Required',
        description: 'Please select an organization and division first.',
        variant: 'destructive',
      })
      return false
    }

    if (!canSwitchToProject(projectId)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project.',
        variant: 'destructive',
      })
      return false
    }

    if (projectId === projectScope.projectId) {
      return true // Already on this project
    }

    try {
      setProjectScope(projectId, {
        reason: options?.reason || 'manual-switch',
        syncToRoute: true,
      })

      // Navigate to the specified view or default to board
      const view = options?.view || 'board'
      const destination = buildProjectRoute(activeOrgId, activeDivisionId, projectId, view)
      router.push(destination)

      return true
    } catch (error) {
      console.error('Failed to switch to project:', error)
      toast({
        title: 'Switch Failed',
        description: 'Failed to switch to the selected project.',
        variant: 'destructive',
      })
      return false
    }
  }, [activeOrgId, activeDivisionId, canSwitchToProject, projectScope.projectId, setProjectScope, router])

  const switchToProjectBySlug = useCallback(async (
    slug: string,
    options?: { view?: string; reason?: string }
  ): Promise<boolean> => {
    const availableProjects = getAvailableProjects()
    const project = availableProjects.find(p => p.slug === slug)

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

    setProjectScope(projectId, {
      reason: options?.reason || 'navigation',
      syncToRoute: true,
    })

    const destination = buildProjectRoute(activeOrgId, activeDivisionId, projectId, view || 'board')
    router.push(destination)
  }, [activeOrgId, activeDivisionId, canSwitchToProject, setProjectScope, router])

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
    if (!isAuthenticated) {
      return { valid: false, reason: 'Not authenticated' }
    }

    if (!activeOrgId) {
      return { valid: false, reason: 'No organization selected' }
    }

    if (!activeDivisionId) {
      return { valid: false, reason: 'No division selected' }
    }

    if (!canSwitchToProject(projectId)) {
      return { valid: false, reason: 'Access denied to project' }
    }

    return { valid: true }
  }, [isAuthenticated, activeOrgId, activeDivisionId, canSwitchToProject])

  const value = useMemo<ScopeContextValue>(() => {
    // Always return a valid context value, even during authentication loading
    if (!isAuthenticated) {
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
    isAuthenticated,
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
