'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { getDevUser, mockUsers } from '@/lib/mock-users'
import { authStorage, type StoredOnboardingStatus } from '@/lib/auth-utils'
import { localStorageService, sessionStorageService } from '@/lib/storage'
import { useOnboardingManifest } from '@/hooks/use-onboarding-manifest'
import {
  defaultOnboardingStatus,
  getFirstIncompleteStep,
  type OnboardingStepId,
  isLegacyOnboardingStatus,
} from '@/lib/onboarding'
import {
  CURRENT_ONBOARDING_STATUS_VERSION,
  coerceOnboardingStatusVersion,
} from '@/lib/onboarding-version'
import { createSupabaseAuthGateway, type SupabaseAuthGateway } from '@/modules/auth/supabase-gateway'
import { clearAuthTokenResolver, setAuthTokenResolver } from '@/lib/api/client'
import type { WorkspaceUser } from '@/modules/auth/types'
import { fetchOrCreateOnboardingSession, persistOnboardingStatus } from '@/modules/onboarding/session'
import { useOnboardingStore } from '@/state/onboarding.store'
import { ApiError } from '@/lib/api/http'
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUserQuery,
} from '@/hooks/api/use-current-user-query'
import { clearUnauthorizedHandler, setUnauthorizedHandler } from '@/lib/api/unauthorized-handler'
import { toast } from '@/hooks/use-toast'
import {
  trackOnboardingResume,
  trackOnboardingSaveFailed,
  trackOnboardingSaveStarted,
  trackOnboardingSaveSucceeded,
} from '@/lib/telemetry/onboarding'

interface AuthContextValue {
  user: WorkspaceUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isDevMode: boolean
  strategy: AuthStrategy
  getAccessToken: () => Promise<string | null>
  onboardingStatus: StoredOnboardingStatus | null
  updateOnboardingStatus: (updater: (current: StoredOnboardingStatus) => StoredOnboardingStatus) => void
  markOnboardingComplete: () => void
  onboardingFeatureFlags: Record<string, boolean>
  isOnboardingFeatureEnabled: (flag: string) => boolean
  userStatus: ReturnType<typeof useCurrentUserQuery>['status']
  userError: ReturnType<typeof useCurrentUserQuery>['error']
  refetchUser: () => Promise<void>
}

