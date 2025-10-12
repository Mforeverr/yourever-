'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCcw, ExternalLink } from "lucide-react"
import {
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProjectDocs,
  useProjectEnvironment,
} from "@/modules/projects"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectDocsProps {
  projectId: string
}

const messages = enMessages

export function ProjectDocs({ projectId }: ProjectDocsProps) {
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()
  const docsQuery = useProjectDocs(projectId)

  const docs = docsQuery.data?.docs ?? []
  const isEmpty = docs.length === 0

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: projectQueryKeys.docs(scope, projectId) })
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{messages[PROJECT_I18N_KEYS.tabs.docs]}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Surface the docs that matter for planning and delivery.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={docsQuery.isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {docsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
            No docs are linked to this project yet. Attach specs, briefs, or runbooks to collaborate faster.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-md border border-border/60 bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.shortId} &middot; {doc.status} &middot; Updated{" "}
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open doc
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
