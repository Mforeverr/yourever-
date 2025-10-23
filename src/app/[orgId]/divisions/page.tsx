'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useScope } from '@/contexts/scope-context'
import { DivisionCard, DivisionCardSkeleton, type DivisionSelection } from '@/components/selection/division-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const SKELETON_COUNT = 4

export default function DivisionSelectionPage() {
  const params = useParams<{ orgId: string }>()
  const router = useRouter()
  const { isLoading: isProtecting } = useProtectedRoute()
  const {
    organizations,
    currentDivisionId,
    setDivision,
    status: scopeStatus,
  } = useScope()

  const [searchQuery, setSearchQuery] = useState('')
  const [isNavigating, setIsNavigating] = useState(false)

  const orgId = params.orgId

  const organization = useMemo(() => {
    return organizations.find((candidate) => candidate.id === orgId)
  }, [organizations, orgId])

  useEffect(() => {
    if (isProtecting) {
      return
    }
    if (!organization) {
      router.replace('/workspace-hub')
    }
  }, [isProtecting, organization, router])

  const divisions: DivisionSelection[] = useMemo(() => {
    if (!organization) {
      return []
    }

    return organization.divisions.map((division) => ({
      id: division.id,
      name: division.name,
      summary: division.description ?? undefined,
      userRole: (division.userRole as DivisionSelection['userRole']) ?? undefined,
    }))
  }, [organization])

  const filteredDivisions = useMemo(() => {
    if (!searchQuery.trim()) {
      return divisions
    }
    const normalized = searchQuery.toLowerCase()
    return divisions.filter((division) => {
      if (division.name.toLowerCase().includes(normalized)) return true
      if (division.summary?.toLowerCase().includes(normalized)) return true
      return false
    })
  }, [divisions, searchQuery])

  const navigateToDivision = useCallback(
    (divisionId: string) => {
      if (!organization) return
      const target = organization.divisions.find((candidate) => candidate.id === divisionId)
      if (!target) return

      setIsNavigating(true)
      void setDivision(target.id, { reason: 'division-selection' })
        .catch((error) => {
          console.error('Failed to switch division', error)
        })
        .finally(() => {
          setIsNavigating(false)
        })
    },
    [organization, setDivision],
  )

  useEffect(() => {
    if (isProtecting || isNavigating) {
      return
    }
    if (!organization || divisions.length !== 1) {
      return
    }
    const [onlyDivision] = divisions
    if (onlyDivision && onlyDivision.id !== currentDivisionId) {
      navigateToDivision(onlyDivision.id)
    }
  }, [currentDivisionId, divisions, isNavigating, isProtecting, navigateToDivision, organization])

  const isLoading = isProtecting || scopeStatus === 'loading'
  const hasDivisions = filteredDivisions.length > 0

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
        <p>Preparing your workspace…</p>
      </div>
    )
  }

  if (!organization) {
    return null
  }

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

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <DivisionCardSkeleton key={`division-skeleton-${index}`} />
            ))}
          </div>
        ) : !hasDivisions ? (
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
                isActive={division.id === currentDivisionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
