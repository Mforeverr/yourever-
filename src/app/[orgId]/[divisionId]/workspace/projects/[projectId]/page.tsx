"use client"

import * as React from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { ProjectProvider } from "@/contexts/project-context"
import { ProjectWorkspaceLayout } from "@/components/workspace/project-workspace-layout"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useScope } from "@/contexts/scope-context"
import { buildDivisionRoute, buildProjectRoute } from "@/lib/routing"

export default function ProjectWorkspacePage() {
  const params = useParams<{ orgId: string; divisionId: string; projectId: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const { currentOrgId, currentDivisionId, isReady } = useScope()

  // Extract view from pathname
  const extractViewFromPath = React.useCallback((path: string): string => {
    const segments = path.split('/').filter(Boolean)
    const projectIndex = segments.findIndex(seg => seg === 'projects')

    if (projectIndex === -1 || projectIndex + 2 >= segments.length) {
      return 'board'
    }

    const view = segments[projectIndex + 2]
    const validViews = ['board', 'list', 'timeline', 'calendar', 'mindmap', 'docs', 'settings']
    return validViews.includes(view) ? view : 'board'
  }, [])

  const currentView = React.useMemo(() => extractViewFromPath(pathname), [pathname, extractViewFromPath])
  const projectId = params.projectId

  // Validate scope context
  const hasValidScope = React.useMemo(() => {
    return Boolean(
      isReady &&
      currentOrgId === params.orgId &&
      currentDivisionId === params.divisionId &&
      projectId
    )
  }, [isReady, currentOrgId, currentDivisionId, params.orgId, params.divisionId, projectId])

  // Handle invalid scope
  React.useEffect(() => {
    if (isReady && !hasValidScope) {
      const targetRoute = buildDivisionRoute(params.orgId, params.divisionId, '/projects')
      router.replace(targetRoute)
    }
  }, [isReady, hasValidScope, params.orgId, params.divisionId, router])

  // Normalize routes to include an explicit view segment
  React.useEffect(() => {
    if (!isReady || !hasValidScope || !projectId) {
      return
    }

    const segments = pathname.split('/').filter(Boolean)
    const projectIndex = segments.findIndex(seg => seg === 'projects')
    const viewSegment = projectIndex !== -1 ? segments[projectIndex + 2] : undefined
    const viewIsValid = viewSegment && ['board', 'list', 'timeline', 'calendar', 'mindmap', 'docs', 'settings'].includes(viewSegment)

    if (!viewIsValid) {
      const normalizedRoute = buildProjectRoute(params.orgId, params.divisionId, projectId, currentView || 'board')
      router.replace(normalizedRoute)
    }
  }, [isReady, hasValidScope, pathname, currentView, params.orgId, params.divisionId, projectId, router])

  // Loading state
  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // Invalid scope state (will redirect)
  if (!hasValidScope) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              Invalid project scope. Redirecting to workspace...
            </AlertDescription>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => router.replace(buildDivisionRoute(params.orgId, params.divisionId, '/projects'))}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    )
  }

  // Missing project ID
  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Project not found</h2>
          <p className="text-muted-foreground">The requested project could not be loaded.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.replace(buildDivisionRoute(params.orgId, params.divisionId, '/projects'))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProjectProvider projectId={projectId}>
      <ProjectWorkspaceLayout currentView={currentView} />
    </ProjectProvider>
  )
}
