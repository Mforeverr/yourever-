"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ProjectProvider } from "@/contexts/project-context"
import { ProjectWorkspaceLayout } from "@/components/workspace/project-workspace-layout"
import { useScope } from "@/contexts/scope-context"

export default function ProjectCalendarPage() {
  const params = useParams<{ orgId: string; divisionId: string; projectId: string }>()
  const { isReady } = useScope()

  // Validate that we have the required parameters
  const hasValidParams = Boolean(
    params.orgId &&
    params.divisionId &&
    params.projectId
  )

  // Loading state
  if (!isReady || !hasValidParams) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <ProjectProvider projectId={params.projectId}>
      <ProjectWorkspaceLayout currentView="calendar" />
    </ProjectProvider>
  )
}