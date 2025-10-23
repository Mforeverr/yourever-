'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Clock } from 'lucide-react'
import { useScope } from '@/contexts/scope-context'
import { useWorkspaceOverviewQuery } from '@/hooks/api/use-workspace-overview-query'
import { cn } from '@/lib/utils'

export function PinnedProjectsModule() {
  const { currentOrgId, currentDivisionId, navigateToProject } = useScope()
  const {
    data: overview,
    isPending,
    isError,
  } = useWorkspaceOverviewQuery(currentOrgId, currentDivisionId, {
    enabled: Boolean(currentOrgId),
  })

  const scopedProjects = React.useMemo(() => overview?.projects ?? [], [overview?.projects])

  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    if (!scopedProjects.length) {
      return
    }
    setPinnedIds((previous) => {
      if (previous.size > 0) {
        return previous
      }
      return new Set(scopedProjects.slice(0, 2).map((project) => project.id))
    })
  }, [scopedProjects])

  const togglePinned = React.useCallback((projectId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }, [])

  const pinnedProjects = scopedProjects.filter((project) => pinnedIds.has(project.id))
  const recentProjects = scopedProjects
    .filter((project) => !pinnedIds.has(project.id))
    .slice(0, 4 - pinnedProjects.length)

  return (
    <Card className="border-border/80 bg-surface-panel/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Pinned &amp; Recent Projects</CardTitle>
        <Badge variant="outline" className="text-xs">
          {isPending ? '…' : `${pinnedProjects.length}/${scopedProjects.length}`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Pinned</h4>
          {isError && (
            <p className="text-xs text-destructive">
              Unable to load projects right now. Please try again shortly.
            </p>
          )}
          {isPending && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}
          {!isPending && !isError && pinnedProjects.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Pin projects you revisit often. We saved two for you to start.
            </p>
          )}
          {!isPending && !isError && pinnedProjects.map((project) => (
            <article
              key={project.id}
              className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">{project.description}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                  {project.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => togglePinned(project.id)}
                >
                  <Star className="h-4 w-4 fill-current text-brand" />
                </Button>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Recently Viewed</h4>
          {!isPending && !isError && recentProjects.length === 0 && (
            <p className="text-xs text-muted-foreground">Open a project to see it appear here.</p>
          )}
          {isPending && (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}
          {!isPending && !isError && recentProjects.map((project) => (
            <article
              key={project.id}
              className="flex items-center justify-between rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePinned(project.id)}>
                  <Star className={cn('h-4 w-4', pinnedIds.has(project.id) && 'fill-current text-brand')} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateToProject(project.id)}>
                  Open
                </Button>
              </div>
            </article>
          ))}
        </section>

        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          Tip: We remember the last projects you viewed on this device.
        </div>
      </CardContent>
    </Card>
  )
}
