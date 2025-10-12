'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getDevUser, mockUsers } from '@/lib/mock-users'
import { authStorage, type StoredOnboardingStatus } from '@/lib/auth-utils'
import { localStorageService, sessionStorageService } from "@/lib/storage"
import { defaultOnboardingStatus, ONBOARDING_STEPS, type OnboardingStepId } from '@/lib/onboarding'
import { createSupabaseAuthGateway, type SupabaseAuthGateway } from '@/modules/auth/supabase-gateway'
import { clearAuthTokenResolver, setAuthTokenResolver } from '@/lib/api/client'
import type { WorkspaceUser } from '@/modules/auth/types'
import { loadWorkspaceUser } from '@/modules/auth/user-loader'
import { fetchOrCreateOnboardingSession } from '@/modules/onboarding/session'
import { useOnboardingStore } from '@/state/onboarding.store'

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
}

export type AuthStrategy = 'mock' | 'supabase'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [strategy, setStrategy] = useState<AuthStrategy>('mock')
  const [onboardingStatus, setOnboardingStatus] = useState<StoredOnboardingStatus | null>(null)
  const userIdRef = React.useRef<string | null>(null)
  const strategyRef = React.useRef<AuthStrategy>('mock')
  const supabaseSessionRef = React.useRef<Session | null>(null)
  const isDevMode = process.env.NODE_ENV === 'development'
  const supabaseGatewayRef = React.useRef<SupabaseAuthGateway | null>(null)

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
    []
  )

  const clearUserState = useCallback(() => {
    setUser(null)
    setOnboardingStatus(null)
    authStorage.clearAll()
    localStorageService.clearByPrefix("yourever-")
    sessionStorageService.clearByPrefix("yourever-")
    userIdRef.current = null
    supabaseSessionRef.current = null
    useOnboardingStore.getState().reset()
  }, [])

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
    },
    [clearUserState, loadOnboardingStatus]
  )

  const handleSupabaseSession = useCallback(
    async (session: Session | null) => {
      supabaseSessionRef.current = session

      if (!session?.user?.id) {
        clearUserState()
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const workspaceUser = await loadWorkspaceUser(session)
        if (workspaceUser) {
          applyUser(workspaceUser)
        } else {
          clearUserState()
        }
      } catch (error) {
        console.error('[auth] failed to process Supabase session', error)
        clearUserState()
      } finally {
        setIsLoading(false)
      }
    },
    [applyUser, clearUserState]
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
          if (isMounted) {
            setIsLoading(false)
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
        setIsLoading(false)
        return
      }

      const storedUserId = authStorage.getUserId()
      if (storedUserId) {
        const storedUser = mockUsers.find((candidate) => candidate.id === storedUserId) ?? null
        applyUser(storedUser ?? null)
      }

      setIsLoading(false)
    }

    void initAuth()
    return () => {
      isMounted = false
      if (cleanup) {
        cleanup()
      }
    }
  }, [applyUser, handleSupabaseSession, isDevMode])

  const performLogin = useCallback(async (email: string) => {
    const foundUser = mockUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase())

    if (foundUser) {
      applyUser(foundUser)
      return true
    }

    return false
  }, [applyUser])

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
    [handleSupabaseSession, performLogin]
  )

  const logout = useCallback(() => {
    const supabaseGateway = supabaseGatewayRef.current
    if (supabaseGateway) {
      void supabaseGateway.signOut()
    }
    clearUserState()
  }, [clearUserState])

  const getAccessToken = useCallback(async () => {
    const supabaseGateway = supabaseGatewayRef.current
    if (!supabaseGateway) return null
    return supabaseGateway.getAccessToken()
  }, [])

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
    } else {
      clearAuthTokenResolver()
    }
  }, [strategy])

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
    []
  )

  const markOnboardingComplete = useCallback(() => {
    updateOnboardingStatus((current) => {
      const allStepIds = ONBOARDING_STEPS.map((step) => step.id) as OnboardingStepId[]
      const filteredSkipped = current.skippedSteps.filter((id) =>
        allStepIds.includes(id as OnboardingStepId)
      )
      return {
        ...current,
        completed: true,
        completedSteps: allStepIds,
        skippedSteps: filteredSkipped,
        lastStep: allStepIds[allStepIds.length - 1]
      }
    })
  }, [updateOnboardingStatus])


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
        markOnboardingComplete
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
