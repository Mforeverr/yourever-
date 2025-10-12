import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { CalendarDays, FolderKanban, MapPin, Users } from 'lucide-react'

export interface DivisionSelection {
  id: string
  name: string
  summary?: string
  leader?: {
    name: string
    title?: string
    avatar?: string
  }
  memberCount?: number
  projectCount?: number
  activeInitiatives?: number
  focusAreas?: string[]
  timezone?: string
  lastSync?: string
  accentColor?: string
  userRole?: 'owner' | 'admin' | 'member'
}

interface DivisionCardProps {
  division: DivisionSelection
  onSelect: (divisionId: string) => void
  isActive?: boolean
}

export function DivisionCard({ division, onSelect, isActive = false }: DivisionCardProps) {
  const selectDivision = () => {
    onSelect(division.id)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={selectDivision}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectDivision()
        }
      }}
      className={cn(
        'group relative h-full cursor-pointer border border-border/60 transition-all hover:-translate-y-0.5 hover:border-primary/80 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive && 'border-primary/80 shadow-lg',
        division.accentColor && 'border-l-4'
      )}
      style={division.accentColor ? { borderLeftColor: division.accentColor } : undefined}
    >
      <CardHeader className="flex items-start justify-between gap-3 pb-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            {division.leader?.avatar ? (
              <AvatarImage src={division.leader.avatar} alt={division.leader.name} />
            ) : (
              <AvatarFallback className="uppercase">
                {division.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-xl font-semibold group-hover:text-primary">{division.name}</CardTitle>
            {division.summary && <CardDescription>{division.summary}</CardDescription>}
            {division.timezone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {division.timezone}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          {division.userRole && (
            <Badge
              variant={division.userRole === 'owner' ? 'default' : division.userRole === 'admin' ? 'secondary' : 'outline'}
              className="text-xs font-medium uppercase tracking-wide"
            >
              {division.userRole}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-medium uppercase tracking-wide">
            {division.activeInitiatives ?? 0} initiatives
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">{division.memberCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">{division.projectCount ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
          </div>
        </div>

        {division.leader && (
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-foreground">{division.leader.name}</p>
              {division.leader.title && (
                <p className="text-xs text-muted-foreground">{division.leader.title}</p>
              )}
            </div>
            {division.lastSync && (
              <p className="text-xs text-muted-foreground">{division.lastSync}</p>
            )}
          </div>
        )}

        {division.focusAreas && division.focusAreas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {division.focusAreas.map((area) => (
              <Badge key={area} variant="secondary" className="rounded-full text-xs">
                {area}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          {division.timezone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {division.timezone}
            </div>
          )}
          <Button
            size='sm'
            onClick={(event) => {
              event.stopPropagation()
              selectDivision()
            }}
          >
            Enter division
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function DivisionCardSkeleton() {
  return (
    <Card className="h-full border border-border/50">
      <CardHeader className="flex items-start justify-between gap-3 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted/80" />
          </div>
        </div>
        <div className="h-6 w-24 rounded-full bg-muted/80" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-14 rounded-md border border-border/60 bg-muted/40" />
          ))}
        </div>
        <div className="h-14 rounded-md border border-border/60 bg-muted/40" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-6 w-16 rounded-full bg-muted/60" />
          ))}
        </div>
        <div className="h-9 w-full rounded-md bg-muted/60" />
      </CardContent>
    </Card>
  )
}
