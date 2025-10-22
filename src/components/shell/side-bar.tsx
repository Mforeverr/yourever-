'use client'

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Hash,
  Lock,
  Users,
  Star,
  Bell,
  BellOff,
  FileText,
  Loader2,
  Settings,
  Share2,
  ArrowLeft,
  Home,
  FolderKanban,
  ListTodo,
  Calendar,
  FileText as FileIcon,
  User,
  Circle,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { useScope } from "@/contexts/scope-context"
import { useWorkspaceOverviewQuery } from "@/hooks/api/use-workspace-overview-query"
import {
  useMockWorkspaceStore,
  filterProjectsByScope,
  filterTasksByScope,
  filterDocsByScope,
} from "@/mocks/data/workspace"
import type { WorkspaceProject, WorkspaceTask, WorkspaceDoc } from "@/modules/workspace/types"
import { buildProjectRoute } from "@/lib/routing"
import { toast } from "@/hooks/use-toast"

interface SideBarProps {
  activePanel: string
  className?: string
  children?: React.ReactNode
}

interface ExplorerContentProps {
  className?: string
}

interface ChannelsContentProps {
  className?: string
}

interface CalendarContentProps {
  className?: string
}

interface ProjectWorkspaceContentProps {
  className?: string
}

// Helper functions for project status display
const getProjectStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return <CheckCircle className="size-3 text-green-500" />
    case 'on_hold':
      return <AlertCircle className="size-3 text-yellow-500" />
    case 'completed':
      return <CheckCircle className="size-3 text-blue-500" />
    case 'archived':
      return <Circle className="size-3 text-gray-400" />
    default:
      return <Clock className="size-3 text-muted-foreground" />
  }
}

const getProjectStatusBadge = (status: string) => {
  const variants = {
    active: 'default',
    on_hold: 'secondary',
    completed: 'outline',
    archived: 'secondary',
  } as const

  return variants[status.toLowerCase() as keyof typeof variants] || 'secondary'
}