export type AuthStrategy = 'mock' | 'supabase'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(null)
  const [strategy, setStrategy] = useState<AuthStrategy>('mock')
  const [onboardingStatus, setOnboardingStatus] = useState<StoredOnboardingStatus | null>(null)
  const [mockLoading, setMockLoading] = useState(true)
  const [isCheckingSession, setIsCheckingSession] = useState(false)
  const [shouldFetchUser, setShouldFetchUser] = useState(false)
  const [onboardingFeatureFlags, setOnboardingFeatureFlags] = useState<Record<string, boolean>>({})
  const userIdRef = React.useRef<string | null>(null)
  const strategyRef = React.useRef<AuthStrategy>('mock')
  const supabaseSessionRef = React.useRef<Session | null>(null)
  const isMountedRef = React.useRef(true)
  const supabaseGatewayRef = React.useRef<SupabaseAuthGateway | null>(null)
  const onboardingStatusRef = React.useRef<StoredOnboardingStatus | null>(null)
  const appliedFeatureFlagsRef = React.useRef<Record<string, boolean>>({})
  const legacyResetVersionRef = React.useRef<number | null>(null)
  const isDevMode = process.env.NODE_ENV === 'development'
  const queryClient = useQueryClient()
  const router = useRouter()
  const { manifest, steps: manifestSteps } = useOnboardingManifest()

  const allStepIds = useMemo(
    () => manifestSteps.map((step) => step.id as OnboardingStepId),
    [manifestSteps],
  )

  const featureFlagsEqual = useCallback((a: Record<string, boolean>, b: Record<string, boolean>) => {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) {
      return false
    }

    return aKeys.every((key) => a[key] === b[key])
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const nextFlags: Record<string, boolean> = {}

    if (featureFlagsEqual(appliedFeatureFlagsRef.current, nextFlags)) {
      if (!featureFlagsEqual(onboardingFeatureFlags, nextFlags)) {
        setOnboardingFeatureFlags(nextFlags)
      }
      return
    }

    appliedFeatureFlagsRef.current = { ...nextFlags }
    setOnboardingFeatureFlags(nextFlags)
    useOnboardingStore.getState().setFeatureFlags(nextFlags)
  }, [featureFlagsEqual, onboardingFeatureFlags])

  const {
    data: fetchedUser,
    status: userStatus,
    error: userError,
    isFetching,
    refetchUser,
  } = useCurrentUserQuery({
    enabled: strategy === 'supabase' && shouldFetchUser,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) {
        return false
      }
      return failureCount < 1
    },
  })

  const loadOnboardingStatus = useCallback(
    async (userId: string, mode: AuthStrategy, session: Session | null) => {
      userIdRef.current = userId

      type ResumeSource = Parameters<typeof trackOnboardingResume>[0]['source']
      type ResumeReason = Parameters<typeof trackOnboardingResume>[0]['reason']

      const applyStatus = (status: StoredOnboardingStatus) => {
        setOnboardingStatus(status)
        onboardingStatusRef.current = status
        authStorage.setOnboardingStatus(userId, status)
        useOnboardingStore.getState().hydrateFromStatus(status)
      }

      const emitResume = (
        status: StoredOnboardingStatus,
        source: ResumeSource,
        details?: {
          reason?: ResumeReason
          sessionStartedAt?: string | null
          sessionCompletedAt?: string | null
        },
      ) => {
        trackOnboardingResume({
          status,
          source,
          mode,
          reason: details?.reason,
          sessionStartedAt: details?.sessionStartedAt,
          sessionCompletedAt: details?.sessionCompletedAt,
        })
      }

      const resetForNewVersion = async (
        baseline?: StoredOnboardingStatus | null,
        previousVersion?: number,
      ): Promise<StoredOnboardingStatus> => {
        const resetStatus: StoredOnboardingStatus = {
          ...defaultOnboardingStatus(),
          revision: baseline?.revision ?? null,
        }
        useOnboardingStore.getState().reset()
        if (legacyResetVersionRef.current !== previousVersion) {
          toast({
            title: 'Onboarding refreshed',
            description: 'We updated the onboarding flow with new questions. Please review your details and continue.',
          })
          legacyResetVersionRef.current = previousVersion ?? null
        }

        if (mode === 'supabase' && session?.access_token) {
          const fallbackStep = (resetStatus.lastStep ?? 'profile') as OnboardingStepId
          trackOnboardingSaveStarted({
            status: resetStatus,
            stepId: fallbackStep,
            intent: 'version-reset',
          })
          try {
            await persistOnboardingStatus(session.access_token, resetStatus)
            trackOnboardingSaveSucceeded({
              status: resetStatus,
              stepId: fallbackStep,
              intent: 'version-reset',
            })
          } catch (error) {
            trackOnboardingSaveFailed({
              status: resetStatus,
              stepId: fallbackStep,
              intent: 'version-reset',
              errorName: error instanceof Error ? error.name : undefined,
              errorMessage: error instanceof Error ? error.message : undefined,
              errorStatus: error instanceof ApiError ? error.status : null,
            })
            console.error('[auth] failed to persist onboarding reset', error)
          }
        }

        return resetStatus
      }

      if (mode === 'supabase') {
        if (!session) {
          const fallback = defaultOnboardingStatus()
          applyStatus(fallback)
          emitResume(fallback, 'remote-default', { reason: 'seed' })
          return
        }

        const onboardingSession = await fetchOrCreateOnboardingSession(session.access_token)
        const sessionStatus = onboardingSession?.status ?? defaultOnboardingStatus()
        const requiresReset = isLegacyOnboardingStatus(sessionStatus)
        const nextStatus = requiresReset
          ? await resetForNewVersion(sessionStatus, coerceOnboardingStatusVersion(sessionStatus.version))
          : sessionStatus
        applyStatus(nextStatus)
        emitResume(nextStatus, onboardingSession ? 'remote-session' : 'remote-default', {
          reason: requiresReset ? 'version-reset' : onboardingSession ? 'resume' : 'seed',
          sessionStartedAt: onboardingSession?.startedAt ?? null,
          sessionCompletedAt: onboardingSession?.completedAt ?? null,
        })
        return
      }

      const storedStatus = authStorage.getOnboardingStatus(userId)
      const requiresReset = isLegacyOnboardingStatus(storedStatus)
      const nextStatus = requiresReset
        ? await resetForNewVersion(storedStatus, coerceOnboardingStatusVersion(storedStatus?.version))
        : storedStatus
      const finalStatus = nextStatus ?? defaultOnboardingStatus()
      applyStatus(finalStatus)
      emitResume(finalStatus, storedStatus ? 'local-cache' : 'local-default', {
        reason: requiresReset ? 'version-reset' : storedStatus ? 'resume' : 'seed',
      })
    },
    [],
  )

  const clearUserState = useCallback(() => {
    setUser(null)
    setOnboardingStatus(null)
    onboardingStatusRef.current = null
    authStorage.clearAll()
    localStorageService.clearByPrefix('yourever-')
    sessionStorageService.clearByPrefix('yourever-')
    userIdRef.current = null
    supabaseSessionRef.current = null
    useOnboardingStore.getState().setFeatureFlags({})
    useOnboardingStore.getState().reset()
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    setMockLoading(false)
    legacyResetVersionRef.current = null
    setOnboardingFeatureFlags({})
    appliedFeatureFlagsRef.current = {}
  }, [queryClient])

  const applyUser = useCallback(
    (candidate: WorkspaceUser | null) => {
      if (!candidate) {
        clearUserState()
        return
      }

      setUser(candidate)
      authStorage.setUserId(candidate.id)
      authStorage.clearActiveDivisionId()

      if (!authStorage.getActiveOrganizationId() && candidate.organizations.length > 0) {
        authStorage.setActiveOrganizationId(candidate.organizations[0].id)
      }

      void loadOnboardingStatus(candidate.id, strategyRef.current, supabaseSessionRef.current)

      if (strategyRef.current === 'mock') {
        setMockLoading(false)
      }
    },
    [clearUserState, loadOnboardingStatus],
  )

  const handleSupabaseSession = useCallback(
    async (session: Session | null) => {
      if (!isMountedRef.current) return

      setIsCheckingSession(true)
      supabaseSessionRef.current = session

      if (!session?.user?.id) {
        setShouldFetchUser(false)
        clearUserState()
        if (isMountedRef.current) {
          setIsCheckingSession(false)
        }
        return
      }

      setShouldFetchUser(true)

      try {
        await refetchUser()
      } finally {
        if (isMountedRef.current) {
          setIsCheckingSession(false)
        }
      }
    },
    [clearUserState, refetchUser],
  )

  useEffect(() => {
    let isMounted = true
    let cleanup: (() => void) | undefined

    const initAuth = async () => {
      const supabaseGateway = createSupabaseAuthGateway()
      supabaseGatewayRef.current = supabaseGateway

      if (supabaseGateway) {
        setStrategy('supabase')
        strategyRef.current = 'supabase'

        try {
          const session = await supabaseGateway.getSession()
          if (isMounted) {
            await handleSupabaseSession(session)
          }
        } catch (error) {
          console.error('[auth] failed to initialize Supabase session', error)
          if (isMountedRef.current) {
            setIsCheckingSession(false)
          }
        }

        cleanup = supabaseGateway.onAuthStateChange((session) => {
          strategyRef.current = 'supabase'
          void handleSupabaseSession(session)
        })
        return
      }

      setStrategy('mock')
      strategyRef.current = 'mock'

      if (isDevMode) {
        const devUser = getDevUser()
        applyUser(devUser)
        return
      }

      const storedUserId = authStorage.getUserId()
      if (storedUserId) {
        const storedUser = mockUsers.find((candidate) => candidate.id === storedUserId) ?? null
        applyUser(storedUser ?? null)
      } else {
        setMockLoading(false)
      }
    }

    void initAuth()
    return () => {
      isMounted = false
      if (cleanup) {
        cleanup()
      }
    }
  }, [applyUser, handleSupabaseSession, isDevMode])

  useEffect(() => {
    if (strategy === 'supabase') {
      setAuthTokenResolver(async () => {
        const supabaseGateway = supabaseGatewayRef.current
        if (!supabaseGateway) return null
        return supabaseGateway.getAccessToken()
      })
      return () => {
        clearAuthTokenResolver()
      }
    }

    clearAuthTokenResolver()
    return () => {}
  }, [strategy])

  useEffect(() => {
    if (strategy !== 'supabase') return
    if (userStatus !== 'success') return

    if (fetchedUser) {
      applyUser(fetchedUser)
      return
    }

    setShouldFetchUser(false)
    clearUserState()
  }, [applyUser, clearUserState, fetchedUser, strategy, userStatus])

  useEffect(() => {
    if (strategy !== 'supabase') return
    if (!userError) return

    if (userError instanceof ApiError && userError.status === 401) {
      setShouldFetchUser(false)
      clearUserState()
      const gateway = supabaseGatewayRef.current
      if (gateway) {
        void gateway.signOut()
      }
      return
    }

    console.error('[auth] failed to load current user', userError)
  }, [clearUserState, strategy, userError])

  const performLogin = useCallback(
    async (email: string) => {
      const foundUser = mockUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase())

      if (foundUser) {
        applyUser(foundUser)
        return true
      }

      return false
    },
    [applyUser],
  )

  const supabaseLogin = useCallback(
    async (email: string, password: string) => {
      const supabaseGateway = supabaseGatewayRef.current
      if (!supabaseGateway) return performLogin(email)

      const session = await supabaseGateway.signInWithPassword(email, password)
      if (!session) {
        return false
      }

      await handleSupabaseSession(session)
      return true
    },
    [handleSupabaseSession, performLogin],
  )

  const logout = useCallback(() => {
    const supabaseGateway = supabaseGatewayRef.current
    if (supabaseGateway) {
      void supabaseGateway.signOut()
    }
    setShouldFetchUser(false)
    clearUserState()
  }, [clearUserState])

  const getAccessToken = useCallback(async () => {
    const supabaseGateway = supabaseGatewayRef.current
    if (!supabaseGateway) return null
    return supabaseGateway.getAccessToken()
  }, [])

  const updateOnboardingStatus = useCallback(
    (updater: (current: StoredOnboardingStatus) => StoredOnboardingStatus) => {
      setOnboardingStatus((prev) => {
        const base = prev ?? defaultOnboardingStatus()
        const next = updater(base)
        const normalized = {
          ...next,
          version: CURRENT_ONBOARDING_STATUS_VERSION,
        }
        onboardingStatusRef.current = normalized
        const userId = userIdRef.current
        if (userId) {
          authStorage.setOnboardingStatus(userId, normalized)
        }
        return normalized
      })
    },
    [],
  )

  const markOnboardingComplete = useCallback(() => {
    updateOnboardingStatus((current) => {
      if (allStepIds.length === 0) {
        return {
          ...current,
          version: CURRENT_ONBOARDING_STATUS_VERSION,
          completed: true,
          completedSteps: current.completedSteps,
          skippedSteps: current.skippedSteps,
          lastStep: undefined,
        }
      }
      const filteredSkipped = current.skippedSteps.filter((id) =>
        allStepIds.includes(id as OnboardingStepId),
      )
      return {
        ...current,
        version: CURRENT_ONBOARDING_STATUS_VERSION,
        completed: true,
        completedSteps: allStepIds,
        skippedSteps: filteredSkipped,
        lastStep: allStepIds[allStepIds.length - 1],
      }
    })
    authStorage.clearWorkspaceWelcomeSeen()
  }, [allStepIds, updateOnboardingStatus])

  const isSupabaseLoading =
    strategy === 'supabase' && (isCheckingSession || (shouldFetchUser && (userStatus === 'pending' || isFetching)))
  const isLoading = strategy === 'supabase' ? isSupabaseLoading : mockLoading

  const isOnboardingFeatureEnabled = useCallback(
    (flag: string) => {
      if (flag in onboardingFeatureFlags) {
        return onboardingFeatureFlags[flag]
      }
      return useOnboardingStore.getState().isFeatureEnabled(flag)
    },
    [onboardingFeatureFlags],
  )

  useEffect(() => {
    if (onboardingStatus) {
      onboardingStatusRef.current = onboardingStatus
    }
  }, [onboardingStatus])

  useEffect(() => {
    const unauthorizedHandler = () => {
      setShouldFetchUser(false)
      const snapshot = onboardingStatusRef.current ?? defaultOnboardingStatus()
      const fallbackStep = manifestSteps[0]
      const nextStep = getFirstIncompleteStep(snapshot, manifestSteps) ?? fallbackStep
      clearUserState()
      const gateway = supabaseGatewayRef.current
      if (gateway) {
        void gateway.signOut()
      }
      if (typeof window !== 'undefined') {
        const redirectPath = nextStep?.path ?? '/workspace-hub'
        const loginUrl = new URL('/login', window.location.origin)
        loginUrl.searchParams.set('redirect', redirectPath)
        router.replace(`${loginUrl.pathname}${loginUrl.search}`)
      }
    }

    setUnauthorizedHandler(unauthorizedHandler)
    return () => {
      clearUnauthorizedHandler()
    }
  }, [clearUserState, manifestSteps, router])

  return (
    <AuthContext.Provider
      value={{
        user,
        login: async (email: string, password: string) => {
          if (strategy === 'supabase') {
            return supabaseLogin(email, password)
          }
          return performLogin(email)
        },
        logout,
        isLoading,
        isDevMode,
        strategy,
        getAccessToken,
        onboardingStatus,
        updateOnboardingStatus,
        markOnboardingComplete,
        onboardingFeatureFlags,
        isOnboardingFeatureEnabled,
        userStatus,
        userError,
        refetchUser,
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
