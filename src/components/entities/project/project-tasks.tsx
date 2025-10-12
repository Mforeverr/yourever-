'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCcw, ExternalLink } from "lucide-react"
import {
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProjectEnvironment,
  useProjectTasks,
} from "@/modules/projects"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectTasksProps {
  projectId: string
  limit?: number
}

const messages = enMessages

export function ProjectTasks({ projectId, limit = 25 }: ProjectTasksProps) {
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()
  const tasksQuery = useProjectTasks(projectId, { limit })

  const tasks = tasksQuery.data?.tasks ?? []
  const isEmpty = tasks.length === 0

  const statusGroups = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1
      return acc
    }, {})
  }, [tasks])

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.tasks(scope, projectId, { limit }) })
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{messages[PROJECT_I18N_KEYS.tabs.tasks]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Track the most recent tasks scoped to this project.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={tasksQuery.isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasksQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            No active tasks yet. Create a task from the command palette or task board to see it here.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusGroups).map(([status, count]) => (
                <Badge key={status} variant="outline" className="capitalize">
                  {status.replace("_", " ")} &middot; {count}
                </Badge>
              ))}
            </div>
            <ul className="space-y-2 text-sm">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between rounded-md border border-border/60 bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.shortId} &middot; {task.status.replace("_", " ")}
                      {task.assigneeName ? ` · ${task.assigneeName}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View task
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