function ExplorerContent({ className }: ExplorerContentProps) {
  const router = useRouter()
  const {
    currentOrgId,
    currentDivisionId,
    currentOrganization,
    currentProjectId,
    setDivision,
    setProjectScope,
    clearProjectScope,
    canSwitchToProject,
  } = useScope()
  const mockProjects = useMockWorkspaceStore((state) => state.projects)
  const mockTasks = useMockWorkspaceStore((state) => state.tasks)
  const mockDocs = useMockWorkspaceStore((state) => state.docs)

  const [expandedSections, setExpandedSections] = React.useState<string[]>(['divisions', 'projects', 'tasks', 'docs'])
  const [searchQuery, setSearchQuery] = React.useState('')

  const liveDataEnabled = isFeatureEnabled('workspace.liveData', process.env.NODE_ENV !== 'production')
  const overviewQuery = useWorkspaceOverviewQuery(currentOrgId, currentDivisionId, {
    enabled: liveDataEnabled && Boolean(currentOrgId),
  })

  const shouldUseMockData = !liveDataEnabled || overviewQuery.isError || !overviewQuery.data

  const scopedProjects = React.useMemo<WorkspaceProject[]>(() => {
    if (shouldUseMockData) {
      return filterProjectsByScope(mockProjects, currentOrgId, currentDivisionId)
    }
    const projects = overviewQuery.data?.projects ?? []
    if (!currentDivisionId) {
      return projects
    }
    return projects.filter((project) => project.divisionId === currentDivisionId)
  }, [
    shouldUseMockData,
    mockProjects,
    currentOrgId,
    currentDivisionId,
    overviewQuery.data?.projects,
  ])

  const scopedTasks = React.useMemo<WorkspaceTask[]>(() => {
    if (shouldUseMockData) {
      return filterTasksByScope(mockTasks, currentOrgId, currentDivisionId)
    }
    return overviewQuery.data?.tasks ?? []
  }, [shouldUseMockData, mockTasks, currentOrgId, currentDivisionId, overviewQuery.data?.tasks])

  const scopedDocs = React.useMemo<WorkspaceDoc[]>(() => {
    if (shouldUseMockData) {
      return filterDocsByScope(mockDocs, currentOrgId, currentDivisionId)
    }
    return overviewQuery.data?.docs ?? []
  }, [shouldUseMockData, mockDocs, currentOrgId, currentDivisionId, overviewQuery.data?.docs])

  const filteredProjects = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return scopedProjects
    }
    const normalized = searchQuery.toLowerCase()
    return scopedProjects.filter((project) => project.name.toLowerCase().includes(normalized))
  }, [scopedProjects, searchQuery])

  const toggleSection = React.useCallback((section: string) => {
    setExpandedSections((previous) =>
      previous.includes(section)
        ? previous.filter((value) => value !== section)
        : [...previous, section],
    )
  }, [])

  const divisionProjectCount = React.useCallback(
    (divisionId: string) => {
      if (shouldUseMockData) {
        return filterProjectsByScope(mockProjects, currentOrgId, divisionId).length
      }
      return (overviewQuery.data?.projects ?? []).filter((project) => project.divisionId === divisionId).length
    },
    [shouldUseMockData, mockProjects, currentOrgId, overviewQuery.data?.projects],
  )

  // Enhanced loading state for project navigation
  const [navigatingProjectId, setNavigatingProjectId] = React.useState<string | null>(null)

  // Clear navigation state when project changes successfully
  React.useEffect(() => {
    if (navigatingProjectId && currentProjectId === navigatingProjectId) {
      // Navigation completed successfully
      setNavigatingProjectId(null)
    }
  }, [navigatingProjectId, currentProjectId])

  // Cleanup navigation state when component unmounts
  React.useEffect(() => {
    return () => {
      setNavigatingProjectId(null)
    }
  }, [])

  const handleProjectClick = React.useCallback(
    async (project: WorkspaceProject) => {
      if (!currentOrgId || !currentDivisionId) {
        toast({
          title: 'Select a division',
          description: 'Choose an organization and division before opening a project.',
          variant: 'destructive',
        })
        return
      }

      // Prevent duplicate navigation attempts
      if (navigatingProjectId === project.id) {
        return
      }

      // Check if this is the current project to avoid unnecessary navigation
      if (currentProjectId === project.id) {
        toast({
          title: 'Already Active',
          description: `You're already working in "${project.name}"`,
        })
        return
      }

      // Validate project access
      if (!canSwitchToProject(project.id)) {
        toast({
          title: 'Access Denied',
          description: `You don't have access to "${project.name}". Please contact your administrator.`,
          variant: 'destructive',
        })
        return
      }

      setNavigatingProjectId(project.id)

      try {
        // Set project scope first
        setProjectScope(project.id, { reason: 'sidebar-project-select' })

        // Navigate to project board view
        const destination = buildProjectRoute(currentOrgId, currentDivisionId, project.id, 'board')
        await router.push(destination)

        // Show success feedback
        toast({
          title: 'Project Opened',
          description: `Now working in "${project.name}"`,
        })
      } catch (error) {
        console.error('Failed to navigate to project:', error)
        toast({
          title: 'Failed to Open Project',
          description: 'Could not navigate to project. Please try again.',
          variant: 'destructive',
        })
        // Clear navigation state on error
        setNavigatingProjectId(null)
      }
    },
    [currentDivisionId, currentOrgId, router, setProjectScope, currentProjectId, navigatingProjectId, canSwitchToProject],
  )

  const handleDivisionSelect = React.useCallback(
    async (divisionId: string) => {
      clearProjectScope({ reason: 'division-switch' })
      await setDivision(divisionId, { reason: 'sidebar-division-select' })
    },
    [clearProjectScope, setDivision],
  )

  const handleProjectSettings = React.useCallback((project: WorkspaceProject) => {
    toast({
      title: 'Project Settings',
      description: `Opening settings for "${project.name}"...`,
    })
    // TODO: Navigate to project settings when implemented
  }, [])

  const handleProjectShare = React.useCallback((project: WorkspaceProject) => {
    toast({
      title: 'Share Project',
      description: `Sharing "${project.name}"...`,
    })
    // TODO: Open share dialog when implemented
  }, [])

  const handleProjectDuplicate = React.useCallback((project: WorkspaceProject) => {
    toast({
      title: 'Duplicate Project',
      description: `Creating duplicate of "${project.name}"...`,
    })
    // TODO: Implement project duplication when API is ready
  }, [])

  const renderDivisionList = () => {
    if (!currentOrganization) {
      return <div className="px-4 py-2 text-xs text-muted-foreground">No divisions available.</div>
    }

    return (
      <div className="ml-2 space-y-1">
        {currentOrganization.divisions.map((division) => {
          const isActive = division.id === currentDivisionId
          const count = divisionProjectCount(division.id)
          return (
            <button
              key={division.id}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
              )}
              onClick={() => void handleDivisionSelect(division.id)}
            >
              <span>{division.name}</span>
              {count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  
  const renderProjectList = () => {
    if (liveDataEnabled && overviewQuery.isLoading) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Loading projects...
        </div>
      )
    }

    if (filteredProjects.length === 0) {
      return <div className="px-3 py-2 text-xs text-muted-foreground">No projects found.</div>
    }

    return filteredProjects.map((project) => {
      const isActive = project.id === currentProjectId
      const isNavigating = navigatingProjectId === project.id
      const taskCount = project.taskCount || 0
      const memberCount = project.memberCount || 0
      const lastUpdated = project.updatedAt ? new Date(project.updatedAt) : null

      return (
        <div
          key={project.id}
          className={cn(
            'group relative rounded-md border transition-all duration-200',
            isActive
              ? 'border-brand/30 bg-brand/5 shadow-sm'
              : isNavigating
              ? 'border-brand/20 bg-brand/2'
              : 'border-transparent hover:border-border hover:bg-accent/30',
            isNavigating && 'animate-pulse'
          )}
        >
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm transition-colors',
              'relative overflow-hidden',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
              isNavigating && 'cursor-not-allowed'
            )}
            onClick={() => handleProjectClick(project)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleProjectClick(project)
              }
            }}
            disabled={isNavigating}
            aria-label={`Open project ${project.name}`}
            aria-describedby={`project-${project.id}-status`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Project Status Icon with Loading State */}
              <div className="flex-shrink-0 relative">
                {isNavigating ? (
                  <Loader2 className="size-4 animate-spin text-brand" />
                ) : (
                  getProjectStatusIcon(project.status)
                )}
              </div>

              {/* Project Info */}
              <div className="flex flex-col items-start min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate text-sm">{project.name}</span>
                  {isActive && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
                      <span className="text-xs text-brand font-medium">Active</span>
                    </div>
                  )}
                </div>

                {project.description && (
                  <span className="text-xs text-muted-foreground truncate line-clamp-1">
                    {project.description}
                  </span>
                )}

                {/* Project Metadata */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ListTodo className="size-3" />
                    <span>{taskCount} tasks</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="size-3" />
                    <span>{memberCount} members</span>
                  </div>
                  {lastUpdated && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{lastUpdated.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div
              id={`project-${project.id}-status`}
              className="flex flex-col items-end gap-2 ml-3"
              role="status"
              aria-live="polite"
            >
              {isNavigating ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin text-brand" />
                  <span className="text-xs text-brand font-medium">Opening...</span>
                </div>
              ) : (
                <>
                  <Badge variant={getProjectStatusBadge(project.status)} className="text-xs capitalize">
                    {project.status.replace('_', ' ')}
                  </Badge>
                  {isActive && (
                    <span className="text-xs text-brand font-medium" aria-label="Currently active project">
                      Active
                    </span>
                  )}
                  {project.badgeCount !== undefined && project.badgeCount > 0 && (
                    <Badge variant="destructive" className="text-xs" aria-label={`${project.badgeCount} notifications`}>
                      {project.badgeCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </button>

          {/* Loading overlay for navigating project */}
          {isNavigating && (
            <div className="absolute inset-0 bg-brand/5 rounded-md border border-brand/20 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-brand" />
                <span className="text-xs text-brand font-medium">Opening project...</span>
              </div>
            </div>
          )}

          {/* Enhanced Quick Actions - Hidden during navigation */}
          <div className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface-panel rounded-md shadow-sm p-1 border border-border",
            isNavigating && "opacity-0 pointer-events-none"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-accent/50"
              onClick={(e) => {
                e.stopPropagation()
                handleProjectSettings(project)
              }}
              title="Project Settings"
            >
              <Settings className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-accent/50"
              onClick={(e) => {
                e.stopPropagation()
                handleProjectShare(project)
              }}
              title="Share Project"
            >
              <Share2 className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-accent/50"
              onClick={(e) => {
                e.stopPropagation()
                handleProjectDuplicate(project)
              }}
              title="Duplicate Project"
            >
              <Plus className="size-3 rotate-90" />
            </Button>
          </div>
        </div>
      )
    })
  }

  const renderTasks = () => {
    if (!scopedTasks.length) {
      return <div className="px-3 py-2 text-xs text-muted-foreground">No tasks in this scope yet.</div>
    }

    return scopedTasks.slice(0, 5).map((task) => (
      <div
        key={task.id}
        className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent/60"
      >
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', task.dotColor)} />
          <span className="truncate">{task.name}</span>
        </div>
        <Badge variant={task.badgeVariant} className="text-xs capitalize">
          {task.priority.toLowerCase()}
        </Badge>
      </div>
    ))
  }

  const renderDocs = () => {
    if (!scopedDocs.length) {
      return <div className="px-3 py-2 text-xs text-muted-foreground">Docs will appear here.</div>
    }

    return scopedDocs.slice(0, 5).map((doc) => (
      <div key={doc.id} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent/60">
        <FileText className="size-4 text-muted-foreground" />
        <span className="truncate">{doc.name}</span>
      </div>
    ))
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects and tasks..."
            className="h-8 bg-surface-elevated pl-9"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-start px-2"
              onClick={() => toggleSection('divisions')}
            >
              {expandedSections.includes('divisions') ? (
                <ChevronDown className="mr-1 size-4" />
              ) : (
                <ChevronRight className="mr-1 size-4" />
              )}
              Divisions
            </Button>
            {expandedSections.includes('divisions') && renderDivisionList()}
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-start px-2"
              onClick={() => toggleSection('projects')}
            >
              {expandedSections.includes('projects') ? (
                <ChevronDown className="mr-1 size-4" />
              ) : (
                <ChevronRight className="mr-1 size-4" />
              )}
              Projects
            </Button>
            {expandedSections.includes('projects') && <div className="space-y-1">{renderProjectList()}</div>}
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-start px-2"
              onClick={() => toggleSection('tasks')}
            >
              {expandedSections.includes('tasks') ? (
                <ChevronDown className="mr-1 size-4" />
              ) : (
                <ChevronRight className="mr-1 size-4" />
              )}
              My Tasks
            </Button>
            {expandedSections.includes('tasks') && <div className="space-y-1">{renderTasks()}</div>}
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-start px-2"
              onClick={() => toggleSection('docs')}
            >
              {expandedSections.includes('docs') ? (
                <ChevronDown className="mr-1 size-4" />
              ) : (
                <ChevronRight className="mr-1 size-4" />
              )}
              Docs
            </Button>
            {expandedSections.includes('docs') && <div className="space-y-1">{renderDocs()}</div>}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
      </div>
    </div>
  )
}

interface Channel {
  id: string
  name: string
  type: 'public' | 'private'
  isMuted: boolean
  isFavorite: boolean
  unreadCount: number
  memberCount?: number
}

interface User {
  id: string
  name: string
  status: 'online' | 'away' | 'offline'
  unreadCount?: number
}

function ChannelsContent({ className }: ChannelsContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['channels', 'dms'])

  // Mock data
  const channels: Channel[] = [
    { id: '1', name: 'general', type: 'public', isMuted: false, isFavorite: true, unreadCount: 5, memberCount: 24 },
    { id: '2', name: 'development', type: 'public', isMuted: false, isFavorite: true, unreadCount: 12, memberCount: 18 },
    { id: '3', name: 'design', type: 'public', isMuted: true, isFavorite: false, unreadCount: 0, memberCount: 8 },
    { id: '4', name: 'marketing', type: 'private', isMuted: false, isFavorite: false, unreadCount: 3, memberCount: 6 },
    { id: '5', name: 'random', type: 'public', isMuted: false, isFavorite: false, unreadCount: 28, memberCount: 32 },
  ]

  const users: User[] = [
    { id: '1', name: 'Sarah Chen', status: 'online', unreadCount: 2 },
    { id: '2', name: 'Mike Johnson', status: 'online', unreadCount: 0 },
    { id: '3', name: 'Emily Davis', status: 'away', unreadCount: 0 },
    { id: '4', name: 'Tom Wilson', status: 'offline', unreadCount: 1 },
  ]

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const toggleFavorite = (channelId: string) => {
    // This would update the channel in state
    console.log('Toggle favorite:', channelId)
  }

  const toggleMute = (channelId: string) => {
    // This would update the channel in state
    console.log('Toggle mute:', channelId)
  }

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFavorites = !showFavoritesOnly || channel.isFavorite
    return matchesSearch && matchesFavorites
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search channels..." 
            className="pl-9 h-8 bg-surface-elevated border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant={showFavoritesOnly ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={cn("size-3 mr-1", showFavoritesOnly && "fill-current")} />
            Favorites
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          {/* Channels */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('channels')}
            >
              {expandedSections.includes('channels') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              CHANNELS
            </Button>
            {expandedSections.includes('channels') && (
              <div className="space-y-1">
                {filteredChannels.map(channel => {
                  const Icon = channel.type === 'private' ? Lock : Hash
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer group"
                      onClick={() => router.push(`/c/${channel.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="text-sm">{channel.name}</span>
                        {channel.isFavorite && <Star className="size-3 fill-current text-yellow-500" />}
                        {channel.isMuted && <BellOff className="size-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {channel.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {channel.unreadCount}
                          </Badge>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(channel.id)
                            }}
                          >
                            <Star className={cn("size-3", channel.isFavorite && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMute(channel.id)
                            }}
                          >
                            {channel.isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('dms')}
            >
              {expandedSections.includes('dms') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              DIRECT MESSAGES
            </Button>
            {expandedSections.includes('dms') && (
              <div className="space-y-1">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => router.push(`/dm/${user.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", getStatusColor(user.status))} />
                      <span className="text-sm">{user.name}</span>
                    </div>
                    {user.unreadCount && user.unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {user.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border space-y-2">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          Add Channel
        </Button>
        <Button variant="ghost" size="sm" className="w-full">
          <Users className="size-4 mr-2" />
          Invite People
        </Button>
      </div>
    </div>
  )
}

function CalendarContent({ className }: CalendarContentProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium">Calendar</h3>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          <div className="text-center p-3 bg-surface-elevated rounded-lg">
            <div className="text-lg font-bold">November 2024</div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">TODAY</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-brand/10 border border-brand/20">
                <div className="text-sm font-medium">Weekly Standup</div>
                <div className="text-xs text-muted-foreground">10:00 AM - 10:30 AM</div>
              </div>
              <div className="p-2 rounded-lg bg-surface-elevated">
                <div className="text-sm font-medium">Design Review</div>
                <div className="text-xs text-muted-foreground">2:00 PM - 3:00 PM</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">UPCOMING</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <div className="text-sm font-medium">Sprint Planning</div>
                <div className="text-xs text-muted-foreground">Tomorrow, 9:00 AM</div>
              </div>
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <div className="text-sm font-medium">Client Presentation</div>
                <div className="text-xs text-muted-foreground">Nov 15, 3:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function ProjectWorkspaceContent({ className }: ProjectWorkspaceContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    currentOrgId,
    currentDivisionId,
    currentProjectId,
    currentOrganization,
    currentDivision,
    clearProjectScope,
    breadcrumbs,
  } = useScope()
  const mockProjects = useMockWorkspaceStore((state) => state.projects)

  // Derive current view from pathname
  const currentView = React.useMemo(() => {
    const segments = pathname?.split('/').filter(Boolean) || []
    const lastSegment = segments[segments.length - 1]

    // Map URL segments to view IDs
    const viewMap: Record<string, string> = {
      'board': 'board',
      'list': 'list',
      'timeline': 'timeline',
      'calendar': 'calendar',
      'mindmap': 'mindmap',
      'docs': 'docs',
      'dashboard': 'board', // Default to board if in project dashboard
    }

    return viewMap[lastSegment] || 'board'
  }, [pathname])

  const currentProject = Object.values(mockProjects).find((p) => p.id === currentProjectId)

  // Loading and error states
  const [isNavigating, setIsNavigating] = React.useState(false)

  const handleExitToWorkspace = React.useCallback(async () => {
    setIsNavigating(true)
    clearProjectScope({ reason: 'exit-to-workspace' })

    if (currentOrgId && currentDivisionId) {
      router.push(`/${currentOrgId}/${currentDivisionId}/workspace`)
    } else if (currentOrgId) {
      router.push(`/${currentOrgId}/workspace`)
    } else {
      router.push('/workspace-hub')
    }
  }, [clearProjectScope, currentOrgId, currentDivisionId, router])

  const handleProjectSettings = React.useCallback(() => {
    toast({
      title: 'Project Settings',
      description: 'Project settings coming soon',
    })
  }, [])

  const handleProjectShare = React.useCallback(() => {
    toast({
      title: 'Share Project',
      description: 'Share project coming soon',
    })
  }, [])

  if (!currentProject) {
    return (
      <div className={cn('flex h-full flex-col', className)}>
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading project...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Enhanced Project Header */}
      <div className="border-b border-border bg-surface-elevated/50 p-3">
        <div className="space-y-3">
          {/* Exit Button with Animation */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleExitToWorkspace}
            disabled={isNavigating}
          >
            <ArrowLeft className="size-4" />
            <span className="text-xs">Exit to Workspace</span>
            {isNavigating && <Loader2 className="size-3 animate-spin" />}
          </Button>

          {/* Project Info with Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                {getProjectStatusIcon(currentProject.status)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate flex items-center gap-2">
                  {currentProject.name}
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                    <span className="text-xs text-brand font-medium">Active</span>
                  </div>
                </h3>
                {currentProject.description && (
                  <p className="text-xs text-muted-foreground truncate line-clamp-2 mt-1">
                    {currentProject.description}
                  </p>
                )}

                {/* Project Metadata */}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {currentProject.memberCount || 0} members
                  </span>
                  <span className="flex items-center gap-1">
                    <ListTodo className="size-3" />
                    {currentProject.taskCount || 0} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    Updated {new Date(currentProject.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Project Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-accent/50"
                onClick={handleProjectSettings}
                title="Project Settings"
              >
                <Settings className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-accent/50"
                onClick={handleProjectShare}
                title="Share Project"
              >
                <Share2 className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Enhanced Breadcrumb Navigation */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                  {index > 0 && <span className="mx-1 text-border">/</span>}
                  <button
                    className={cn(
                      'hover:text-foreground transition-colors flex items-center gap-1',
                      crumb.type === 'project' && 'text-foreground font-medium'
                    )}
                    onClick={() => router.push(crumb.href)}
                  >
                    {crumb.type === 'organization' && <Home className="size-3" />}
                    {crumb.type === 'division' && <FolderKanban className="size-3" />}
                    {crumb.type === 'project' && <FileIcon className="size-3" />}
                    <span className="truncate max-w-20">{crumb.name}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Current View Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Current View:</span>
              <Badge variant="outline" className="text-xs capitalize">
                {currentView}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-4">
          <section className="p-4 bg-surface-elevated/50 rounded-lg border border-border/50">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Project Overview</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  {getProjectStatusIcon(currentProject.status)}
                  Status
                </span>
                <Badge variant={getProjectStatusBadge(currentProject.status)} className="text-xs capitalize">
                  {currentProject.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FolderKanban className="size-3" />
                  Default View
                </span>
                <span className="font-medium capitalize">{currentProject.defaultView || 'board'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="size-3" />
                  Last Updated
                </span>
                <span className="font-medium">
                  {new Date(currentProject.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <User className="size-3" />
                  Team Size
                </span>
                <span className="font-medium">{currentProject.memberCount || 0} members</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => toast({
                    title: 'Project Analytics',
                    description: 'Analytics dashboard coming soon',
                  })}
                >
                  <Clock className="size-3 mr-1" />
                  Analytics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => toast({
                    title: 'Project Reports',
                    description: 'Project reports coming soon',
                  })}
                >
                  <FileText className="size-3 mr-1" />
                  Reports
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  )
}

function SideBar({ activePanel, className }: SideBarProps) {
  const { currentProjectId, currentProject, breadcrumbs } = useScope()
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [transitionDirection, setTransitionDirection] = React.useState<'enter' | 'exit'>('enter')
  const previousProjectId = React.useRef<string | null>(null)

  // Enhanced transition handling with direction
  React.useEffect(() => {
    if (previousProjectId.current !== currentProjectId) {
      setTransitionDirection(currentProjectId ? 'enter' : 'exit')
      setIsTransitioning(true)
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        previousProjectId.current = currentProjectId
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [currentProjectId])

  // Render mode indicator
  const renderModeIndicator = () => {
    if (!currentProjectId) return null

    return (
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 bg-brand/10 border border-brand/20 rounded-full">
          <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
          <span className="text-xs text-brand font-medium">Project Mode</span>
        </div>
      </div>
    )
  }

  // If we're in a project scope, show the enhanced project workspace sidebar
  if (currentProjectId) {
    return (
      <div className={cn(
        "h-full min-w-0 bg-surface-panel border-r border-border flex flex-col relative overflow-hidden",
        "transition-all duration-200 ease-in-out",
        isTransitioning && transitionDirection === 'enter' && "opacity-0 translate-x-4",
        isTransitioning && transitionDirection === 'exit' && "opacity-0 -translate-x-4",
        !isTransitioning && "opacity-100 translate-x-0",
        className
      )}>
        {renderModeIndicator()}
        <ProjectWorkspaceContent />

        {/* Context Background */}
        {currentProject && (
          <div
            className="absolute inset-0 pointer-events-none opacity-5 bg-gradient-to-br from-brand/20 via-transparent to-transparent"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 20%, ${currentProject.status === 'active' ? '#22c55e' : currentProject.status === 'on_hold' ? '#eab308' : '#3b82f6'}20 0%, transparent 50%)`
            }}
          />
        )}
      </div>
    )
  }

  // Otherwise show the enhanced global workspace sidebar
  const renderContent = () => {
    switch (activePanel) {
      case 'explorer':
        return <ExplorerContent />
      case 'channels':
        return <ChannelsContent />
      case 'calendar':
        return <CalendarContent />
      default:
        return <ExplorerContent />
    }
  }

  return (
    <div className={cn(
      "h-full min-w-0 bg-surface-panel border-r border-border flex flex-col relative overflow-hidden",
      "transition-all duration-200 ease-in-out",
      isTransitioning && transitionDirection === 'exit' && "opacity-0 -translate-x-4",
      isTransitioning && transitionDirection === 'enter' && "opacity-0 translate-x-4",
      !isTransitioning && "opacity-100 translate-x-0",
      className
    )}>
      {/* Workspace Mode Indicator */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 bg-surface-elevated border border-border rounded-full">
          <Home className="size-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Workspace</span>
        </div>
      </div>

      {renderContent()}

      {/* Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-3"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 80%, #6366f120 0%, transparent 50%)`
        }}
      />
    </div>
  )
}

export { SideBar, ExplorerContent, ChannelsContent, CalendarContent, ProjectWorkspaceContent }
