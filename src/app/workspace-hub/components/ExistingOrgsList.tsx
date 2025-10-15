'use client'

import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { OrganizationCard, OrganizationCardSkeleton, type OrganizationCardData } from './OrganizationCard'

interface ExistingOrgsListProps {
  organizations: OrganizationCardData[]
  isLoading?: boolean
  onSelect: (orgId: string, divisionId: string | null) => void
  onDivisionSelect: (orgId: string, divisionId: string | null) => void
  onEnter: (orgId: string, divisionId: string | null) => void
  selectedOrgId: string | null
  divisionSelections: Record<string, string | null>
  activeOrgId?: string | null
  processingOrgId?: string | null
}

export function ExistingOrgsList({
  organizations,
  isLoading = false,
  onSelect,
  onDivisionSelect,
  onEnter,
  selectedOrgId,
  divisionSelections,
  activeOrgId,
  processingOrgId,
}: ExistingOrgsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const industries = useMemo(() => {
    return Array.from(
      new Set(
        organizations
          .map((org) => org.industry)
          .filter((value): value is string => Boolean(value))
      )
    ).sort()
  }, [organizations])

  const locations = useMemo(() => {
    return Array.from(
      new Set(
        organizations
          .map((org) => org.location)
          .filter((value): value is string => Boolean(value))
      )
    ).sort()
  }, [organizations])

  const tags = useMemo(() => {
    return Array.from(
      new Set(
        organizations.flatMap((org) => org.tags ?? [])
      )
    ).sort()
  }, [organizations])

  const filteredOrganizations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return organizations.filter((org) => {
      const matchesSearch = !query
        || org.name.toLowerCase().includes(query)
        || org.tagline?.toLowerCase().includes(query)
        || org.industry?.toLowerCase().includes(query)
        || org.location?.toLowerCase().includes(query)
        || org.tags?.some((tag) => tag.toLowerCase().includes(query))

      if (!matchesSearch) return false

      const matchesIndustry = selectedIndustry === 'all'
        || (org.industry?.toLowerCase() === selectedIndustry.toLowerCase())

      if (!matchesIndustry) return false

      const matchesLocation = selectedLocation === 'all'
        || (org.location?.toLowerCase() === selectedLocation.toLowerCase())

      if (!matchesLocation) return false

      const matchesTag = !selectedTag
        || org.tags?.map((tag) => tag.toLowerCase()).includes(selectedTag.toLowerCase())

      return matchesTag
    })
  }, [organizations, searchQuery, selectedIndustry, selectedLocation, selectedTag])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedIndustry('all')
    setSelectedLocation('all')
    setSelectedTag(null)
  }

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <OrganizationCardSkeleton key={`org-skeleton-${index}`} />
        ))}
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/60" />
        <div className="space-y-2">
          <p className="text-lg font-semibold">No organizations yet</p>
          <p className="text-sm text-muted-foreground">
            You can create your first organization using the option above.
          </p>
        </div>
      </div>
    )
  }

  const hasActiveFilters = Boolean(searchQuery || selectedTag || selectedIndustry !== 'all' || selectedLocation !== 'all')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
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
        <div className="flex items-center gap-2">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tags
          </span>
          {tags.map((tag) => {
            const isActive = selectedTag?.toLowerCase() === tag.toLowerCase()
            return (
              <Badge
                key={tag}
                variant={isActive ? 'default' : 'secondary'}
                className="cursor-pointer rounded-full text-xs"
                onClick={() => setSelectedTag(isActive ? null : tag)}
              >
                {tag}
              </Badge>
            )
          })}
          {selectedTag && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)}>
              Clear tag
            </Button>
          )}
        </div>
      )}

      {filteredOrganizations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <p className="text-lg font-semibold">No organizations found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filteredOrganizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              org={organization}
              isActive={selectedOrgId === organization.id || activeOrgId === organization.id}
              selectedDivisionId={divisionSelections[organization.id] ?? organization.divisions[0]?.id ?? null}
              onSelect={onSelect}
              onDivisionSelect={onDivisionSelect}
              onEnter={onEnter}
              isProcessing={processingOrgId === organization.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
