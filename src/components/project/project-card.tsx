'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Calendar,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  Archive,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import { useScope } from '@/contexts/scope-context'
import { useDeleteProjectMutation, useOptimisticProjectUpdate } from '@/hooks/api/use-project-mutations'
import { ProjectCrudForm } from './project-crud-form'
import type { ProjectSummary, ProjectDetails } from '@/modules/projects/contracts'

interface ProjectCardProps {
  project: ProjectSummary | ProjectDetails
  className?: string
  showActions?: boolean
  onClick?: () => void
  onUpdate?: (project: ProjectDetails) => void
  compact?: boolean
}

// Helper to get project status color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-500 bg-green-50 border-green-200'
    case 'planning':
      return 'text-blue-500 bg-blue-50 border-blue-200'
    case 'on_hold':
      return 'text-yellow-500 bg-yellow-50 border-yellow-200'
    case 'completed':
      return 'text-emerald-500 bg-emerald-50 border-emerald-200'
    case 'archived':
      return 'text-gray-500 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

// Helper to get project priority color
const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'bg-red-500'
    case 'high':
      return 'bg-orange-500'
    case 'medium':
      return 'bg-blue-500'
    case 'low':
      return 'bg-gray-500'
    default:
      return 'bg-gray-500'
  }
}

// Helper to get project status icon
const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'completed':
      return CheckCircle2
    case 'on_hold':
      return Clock
    default:
      return Circle
  }
}

const getStatusIndicatorColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-emerald-500'
    case 'planning':
      return 'bg-blue-500'
    case 'on_hold':
      return 'bg-amber-500'
    case 'completed':
      return 'bg-sky-500'
    case 'archived':
      return 'bg-muted-foreground'
    default:
      return 'bg-muted-foreground'
  }
}

export function ProjectCard({
  project,
  className,
  showActions = true,
  onClick,
  onUpdate,
  compact = false,
}: ProjectCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showEditDialog, setShowEditDialog] = React.useState(false)

  const { navigateToProject, currentProjectId } = useScope()
  const { updateProjectOptimistically } = useOptimisticProjectUpdate()

  const deleteProjectMutation = useDeleteProjectMutation({
    onSuccess: (data, variables, context) => {
      toast({
        title: 'Project deleted',
        description: `${project.name} has been removed from your workspace.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  })

  const StatusIcon = getStatusIcon(project.status)
  const isActive = currentProjectId === project.id

  const handleProjectClick = () => {
    if (onClick) {
      onClick()
    } else {
      navigateToProject(project.id)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowEditDialog(true)
  }

  const handleDelete = () => {
    deleteProjectMutation.mutate({ projectId: project.id })
  }

  const handleUpdate = (updatedProject: ProjectDetails) => {
    // Optimistically update the project card data
    updateProjectOptimistically(project.id, updatedProject)
    onUpdate?.(updatedProject)
  }

  const isDetailed = 'overview' in project

  // Format dates
  const formattedUpdatedAt = formatDistanceToNow(new Date(project.updatedAt), {
    addSuffix: true,
  })

  const formattedTargetDate = project.targetDate
    ? formatDistanceToNow(new Date(project.targetDate), {
        addSuffix: true,
      })
    : null

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 hover:bg-accent/40 transition-colors cursor-pointer group',
          isActive && 'bg-accent border-accent-foreground/20',
          className
        )}
        onClick={handleProjectClick}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('size-2 rounded-full flex-shrink-0', getStatusIndicatorColor(project.status))} />
          <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
          {project.priority && (
            <span className={cn('size-1.5 rounded-full flex-shrink-0', getPriorityColor(project.priority))} />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {project.badgeCount !== undefined && project.badgeCount > 0 && (
            <Badge variant="secondary" className="text-[11px] px-2 py-0 leading-normal">
              {project.badgeCount}
            </Badge>
          )}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateToProject(project.id)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Edit Dialog */}
        {showActions && (
          <ProjectCrudForm
            project={project}
            onSuccess={handleUpdate}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{project.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteProjectMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer group',
        isActive && 'ring-2 ring-ring bg-accent',
        className
      )}
      onClick={handleProjectClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusIcon className={cn('h-5 w-5 flex-shrink-0', getStatusColor(project.status).split(' ')[0])} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{project.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {project.description || 'No description'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.priority && (
            <div className={cn('w-3 h-3 rounded-full', getPriorityColor(project.priority))} />
          )}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateToProject(project.id)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                {project.status !== 'archived' && (
                  <DropdownMenuItem>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className={cn('text-xs', getStatusColor(project.status))}>
          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </Badge>
        {project.priority && (
          <Badge variant="secondary" className="text-xs">
            <Target className="mr-1 h-3 w-3" />
            {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
          </Badge>
        )}
        {project.visibility && (
          <Badge variant="outline" className="text-xs">
            {project.visibility === 'private' && <Users className="mr-1 h-3 w-3" />}
            {project.visibility === 'division' && <Users className="mr-1 h-3 w-3" />}
            {project.visibility === 'organization' && <Star className="mr-1 h-3 w-3" />}
            {project.visibility.charAt(0).toUpperCase() + project.visibility.slice(1)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      {isDetailed && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{project.progressPercent}%</span>
          </div>
          <Progress value={project.progressPercent} className="h-2" />
        </div>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{project.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {isDetailed && (
            <>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Updated {formattedUpdatedAt}</span>
              </div>
              {formattedTargetDate && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Due {formattedTargetDate}</span>
                </div>
              )}
            </>
          )}
        </div>

        {project.badgeCount !== undefined && project.badgeCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {project.badgeCount}
          </Badge>
        )}
      </div>

      {/* Edit Dialog */}
      {showActions && (
        <ProjectCrudForm
          project={project}
          onSuccess={handleUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProjectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete Project'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
