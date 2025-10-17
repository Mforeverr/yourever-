'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'
import type { Organization, Division } from '@/hooks/use-organizations'
import { useScopeStore } from "@/state/scope.store"

interface ScopeContextValue {
  organizations: Organization[]
  currentOrganization: Organization | null
  currentDivision: Division | null
  currentOrgId: string | null
  currentDivisionId: string | null
  setScope: (orgId: string, divisionId?: string) => void
  setDivision: (divisionId: string) => void
  isReady: boolean
}

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined)

const fallbackScope: ScopeContextValue = {
  organizations: [],
  currentOrganization: null,
  currentDivision: null,
  currentOrgId: null,
  currentDivisionId: null,
  setScope: () => {},
  setDivision: () => {},
  isReady: false
}

const getDefaultDivision = (org: Organization | undefined, prefDivisionId?: string) => {
  if (!org) return null
  if (prefDivisionId) {
    const preferred = org.divisions.find((division) => division.id === prefDivisionId)
    if (preferred) return preferred
  }
  return org.divisions[0] ?? null
}

const normalizeParam = (param: string | string[] | undefined): string | undefined => {
  if (Array.isArray(param)) {
    return param[0]
  }
  return param
}

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()
  const params = useParams<{ orgId?: string; divisionId?: string }>()

  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [currentDivisionId, setCurrentDivisionId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      setCurrentOrgId(null)
      setCurrentDivisionId(null)
      setIsReady(true)
      authStorage.clearActiveOrganizationId()
      authStorage.clearActiveDivisionId()
      return
    }

    const routeOrgId = normalizeParam(params?.orgId)
    const routeDivisionId = normalizeParam(params?.divisionId)

    const storedOrgId = authStorage.getActiveOrganizationId()
    let organization = routeOrgId
      ? user.organizations.find((org) => org.id === routeOrgId)
      : undefined

    if (!organization && storedOrgId) {
      organization = user.organizations.find((org) => org.id === storedOrgId)
    }

    if (!organization) {
      organization = user.organizations[0]
      if (organization) {
        authStorage.setActiveOrganizationId(organization.id)
      } else {
        authStorage.clearActiveOrganizationId()
      }
    } else {
      authStorage.setActiveOrganizationId(organization.id)
    }

    if (!organization) {
      authStorage.clearActiveDivisionId()
      setCurrentOrgId(null)
      setCurrentDivisionId(null)
      setIsReady(true)
      router.replace('/workspace-hub')
      return
    }

    const orgDivisionPreference =
      organization.id === routeOrgId ? routeDivisionId ?? undefined : authStorage.getActiveDivisionId() ?? undefined
    const activeDivision = getDefaultDivision(organization, orgDivisionPreference)

    if (activeDivision) {
      authStorage.setActiveDivisionId(activeDivision.id)
    } else {
      authStorage.clearActiveDivisionId()
    }

    setCurrentOrgId(organization ? organization.id : null)
    setCurrentDivisionId(activeDivision ? activeDivision.id : null)
    setIsReady(true)

    const hasRouteScope = !!routeOrgId
    const shouldRedirect =
      hasRouteScope &&
      (routeOrgId !== organization.id ||
      (!!activeDivision && routeDivisionId !== activeDivision.id) ||
      (!activeDivision && !!routeDivisionId))

    if (shouldRedirect) {
      if (activeDivision) {
        router.replace(`/${organization.id}/${activeDivision.id}/dashboard`)
      } else {
        router.replace('/workspace-hub')
      }
    }
  }, [isLoading, params, router, user])

  const setScope = useCallback(
    (orgId: string, divisionId?: string) => {
      if (!user) return

      const organization = user.organizations.find((candidate) => candidate.id === orgId)
      if (!organization) return

      const division = getDefaultDivision(organization, divisionId)

      setCurrentOrgId(organization.id)
      setCurrentDivisionId(division ? division.id : null)

      authStorage.setActiveOrganizationId(organization.id)
      if (division) {
        authStorage.setActiveDivisionId(division.id)
      } else {
        authStorage.clearActiveDivisionId()
      }
    },
    [user]
  )

  const setDivision = useCallback(
    (divisionId: string) => {
      if (!user || !currentOrgId) return
      const organization = user.organizations.find((candidate) => candidate.id === currentOrgId)
      if (!organization) return

      const division = organization.divisions.find((candidate) => candidate.id === divisionId)
      if (!division) return

      setCurrentDivisionId(division.id)
      authStorage.setActiveDivisionId(division.id)
    },
    [currentOrgId, user]
  )

  useEffect(() => {
    if (!isReady || !user) return

    if (!currentOrgId) {
      router.replace('/workspace-hub')
    }
  }, [currentOrgId, isReady, router, user])

  const currentOrganization = useMemo(() => {
    if (!user || !currentOrgId) return null
    return user.organizations.find((organization) => organization.id === currentOrgId) ?? null
  }, [currentOrgId, user])

  const currentDivision = useMemo(() => {
    if (!currentOrganization || !currentDivisionId) return null
    return currentOrganization.divisions.find((division) => division.id === currentDivisionId) ?? null
  }, [currentDivisionId, currentOrganization])

  const value: ScopeContextValue = useMemo(() => {
    if (!user) {
      return { ...fallbackScope, isReady }
    }

    return {
      organizations: user.organizations,
      currentOrganization,
      currentDivision,
      currentOrgId,
      currentDivisionId,
      setScope,
      setDivision,
      isReady
    }
  }, [
    currentDivision,
    currentDivisionId,
    currentOrgId,
    currentOrganization,
    isReady,
    setDivision,
    setScope,
    user
  ])

  useEffect(() => {
    useScopeStore.getState().setSnapshot({
      userId: user?.id ?? null,
      organizations: user?.organizations ?? [],
      currentOrgId,
      currentDivisionId,
      currentOrganization,
      currentDivision,
      isReady,
    })
  }, [
    currentDivision,
    currentDivisionId,
    currentOrganization,
    currentOrgId,
    isReady,
    user,
  ])

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export const useScope = () => {
  const context = useContext(ScopeContext)
  if (!context) {
    throw new Error('useScope must be used within a ScopeProvider')
  }
  return context
}
