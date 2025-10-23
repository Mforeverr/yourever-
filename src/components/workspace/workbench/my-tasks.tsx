'use client'

import * as React from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useScope } from '@/contexts/scope-context'
import { useWorkspaceOverviewQuery } from '@/hooks/api/use-workspace-overview-query'
import { CheckCircle2, Circle } from 'lucide-react'

const priorityVariant: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  Urgent: 'destructive',
  High: 'secondary',
  Medium: 'outline',
  Low: 'outline',
}

interface MyTasksModuleProps {
  limit?: number
}

export function MyTasksModule({ limit = 6 }: MyTasksModuleProps) {
  const { currentOrgId, currentDivisionId } = useScope()
  const {
    data: overview,
    isPending,
    isError,
  } = useWorkspaceOverviewQuery(currentOrgId, currentDivisionId, {
    enabled: Boolean(currentOrgId),
  })

  const scopedTasks = React.useMemo(() => {
    const tasks = overview?.tasks ?? []
    return tasks.slice(0, limit)
  }, [overview?.tasks, limit])

  const hasTasks = scopedTasks.length > 0

  return (
    <Card className="border-border/80 bg-surface-panel/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">My Tasks</CardTitle>
        <Badge variant="secondary" className="text-xs">
          {isPending ? '…' : scopedTasks.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load tasks right now. Please retry shortly.
          </div>
        )}
        {!isPending && !isError && !hasTasks && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            <p>No tasks assigned to you in this scope yet.</p>
            <p className="mt-1">Create or assign tasks from a project board to see them here.</p>
          </div>
        )}
        {isPending &&
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-md" />
          ))}
        {!isPending && !isError && scopedTasks.map((task) => (
          <div
            key={task.id}
            className="group flex items-center justify-between rounded-md border border-border/70 bg-background/50 px-3 py-2 transition hover:border-brand/40 hover:bg-brand/5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <Circle className="h-4 w-4 text-muted-foreground/70" />
                <CheckCircle2 className="absolute h-4 w-4 text-transparent group-hover:text-brand transition-colors" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{task.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.divisionId ? `Division • ${task.divisionId}` : 'Organization wide'}
                </p>
              </div>
            </div>
            <Badge variant={priorityVariant[task.priority] ?? 'outline'} className="text-[11px] uppercase tracking-wide">
              {task.priority}
            </Badge>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          View all tasks
        </Button>
      </CardFooter>
    </Card>
  )
}
