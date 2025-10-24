'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  Search,
  Plus,
  Filter,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react'
import { useScope } from '@/contexts/scope-context'
import { useAuth } from '@/contexts/auth-context'
import { useProjectsByScopeQuery } from '@/hooks/api/use-project-query'
import { ProjectCrudForm } from './project-crud-form'
import { ProjectCard } from './project-card'
import type { ProjectSummary } from '@/modules/projects/contracts'

interface ProjectListProps {
  className?: string
  showCreateButton?: boolean
  compact?: boolean
  maxHeight?: string
  onProjectSelect?: (project: ProjectSummary) => void
  showHeader?: boolean
}

type SortOption = 'name' | 'updated' | 'created' | 'status' | 'priority'
type SortDirection = 'asc' | 'desc'
type FilterOption = 'all' | 'active' | 'planning' | 'on_hold' | 'completed' | 'archived'
type ViewMode = 'card' | 'list'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'updated', label: 'Last Updated' },
  { value: 'created', label: 'Created Date' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
]

const filterOptions: { value: FilterOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Projects', icon: FolderOpen },
  { value: 'active', label: 'Active', icon: CheckCircle2 },
  { value: 'planning', label: 'Planning', icon: Clock },
  { value: 'on_hold', label: 'On Hold', icon: AlertCircle },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'archived', label: 'Archived', icon: Archive },
]

export function ProjectList({
  className,
  showCreateButton = true,
  compact = false,
  maxHeight = '400px',
  onProjectSelect,
  showHeader = true,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sortBy, setSortBy] = React.useState<SortOption>('updated')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  const [filterStatus, setFilterStatus] = React.useState<FilterOption>('all')
  const [viewMode, setViewMode] = React.useState<ViewMode>(compact ? 'list' : 'card')

  const { isAuthenticated, user } = useAuth()

  const {
    currentOrgId,
    currentDivisionId,
    currentProjectId,
    navigateToProject,
    getAvailableProjects,
    status: scopeStatus,
    isReady,
    refresh: refreshScope
  } = useScope()

  // Use scope context data for consistency, but fall back to direct API call for flexibility
  const {
    data: projectsFromApi = [],
    isLoading: isLoadingFromApi,
    error: errorFromApi,
    refetch,
  } = useProjectsByScopeQuery(currentOrgId, currentDivisionId, {
    enabled: Boolean(currentOrgId) && false, // Disable by default to prefer scope context
  })

  // Use scope context projects when available for consistency
  const projects = isReady && scopeStatus === 'ready' ? getAvailableProjects() : projectsFromApi
  const isLoading = isLoadingFromApi || scopeStatus === 'loading' || !isReady
  const error = errorFromApi

  // Filter and sort projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(project => project.status === filterStatus)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        project.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'updated':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case 'created':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          aValue = priorityOrder[a.priority || 'medium'] || 0
          bValue = priorityOrder[b.priority || 'medium'] || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [projects, searchQuery, sortBy, sortDirection, filterStatus])

  const handleProjectClick = (project: ProjectSummary) => {
    if (onProjectSelect) {
      onProjectSelect(project)
    } else {
      navigateToProject(project.id)
    }
  }

  const handleRefresh = async () => {
    if (isReady) {
      await refreshScope()
    } else {
      await refetch()
    }
  }

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const statusCounts = React.useMemo(() => {
    const counts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return filterOptions.map(option => ({
      ...option,
      count: counts[option.value] || 0,
    }))
  }, [projects])

  if (!isAuthenticated) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex items-center justify-center h-full p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive mb-2">Authentication Required</p>
          <p className="text-xs text-muted-foreground">Please sign in to view projects</p>
        </div>
      </div>
    )
  }

  if (!currentOrgId) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex items-center justify-center h-full p-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Organization Required</p>
          <p className="text-xs text-muted-foreground">Please select an organization to view projects</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {showHeader && (
        <div className="p-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Projects</h3>
            {!compact && (
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9 h-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={(value: FilterOption) => setFilterStatus(value)}>
              <SelectTrigger className="flex-1 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusCounts.map((option) => {
                  const Icon = option.icon
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                    {option.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-4 w-4 mr-1" />
                  {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={sortBy === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Project List */}
      <ScrollArea className="flex-1" style={{ maxHeight }}>
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading projects...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-destructive mb-2">Failed to load projects</p>
              <p className="text-xs text-muted-foreground mb-3">
                {error.message.includes('401') || error.message.includes('unauthorized')
                  ? 'Please sign in again to access your projects.'
                  : error.message.includes('403') || error.message.includes('forbidden')
                  ? 'You do not have permission to access projects in this organization.'
                  : error.message.includes('network') || error.message.includes('fetch')
                  ? 'Network connection error. Please check your internet connection.'
                  : 'Please try again or contact support if the problem persists.'
                }
              </p>
              <Button variant="outline" size="sm" onClick={() => handleRefresh()}>
                Try again
              </Button>
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                {searchQuery ? 'No projects found matching your search' : 'No projects found'}
              </p>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className={cn(
              'space-y-2',
              viewMode === 'card' && !compact && 'grid grid-cols-1 gap-3'
            )}>
              {filteredAndSortedProjects.map((project) => {
                const isCompact = compact || viewMode === 'list'
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    compact={isCompact}
                    onClick={() => handleProjectClick(project)}
                    showActions={!isCompact}
                  />
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Create Button */}
      {showCreateButton && (
        <div className="p-2 border-t border-border">
          <ProjectCrudForm
            onSuccess={(project) => {
              // Navigate to the newly created project
              handleProjectClick(project)
            }}
          >
            <Button className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </ProjectCrudForm>
        </div>
      )}
    </div>
  )
}
