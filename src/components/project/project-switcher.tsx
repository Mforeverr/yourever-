'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ArrowLeft,
  Search,
  Plus,
  Settings,
  Users,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react'
import { useScope } from '@/contexts/scope-context'
import { buildProjectRoute } from '@/lib/routing'
import type { ProjectDetailResponse } from '@/modules/projects/contracts'
import type { WorkspaceProject } from '@/modules/workspace/types'

interface ProjectSwitcherProps {
  className?: string
  showExitButton?: boolean
  currentView?: string
}

interface ProjectOptionProps {
  project: WorkspaceProject | ProjectDetailResponse['project']
  isActive: boolean
  onClick: () => void
}

// Helper to get project status color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-500'
    case 'planning':
      return 'text-blue-500'
    case 'on_hold':
      return 'text-yellow-500'
    case 'completed':
      return 'text-emerald-500'
    case 'archived':
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

// Helper to get project status icon
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
      return CheckCircle2
    default:
      return Circle
  }
}

// Project option component
function ProjectOption({ project, isActive, onClick }: ProjectOptionProps) {
  const StatusIcon = getStatusIcon(project.status)
  const isWorkspaceProject = 'badgeCount' in project

  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
        isActive
          ? 'bg-brand/10 text-brand border border-brand/20'
          : 'hover:bg-accent/60'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <StatusIcon className={cn('size-4 flex-shrink-0', getStatusColor(project.status))} />
        <span className="truncate">{project.name}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Show badge count for workspace projects */}
        {isWorkspaceProject && (project.badgeCount ?? 0) > 0 && (
          <Badge variant="outline" className="text-xs">
            {project.badgeCount}
          </Badge>
        )}

        {/* Show progress for detailed projects */}
        {!isWorkspaceProject && 'progressPercent' in project && (
          <span className="text-xs text-muted-foreground">
            {project.progressPercent}%
          </span>
        )}
      </div>
    </button>
  )
}

export function ProjectSwitcher({
  className,
  showExitButton = true,
  currentView = 'board'
}: ProjectSwitcherProps) {
  const {
    currentOrganization,
    currentDivision,
    currentProject,
    currentProjectId,
    currentOrgId,
    currentDivisionId,
    breadcrumbs,
    navigateToProject,
    exitProject,
    getAvailableProjects,
    status: scopeStatus,
    isReady,
  } = useScope()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)

  // Use scope context to get available projects instead of direct API call
  const availableProjects = React.useMemo(() => {
    const projects = getAvailableProjects()
    return projects.map((projectData) => ({
      id: projectData.id,
      orgId: projectData.organizationId,
      divisionId: projectData.divisionId,
      name: projectData.name,
      description: projectData.description,
      badgeCount: projectData.badgeCount || 0,
      dotColor: 'bg-blue-500' as const,
      status: projectData.status,
      defaultView: 'board' as const,
      isTemplate: false,
      updatedAt: projectData.updatedAt,
    }))
  }, [getAvailableProjects])

  const isLoading = scopeStatus === 'loading' || !isReady

  // Filter projects by search query
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return availableProjects
    }
    const normalized = searchQuery.toLowerCase()
    return availableProjects.filter((project) =>
      project.name.toLowerCase().includes(normalized) ||
      (project.description && project.description.toLowerCase().includes(normalized))
    )
  }, [availableProjects, searchQuery])

  // Handle project selection
  const handleProjectSelect = React.useCallback(
    (projectId: string) => {
      navigateToProject(projectId, currentView)
      setIsOpen(false)
    },
    [navigateToProject, currentView]
  )

  // Handle exit project
  const handleExitProject = React.useCallback(() => {
    exitProject()
  }, [exitProject])

  // Generate current project display name
  const getCurrentProjectName = () => {
    if (currentProject) {
      return currentProject.name
    }
    if (currentProjectId) {
      const project = availableProjects.find(p => p.id === currentProjectId)
      return project?.name || 'Unknown Project'
    }
    return null
  }

  const currentProjectName = getCurrentProjectName()
  const hasScope = Boolean(currentOrganization && currentDivision)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Breadcrumb navigation */}
      {hasScope && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="truncate max-w-24">
            {currentOrganization?.name}
          </span>
          <span>/</span>
          <span className="truncate max-w-24">
            {currentDivision?.name}
          </span>
          {currentProject && (
            <>
              <span>/</span>
              <span className="truncate max-w-32 font-medium text-foreground">
                {currentProject.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* Project switcher */}
      {hasScope && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 min-w-0"
            >
              {currentProjectName ? (
                <>
                  <span className="truncate">{currentProjectName}</span>
                  <div className="flex items-center gap-1">
                    {currentProject && (
                      <div className={cn('w-2 h-2 rounded-full', getStatusColor(currentProject.status))} />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Select Project</span>
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-9 h-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="max-h-64">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {scopeStatus === 'loading' ? 'Loading scope...' : 'Loading projects...'}
                  </span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No projects found matching your search.' : 'No projects available.'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProjects.map((project) => (
                    <ProjectOption
                      key={project.id}
                      project={project}
                      isActive={project.id === currentProjectId}
                      onClick={() => handleProjectSelect(project.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="p-2 border-t flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1">
                <Plus className="size-4 mr-2" />
                New Project
              </Button>
              <Button variant="ghost" size="sm" className="flex-1">
                <Settings className="size-4 mr-2" />
                Settings
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Exit project button */}
      {showExitButton && currentProjectId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitProject}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Exit Project</span>
        </Button>
      )}
    </div>
  )
}
