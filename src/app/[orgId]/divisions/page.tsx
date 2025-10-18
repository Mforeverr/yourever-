'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'
import { fetchDivisionOverviews } from '@/mocks/data/divisions'
import {
  DivisionCard,
  DivisionCardSkeleton,
  type DivisionSelection
} from '@/components/selection/division-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'

const SKELETON_COUNT = 4

export default function DivisionSelectionPage() {
  const params = useParams<{ orgId: string }>()
  const router = useRouter()
  const { isLoading: isProtecting } = useProtectedRoute()
  const { user } = useCurrentUser()

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true)
  const [divisions, setDivisions] = useState<DivisionSelection[]>([])
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null)
  const [restrictedCount, setRestrictedCount] = useState(0)

  const orgId = params.orgId

  const organization = useMemo(() => {
    if (!user) return undefined
    return user.organizations.find((candidate) => candidate.id === orgId)
  }, [orgId, user])

  const navigateToDivision = useCallback(
    (divisionId: string) => {
      if (!organization) return
      const accessibleDivision = divisions.find((candidate) => candidate.id === divisionId)
      if (!accessibleDivision) return

      const divisionRecord = organization.divisions.find((candidate) => candidate.id === divisionId)
      if (!divisionRecord) return

      authStorage.setActiveOrganizationId(organization.id)
      authStorage.setActiveDivisionId(divisionRecord.id)
      setActiveDivisionId(divisionRecord.id)
      router.replace(`/${organization.id}/${divisionRecord.id}/dashboard`)
    },
    [divisions, organization, router]
  )

  useEffect(() => {
    const storedDivisionId = authStorage.getActiveDivisionId()
    if (storedDivisionId) {
      setActiveDivisionId(storedDivisionId)
    }
  }, [])

  useEffect(() => {
    if (!user || !organization) {
      return
    }

    let cancelled = false
    const loadDivisions = async () => {
      setIsLoadingDivisions(true)
      const overviews = await fetchDivisionOverviews(
        organization.id,
        organization.divisions.map((division) => division.id)
      )
      if (cancelled) return

      const userRole = organization.userRole
      let restricted = 0

      const cards: DivisionSelection[] = organization.divisions.reduce<DivisionSelection[]>((accumulator, division) => {
        const overview = overviews.find((candidate) => candidate.id === division.id)
        const allowedRoles = overview?.allowedRoles ?? ['owner', 'admin', 'member']

        if (!userRole || !allowedRoles.includes(userRole as 'owner' | 'admin' | 'member')) {
          restricted += 1
          return accumulator
        }

        accumulator.push({
          id: division.id,
          name: division.name,
          summary: overview?.summary,
          leader: overview?.leader,
          memberCount: overview?.memberCount,
          projectCount: overview?.projectCount,
          activeInitiatives: overview?.activeInitiatives,
          focusAreas: overview?.focusAreas,
          timezone: overview?.timezone,
          lastSync: overview?.lastSync,
          accentColor: overview?.accentColor,
          userRole: userRole as 'owner' | 'admin' | 'member' | undefined
        })

        return accumulator
      }, [])

      setRestrictedCount(restricted)
      setDivisions(cards)
      setIsLoadingDivisions(false)
    }

    void loadDivisions()

    return () => {
      cancelled = true
    }
  }, [organization, user])

  useEffect(() => {
    if (!isProtecting && organization) {
      if (divisions.length === 0) return
      const storedDivisionId = authStorage.getActiveDivisionId()
      if (storedDivisionId && divisions.some((division) => division.id === storedDivisionId)) {
        navigateToDivision(storedDivisionId)
        return
      }

      if (divisions.length === 1) {
        navigateToDivision(divisions[0].id)
      }
    }
  }, [divisions, isProtecting, navigateToDivision, organization])

  useEffect(() => {
    if (!isProtecting && user && !organization) {
      router.replace('/workspace-hub')
    }
  }, [isProtecting, organization, router, user])

  const filteredDivisions = useMemo(() => {
    if (!searchQuery) return divisions
    const query = searchQuery.toLowerCase()
    return divisions.filter((division) => {
      if (division.name.toLowerCase().includes(query)) return true
      if (division.summary?.toLowerCase().includes(query)) return true
      return division.focusAreas?.some((area) => area.toLowerCase().includes(query)) ?? false
    })
  }, [divisions, searchQuery])

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
        <p>Preparing your workspace…</p>
      </div>
    )
  }

  if (!user || !organization) {
    return null
  }

  const showEmptyState = !isLoadingDivisions && filteredDivisions.length === 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <Breadcrumb className="text-left">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/workspace-hub">Organizations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{organization.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage aria-current="page">Divisions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose the division you want to work in. You can always switch divisions from the workspace shell.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Button asChild variant="outline" size="sm">
            <Link href="/workspace-hub">Back to organizations</Link>
          </Button>
          {restrictedCount > 0 && (
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              {restrictedCount} division{restrictedCount === 1 ? '' : 's'} hidden based on your permissions.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search divisions…"
                className="pl-10"
                aria-label="Search divisions"
              />
            </div>
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          )}
        </div>

        {isLoadingDivisions ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <DivisionCardSkeleton key={`division-skeleton-${index}`} />
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-12 text-center">
            <h2 className="text-lg font-semibold">No divisions found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search or clear the search box to see all divisions.'
                : 'This organization does not have divisions configured yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredDivisions.map((division) => (
              <DivisionCard
                key={division.id}
                division={division}
                onSelect={navigateToDivision}
                isActive={division.id === activeDivisionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
