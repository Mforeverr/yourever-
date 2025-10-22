'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { ProjectProvider } from '@/contexts/project-context'
import { ProjectSettingsView } from '@/components/workspace/project-settings-view'

// Settings view page wrapper that provides project context and renders the project settings view
export default function ProjectSettingsPage() {
  const params = useParams<{ orgId: string; divisionId: string; projectId: string }>()
  const projectId = params.projectId

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Project not found</h2>
          <p className="text-muted-foreground">The requested project could not be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <ProjectProvider projectId={projectId}>
      <ProjectSettingsView projectId={projectId} />
    </ProjectProvider>
  )
}