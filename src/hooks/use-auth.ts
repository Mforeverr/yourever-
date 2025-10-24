'use client'

import { useAuth } from '@/contexts/auth-context'

export const useCurrentUser = () => {
  const {
    user,
    onboardingStatus,
    updateOnboardingStatus,
    markOnboardingComplete,
    userStatus,
    userError,
    refetchUser,
    sessionInitialized,
    ...auth
  } = useAuth()

  return {
    user,
    status: userStatus,
    userStatus,
    error: userError,
    refetchUser,
    isAuthenticated: !!user,
    isDevUser: user?.email === 'dev@yourever.com',
    sessionInitialized,
    canAccessOrg: (orgId: string) => user?.organizations.some((org) => org.id === orgId) ?? false,
    canAccessDivision: (orgId: string, divisionId: string) => {
      const org = user?.organizations.find((candidate) => candidate.id === orgId)
      return org?.divisions.some((division) => division.id === divisionId) ?? false
    },
    onboardingStatus,
    updateOnboardingStatus,
    markOnboardingComplete,
    ...auth
  }
}
