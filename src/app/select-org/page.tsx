'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'
import type { Organization } from '@/lib/mock-users'
import { fetchOrganizationOverviews } from '@/lib/mock-organizations'
import {
  OrganizationCard,
  OrganizationCardSkeleton,
  type OrganizationSelection
} from '@/components/selection/org-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const SKELETON_COUNT = 4

const rolePriority: Record<OrganizationSelection['role'], number> = {
  owner: 0,
  admin: 1,
  member: 2
}

export default function SelectOrganizationPage() {
  const router = useRouter()
  const { isLoading: isProtecting } = useProtectedRoute()
  const { user } = useCurrentUser()

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true)
  const [organizationCards, setOrganizationCards] = useState<OrganizationSelection[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  useEffect(() => {
    const storedOrgId = authStorage.getActiveOrganizationId()
    if (storedOrgId) {
      setActiveOrgId(storedOrgId)
    }
  }, [])

  const navigateToOrg = useCallback(
    (organization: Organization, divisionId?: string) => {
      const targetDivision = divisionId
        ? organization.divisions.find((division) => division.id === divisionId) ?? organization.divisions[0]
        : organization.divisions[0]

      authStorage.setActiveOrganizationId(organization.id)
      setActiveOrgId(organization.id)

      if (!targetDivision) {
        authStorage.clearActiveDivisionId()
        router.replace(`/select-org`)
        return
      }

      authStorage.setActiveDivisionId(targetDivision.id)
      router.replace(`/${organization.id}/${targetDivision.id}/dashboard`)
    },
    [router]
  )

  const handleSelectOrganization = useCallback(
    (organizationId: string) => {
      if (!user) return
      const organization = user.organizations.find((candidate) => candidate.id === organizationId)
      if (!organization) return

      if (organization.divisions.length > 1) {
        authStorage.setActiveOrganizationId(organization.id)
        authStorage.clearActiveDivisionId()
        setActiveOrgId(organization.id)
        router.push(`/${organization.id}/divisions`)
        return
      }

      navigateToOrg(organization)
    },
    [navigateToOrg, router, user]
  )

  useEffect(() => {
    if (!user) {
      setOrganizationCards([])
      return
    }

    let cancelled = false
    const loadOrganizations = async () => {
      setIsLoadingOrganizations(true)
      const orgIds = user.organizations.map((organization) => organization.id)
      const overviews = await fetchOrganizationOverviews(orgIds)

      if (cancelled) return

      const cards = user.organizations
        .map<OrganizationSelection>((organization) => {
          const overview = overviews.find((candidate) => candidate.id === organization.id)
          return {
            id: organization.id,
            name: organization.name,
            role: organization.userRole,
            divisionCount: organization.divisions.length,
            tagline: overview?.tagline,
            industry: overview?.industry,
            location: overview?.location,
            timezone: overview?.timezone,
            memberCount: overview?.memberCount,
            activeProjects: overview?.activeProjects,
            lastActive: overview?.lastActive,
            tags: overview?.tags,
            accentColor: overview?.accentColor,
            logoUrl: overview?.logoUrl
          }
        })
        .sort((a, b) => rolePriority[a.role] - rolePriority[b.role] || a.name.localeCompare(b.name))

      setOrganizationCards(cards)
      setIsLoadingOrganizations(false)
    }

    void loadOrganizations()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!isProtecting && user) {
      const storedOrgId = authStorage.getActiveOrganizationId()
      const storedDivisionId = authStorage.getActiveDivisionId()

      const storedOrg = storedOrgId
        ? user.organizations.find((organization) => organization.id === storedOrgId)
        : undefined

      if (storedOrg) {
        navigateToOrg(storedOrg, storedDivisionId ?? undefined)
        return
      }

      if (user.organizations.length === 1) {
        navigateToOrg(user.organizations[0])
      }
    }
  }, [isProtecting, navigateToOrg, user])

  const filteredOrganizations = useMemo(() => {
    if (!searchQuery) return organizationCards
    const query = searchQuery.toLowerCase()
    return organizationCards.filter((organization) => {
      if (organization.name.toLowerCase().includes(query)) return true
      if (organization.industry?.toLowerCase().includes(query)) return true
      if (organization.tagline?.toLowerCase().includes(query)) return true
      return organization.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false
    })
  }, [organizationCards, searchQuery])

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
        <p>Preparing your workspace…</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const showEmptyState = !isLoadingOrganizations && filteredOrganizations.length === 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Choose your organization</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick where you want to work today. You can switch later from the workspace shell.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search organizations…"
                className="pl-10"
                aria-label="Search organizations"
              />
            </div>
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          )}
        </div>

        {isLoadingOrganizations ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <OrganizationCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12 text-center">
            <h2 className="text-lg font-semibold">No organizations found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search or clear the search box to see all organizations.'
                : 'You are not assigned to any organizations yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredOrganizations.map((organization) => (
              <OrganizationCard
                key={organization.id}
                org={organization}
                onSelect={handleSelectOrganization}
                isActive={organization.id === activeOrgId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
