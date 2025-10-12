import type { ComponentType } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Clock, FolderKanban, MapPin, Users } from 'lucide-react'

export interface OrganizationSelection {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  divisionCount: number
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
}

interface OrganizationCardProps {
  org: OrganizationSelection
  onSelect: (orgId: string) => void
  isActive?: boolean
}

const roleLabel: Record<OrganizationSelection['role'], string> = {
  owner: 'Owner Access',
  admin: 'Admin Access',
  member: 'Member Access'
}

const roleVariant: Record<OrganizationSelection['role'], 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline'
}

export function OrganizationCard({ org, onSelect, isActive = false }: OrganizationCardProps) {
  const handleSelect = () => {
    onSelect(org.id)
  }

  const stats: Array<{
    label: string
    value: string | number
    icon: ComponentType<{ className?: string }>
  }> = [
    {
      label: 'Divisions',
      value: org.divisionCount,
      icon: Building2
    },
    {
      label: 'Active members',
      value: org.memberCount ?? '—',
      icon: Users
    },
    {
      label: 'Last activity',
      value: org.lastActive ?? 'Recently',
      icon: Clock
    },
    {
      label: 'Projects',
      value: org.activeProjects ?? '—',
      icon: FolderKanban
    }
  ]

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
        org.accentColor && 'border-l-4'
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
          <div>
            <CardTitle className="text-xl font-semibold group-hover:text-primary">
              {org.name}
            </CardTitle>
            {org.tagline && <CardDescription>{org.tagline}</CardDescription>}
            {org.location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {org.location}
              </p>
            )}
          </div>
        </div>
        <Badge variant={roleVariant[org.role]} className="uppercase tracking-wide">
          {roleLabel[org.role]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div>
          <Button
            className="w-full"
            variant="default"
            onClick={(event) => {
              event.stopPropagation()
              handleSelect()
            }}
          >
            Enter workspace
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
