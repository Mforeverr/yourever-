'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { RefreshCcw } from "lucide-react"
import {
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProjectEnvironment,
  useProjectTimeline,
} from "@/modules/projects"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectTimelineProps {
  projectId: string
}

const messages = enMessages

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()
  const timelineQuery = useProjectTimeline(projectId)

  const entries = timelineQuery.data?.entries ?? []
  const isEmpty = entries.length === 0

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.timeline(scope, projectId) })
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{messages[PROJECT_I18N_KEYS.tabs.timeline]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Share updates, decisions, and milestones with the team.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={timelineQuery.isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {timelineQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            No timeline entries yet. Log milestones and decisions so teammates stay aligned.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {entry.entryType}
                    </Badge>
                    <p className="font-medium text-foreground">{entry.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.happenedAt).toLocaleString()}
                  </span>
                </div>
                {entry.description && (
                  <p className="mt-2 leading-relaxed text-muted-foreground">{entry.description}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Posted by {entry.authorName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
