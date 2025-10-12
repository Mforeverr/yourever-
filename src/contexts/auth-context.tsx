'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { getDevUser, mockUsers } from '@/lib/mock-users'
import { authStorage, type StoredOnboardingStatus } from '@/lib/auth-utils'
import { localStorageService, sessionStorageService } from '@/lib/storage'
import { defaultOnboardingStatus, ONBOARDING_STEPS, type OnboardingStepId } from '@/lib/onboarding'
import { createSupabaseAuthGateway, type SupabaseAuthGateway } from '@/modules/auth/supabase-gateway'
import { clearAuthTokenResolver, setAuthTokenResolver } from '@/lib/api/client'
import type { WorkspaceUser } from '@/modules/auth/types'
import { fetchOrCreateOnboardingSession } from '@/modules/onboarding/session'
import { useOnboardingStore } from '@/state/onboarding.store'
import { ApiError } from '@/lib/api/http'
import {
  CURRENT_USER_QUERY_KEY,
  useCurrentUserQuery,
} from '@/hooks/api/use-current-user-query'

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
  const userIdRef = React.useRef<string | null>(null)
  const strategyRef = React.useRef<AuthStrategy>('mock')
  const supabaseSessionRef = React.useRef<Session | null>(null)
  const isMountedRef = React.useRef(true)
  const supabaseGatewayRef = React.useRef<SupabaseAuthGateway | null>(null)
  const isDevMode = process.env.NODE_ENV === 'development'
  const queryClient = useQueryClient()

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

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

      if (mode === 'supabase') {
        if (!session) {
          const fallback = defaultOnboardingStatus()
          setOnboardingStatus(fallback)
          authStorage.setOnboardingStatus(userId, fallback)
          useOnboardingStore.getState().hydrateFromStatus(fallback)
          return
        }

        const onboardingSession = await fetchOrCreateOnboardingSession(session.access_token)
        const status = onboardingSession?.status ?? defaultOnboardingStatus()
        setOnboardingStatus(status)
        authStorage.setOnboardingStatus(userId, status)
        useOnboardingStore.getState().hydrateFromStatus(status)
        return
      }

      const storedStatus = authStorage.getOnboardingStatus(userId)
      const status = storedStatus ?? defaultOnboardingStatus()
      setOnboardingStatus(status)
      useOnboardingStore.getState().hydrateFromStatus(status)
    },
    [],
  )

  const clearUserState = useCallback(() => {
    setUser(null)
    setOnboardingStatus(null)
    authStorage.clearAll()
    localStorageService.clearByPrefix('yourever-')
    sessionStorageService.clearByPrefix('yourever-')
    userIdRef.current = null
    supabaseSessionRef.current = null
    useOnboardingStore.getState().reset()
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY })
    setMockLoading(false)
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
        const userId = userIdRef.current
        if (userId) {
          authStorage.setOnboardingStatus(userId, next)
        }
        return next
      })
    },
    [],
  )

  const markOnboardingComplete = useCallback(() => {
    updateOnboardingStatus((current) => {
      const allStepIds = ONBOARDING_STEPS.map((step) => step.id) as OnboardingStepId[]
      const filteredSkipped = current.skippedSteps.filter((id) =>
        allStepIds.includes(id as OnboardingStepId),
      )
      return {
        ...current,
        completed: true,
        completedSteps: allStepIds,
        skippedSteps: filteredSkipped,
        lastStep: allStepIds[allStepIds.length - 1],
      }
    })
  }, [updateOnboardingStatus])

  const isSupabaseLoading =
    strategy === 'supabase' && (isCheckingSession || (shouldFetchUser && (userStatus === 'pending' || isFetching)))
  const isLoading = strategy === 'supabase' ? isSupabaseLoading : mockLoading

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
