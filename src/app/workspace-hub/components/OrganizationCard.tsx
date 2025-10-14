import type { ComponentType } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Clock,
  FolderKanban,
  MapPin,
  Users,
  Globe2,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Division } from '@/hooks/use-organizations'

export interface OrganizationCardData {
  id: string
  name: string
  role: string
  divisions: Division[]
  tagline?: string
  industry?: string
  location?: string
  timezone?: string
  memberCount?: number
  activeProjects?: number
  lastActive?: string
  tags?: string[]
  accentColor?: string
  logoUrl?: string
  description?: string
}

interface OrganizationCardProps {
  org: OrganizationCardData
  isActive?: boolean
  selectedDivisionId?: string | null
  onSelect: (orgId: string, divisionId: string | null) => void
  onDivisionSelect: (orgId: string, divisionId: string | null) => void
  onEnter: (orgId: string, divisionId: string | null) => void
  isProcessing?: boolean
}

const roleLabel: Record<string, string> = {
  owner: 'Owner Access',
  admin: 'Admin Access',
  member: 'Member Access',
}

const roleVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
}

const getRoleLabel = (role: string) => roleLabel[role?.toLowerCase()] ?? role
const getRoleVariant = (role: string) => roleVariant[role?.toLowerCase()] ?? 'outline'

export function OrganizationCard({
  org,
  isActive = false,
  selectedDivisionId,
  onSelect,
  onDivisionSelect,
  onEnter,
  isProcessing,
}: OrganizationCardProps) {
  const effectiveDivisionId = selectedDivisionId ?? org.divisions[0]?.id ?? null

  const stats: Array<{
    label: string
    value: string | number
    icon: ComponentType<{ className?: string }>
  }> = [
    {
      label: 'Divisions',
      value: org.divisions.length,
      icon: Building2,
    },
    {
      label: 'Active members',
      value: org.memberCount ?? '—',
      icon: Users,
    },
    {
      label: 'Last activity',
      value: org.lastActive ?? 'Recently',
      icon: Clock,
    },
    {
      label: 'Projects',
      value: org.activeProjects ?? '—',
      icon: FolderKanban,
    },
  ]

  const handleSelect = () => {
    onSelect(org.id, effectiveDivisionId)
  }

  const handleEnter = () => {
    onEnter(org.id, effectiveDivisionId)
  }

  const handleDivisionChange = (divisionId: string) => {
    onDivisionSelect(org.id, divisionId || null)
  }

  const disableEntry = org.divisions.length === 0 || isProcessing

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelect()
        }
      }}
      className={cn(
        'group relative h-full cursor-pointer border border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/80 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive && 'border-primary/80 shadow-lg',
        org.accentColor && 'border-l-4',
        disableEntry && 'opacity-90'
      )}
      style={org.accentColor ? { borderLeftColor: org.accentColor } : undefined}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border/50 bg-muted/50">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={`${org.name} logo`} className="h-8 w-8 rounded" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold group-hover:text-primary">
              {org.name}
            </CardTitle>
            {org.tagline && <CardDescription>{org.tagline}</CardDescription>}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {org.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {org.location}
                </span>
              )}
              {org.timezone && (
                <span className="flex items-center gap-1">
                  <Globe2 className="h-3 w-3" />
                  {org.timezone}
                </span>
              )}
              {org.industry && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {org.industry}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge variant={getRoleVariant(org.role)} className="uppercase tracking-wide">
          {getRoleLabel(org.role)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {org.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>
        )}
        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
            >
              <Icon className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {org.tags && org.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {org.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {org.divisions.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Choose a division
            </p>
            <Select
              value={effectiveDivisionId ?? undefined}
              onValueChange={handleDivisionChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
              <SelectContent>
                {org.divisions.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {org.divisions.length === 1 && (
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
            <span className="font-medium text-foreground">Division</span>
            <Badge variant="secondary">{org.divisions[0].name}</Badge>
          </div>
        )}

        {org.divisions.length === 0 && (
          <div className="rounded-md border border-dashed border-orange-200 bg-orange-50/60 px-3 py-2 text-xs text-orange-700">
            No divisions available yet. Ask an admin to assign you to a division.
          </div>
        )}

        <div>
          <Button
            className="w-full"
            variant="default"
            onClick={(event) => {
              event.stopPropagation()
              handleEnter()
            }}
            disabled={disableEntry}
          >
            {isProcessing ? 'Opening workspace…' : 'Enter workspace'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrganizationCardSkeleton() {
  return (
    <Card className="h-full border border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`s-${index}`} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`tag-${index}`} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  )
}
