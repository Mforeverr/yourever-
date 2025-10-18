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
import { buildDivisionRoute, buildOrgRoute } from '@/lib/routing'
import { toast } from '@/hooks/use-toast'
import type { WorkspaceDivision, WorkspaceOrganization } from '@/modules/auth/types'
import type { ScopeStatus } from '@/modules/scope/types'
import type { ScopeState } from '@/modules/scope/types'
import { useScopeStore } from '@/state/scope.store'

interface ScopeContextValue {
  organizations: WorkspaceOrganization[]
  currentOrganization: WorkspaceOrganization | null
  currentDivision: WorkspaceDivision | null
  currentOrgId: string | null
  currentDivisionId: string | null
  status: ScopeStatus
  error: ApiError | null
  isReady: boolean
  setScope: (orgId: string, divisionId?: string | null, options?: { reason?: string }) => Promise<void>
  setDivision: (divisionId: string, options?: { reason?: string }) => Promise<void>
  refresh: () => Promise<void>
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined)

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
  currentOrgId: null,
  currentDivisionId: null,
  status: 'idle',
  error: null,
  isReady: false,
  setScope: async () => {},
  setDivision: async () => {},
  refresh: async () => {},
}

const normalizeParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

const getDefaultDivision = (
  org: WorkspaceOrganization | undefined,
  prefDivisionId?: string,
): WorkspaceDivision | null => {
  if (!org) return null
  if (prefDivisionId) {
    const preferred = org.divisions.find((division) => division.id === prefDivisionId)
    if (preferred) return preferred
  }
  return org.divisions[0] ?? null
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
  const params = useParams<{ orgId?: string; divisionId?: string }>()
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

  useEffect(() => {
    if (!isAuthenticated) {
      setMutationPending(false)
      setMutationError(null)
      authStorage.clearActiveOrganizationId()
      authStorage.clearActiveDivisionId()
      useScopeStore.getState().setSnapshot({
        userId: null,
        organizations: [],
        currentOrgId: null,
        currentDivisionId: null,
        currentOrganization: null,
        currentDivision: null,
        status: 'idle',
        error: null,
        isReady: false,
        lastSyncedAt: null,
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
      currentOrganization,
      currentDivision,
      status,
      error: combinedError ? combinedError.message : null,
      isReady,
      lastSyncedAt: scopeState?.cachedAt ?? null,
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

  const value = useMemo<ScopeContextValue>(() => {
    // Always return a valid context value, even during authentication loading
    if (!isAuthenticated) {
      return fallbackContext
    }

    return {
      organizations,
      currentOrganization,
      currentDivision,
      currentOrgId: activeOrgId,
      currentDivisionId: activeDivisionId,
      status,
      error: combinedError,
      isReady,
      setScope,
      setDivision,
      refresh,
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
    setDivision,
    setScope,
    status,
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
