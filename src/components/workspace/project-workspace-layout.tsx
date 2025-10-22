'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  List,
  GanttChart,
  Calendar,
  GitBranch,
  FileText,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { useProject } from '@/contexts/project-context'
import { useScope } from '@/contexts/scope-context'
import { BreadcrumbNavigation } from '@/components/project/breadcrumb-navigation'
import { Skeleton } from '@/components/ui/skeleton'

// Import workspace views
import { BoardView } from './board-view'
import { ListView } from './list-view'
import { TimelineView } from './timeline-view'
import { CalendarView } from './calendar-view'
import { MindMapView } from './mindmap-view'
import { DocsView } from './docs-view'
import { ProjectSettingsView } from './project-settings-view'

type ViewType = "board" | "list" | "timeline" | "calendar" | "mindmap" | "docs" | "settings"

const views = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "mindmap", label: "Mindmap", icon: GitBranch },
  { id: "docs", label: "Docs", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
] as const

interface ProjectWorkspaceLayoutProps {
  currentView: string
  className?: string
}

export function ProjectWorkspaceLayout({ currentView, className }: ProjectWorkspaceLayoutProps) {
  const { project, isLoading, canView, navigateToView } = useProject()
  const { exitProject } = useScope()
  const params = useParams<{ orgId: string; divisionId: string; projectId: string }>()

  const activeView = React.useMemo(() => {
    return views.find(view => view.id === currentView) || views[0]
  }, [currentView])

  const handleViewChange = React.useCallback((viewId: ViewType) => {
    if (activeView.id === viewId) {
      return
    }
    navigateToView(viewId)
  }, [activeView.id, navigateToView])

  const handleExitProject = React.useCallback(() => {
    exitProject()
  }, [exitProject])

  const renderActiveView = React.useCallback(() => {
    if (!project) return null

    switch (currentView) {
      case "board":
        return <BoardView projectId={project.id} />
      case "list":
        return <ListView projectId={project.id} />
      case "timeline":
        return <TimelineView projectId={project.id} />
      case "calendar":
        return <CalendarView projectId={project.id} />
      case "mindmap":
        return <MindMapView projectId={project.id} />
      case "docs":
        return <DocsView projectId={project.id} />
      case "settings":
        return <ProjectSettingsView projectId={project.id} />
      default:
        return <BoardView projectId={project.id} />
    }
  }, [currentView, project])

  if (isLoading) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {views.map((view) => (
              <Skeleton key={view.id} className="h-12 w-24" />
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!project || !canView) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">Project Access Required</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to view this project or it doesn't exist.
          </p>
          <Button variant="outline" onClick={handleExitProject}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Exit Project
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="p-6 border-b border-border bg-surface-panel">
        {/* Breadcrumbs and Exit Button */}
        <div className="flex items-center justify-between mb-4">
          <BreadcrumbNavigation
            showHomeButton={false}
            showExitButton={true}
            currentPage={activeView.label}
          />
        </div>

        {/* Project Info */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>

        {/* View Menu */}
        <div className="flex items-center gap-2 flex-wrap">
          {views.map((view) => {
            const Icon = view.icon
            const isActive = activeView.id === view.id

            return (
              <Button
                key={view.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "justify-start gap-2 h-auto p-3 transition-colors",
                  isActive && "bg-brand text-brand-foreground shadow-sm"
                )}
                onClick={() => handleViewChange(view.id as ViewType)}
                aria-pressed={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{view.label}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {renderActiveView()}
      </div>
    </div>
  )
}
