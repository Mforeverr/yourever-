'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ChevronDown, ChevronRight, Hash, Lock, Users, Star, Bell, BellOff, Calendar, FileText, Loader2, Pencil, X, AlertCircle } from "lucide-react"
import { PeopleSidebar } from "@/components/people/people-sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { ProjectList } from "@/components/project/project-list"
import { ProjectCrudForm } from "@/components/project/project-crud-form"
import { ProjectSummary } from "@/modules/projects/contracts"
import { ChannelForm } from "@/components/forms/channel-form"
import { useScope } from "@/contexts/scope-context"
import { ProjectWorkspaceContent as ProjectScopeSidebarContent } from "@/components/shell/side-bar"
import {
  useMockConversationStore,
  selectChannelsForScope,
  selectDirectMessageUsersForScope
} from "@/mocks/data/conversations"
import {
  useMockWorkspaceStore,
  filterProjectsByScope,
  filterTasksByScope,
  filterDocsByScope,
  countProjectsForDivision
} from "@/mocks/data/workspace"
import { useWorkspaceOverviewQuery } from "@/hooks/api/use-workspace-overview-query"
import { useDivisionChannelsQuery } from "@/hooks/api/use-division-channels-query"
import { useWorkspaceStore } from "@/state/workspace.store"
import { useUpdateChannelMutation } from "@/hooks/api/use-workspace-mutations"
import type { UseQueryResult } from "@tanstack/react-query"
import type { WorkspaceOverview, WorkspaceChannel, WorkspaceProject } from "@/modules/workspace/types"
import { toast } from "@/hooks/use-toast"

// Error boundary component for catching rendering errors
class SidebarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Sidebar Error Boundary caught an error:', error, errorInfo)
    toast({
      title: 'Sidebar Error',
      description: 'There was an error loading the sidebar content.',
      variant: 'destructive',
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Unable to load sidebar content</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

interface SideBarProps {
  activePanel: string
  className?: string
  children?: React.ReactNode
}

interface ExplorerContentProps {
  className?: string
  liveDataEnabled: boolean
  overviewQuery: UseQueryResult<WorkspaceOverview, unknown>
}

interface ChannelsContentProps {
  className?: string
}

interface CalendarContentProps {
  className?: string
}

interface PeopleContentProps {
  className?: string
}

interface AdminContentProps {
  className?: string
}

interface WorkspaceContentProps {
  className?: string
  liveDataEnabled: boolean
  overviewQuery: UseQueryResult<WorkspaceOverview, unknown>
}

const countProjectsForDivisionLive = (projects: WorkspaceProject[], divisionId: string) =>
  projects.filter((project) => project.divisionId === divisionId || project.divisionId === null).length

const filterProjectsByDivision = (
  projects: WorkspaceProject[],
  orgId?: string | null,
  divisionId?: string | null,
) => {
  if (!orgId) return []
  if (divisionId) {
    // Show projects for this division + org-wide projects (divisionId: null)
    return projects.filter((project) => project.divisionId === divisionId || project.divisionId === null)
  }
  // When no division specified, only show org-wide projects
  return projects.filter((project) => project.divisionId === null)
}

const filterDocsByDivision = (
  docs: ({ divisionId: string | null; id: string; name: string; isTemplate?: boolean } | { divisionId: string | null })[],
  divisionId?: string | null,
) => {
  if (divisionId) {
    return docs.filter((doc) => doc.divisionId === divisionId)
  }
  return docs
}

const filterTasksByDivision = (
  tasks: ({ divisionId: string | null; id: string; name: string; isTemplate?: boolean; dotColor?: string } | { divisionId: string | null })[],
  divisionId?: string | null,
) => {
  if (divisionId) {
    return tasks.filter((task) => task.divisionId === divisionId)
  }
  return tasks
}

function ExplorerContent({ className, liveDataEnabled, overviewQuery }: ExplorerContentProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['divisions', 'projects'])
  const router = useRouter()

  // Fix: Use individual selectors to prevent infinite re-renders caused by object creation
  const shouldShowTemplatesBanner = useWorkspaceStore((state) => state.showTemplatesBanner)
  const dismissTemplatesBanner = useWorkspaceStore((state) => state.dismissTemplatesBanner)

  const { currentOrganization, currentOrgId, currentDivision, currentDivisionId, setScope, setDivision, navigateToProject } = useScope()

  // ALL hooks must be called at the top level before any conditional returns
  const mockProjects = useMockWorkspaceStore((state) => state.projects)
  const mockDocs = useMockWorkspaceStore((state) => state.docs)
  const mockTasks = useMockWorkspaceStore((state) => state.tasks)

  const shouldUseMockData = !liveDataEnabled || Boolean(overviewQuery?.isError)

  const projects: WorkspaceProject[] = React.useMemo(() => {
    if (overviewQuery?.isSuccess && overviewQuery?.data) {
      return overviewQuery.data.projects || []
    }
    if (shouldUseMockData) {
      return filterProjectsByScope(mockProjects, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery?.isSuccess,
    overviewQuery?.data,
    shouldUseMockData,
    mockProjects,
    currentOrgId,
    currentDivisionId,
  ])

  const docs = React.useMemo(() => {
    if (overviewQuery?.isSuccess && overviewQuery?.data) {
      return filterDocsByDivision(overviewQuery.data.docs || [], currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterDocsByScope(mockDocs, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery?.isSuccess,
    overviewQuery?.data,
    shouldUseMockData,
    mockDocs,
    currentOrgId,
    currentDivisionId,
  ])

  const tasks = React.useMemo(() => {
    if (overviewQuery?.isSuccess && overviewQuery?.data) {
      return filterTasksByDivision(overviewQuery.data.tasks || [], currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterTasksByScope(mockTasks, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery?.isSuccess,
    overviewQuery?.data,
    shouldUseMockData,
    mockTasks,
    currentOrgId,
    currentDivisionId,
  ])

  const canOpenProjects = isFeatureEnabled('projects.detail', process.env.NODE_ENV !== 'production')
  const workspaceBasePath = currentOrgId && currentDivisionId ? `/${currentOrgId}/${currentDivisionId}` : null

  const handleProjectOpen = React.useCallback((projectId: string) => {
    if (!workspaceBasePath || !canOpenProjects) {
      return
    }
    // Use the enhanced navigation from scope context for proper URL synchronization
    navigateToProject(projectId)
  }, [workspaceBasePath, canOpenProjects, navigateToProject])

  const handleProjectSelect = React.useCallback((project: ProjectSummary) => {
    handleProjectOpen(project.id)
  }, [handleProjectOpen])

  const toggleSection = React.useCallback((section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }, [])

  const handleDivisionSelect = React.useCallback((orgId: string, divisionId: string) => {
    if (currentOrganization?.id === orgId) {
      void setDivision(divisionId)
    } else {
      void setScope(orgId, divisionId)
    }
  }, [currentOrganization?.id, setDivision, setScope])

  const projectCountForDivision = React.useCallback(
    (divisionId: string) => {
      if (overviewQuery?.isSuccess && overviewQuery?.data) {
        return countProjectsForDivisionLive(overviewQuery.data.projects || [], divisionId)
      }
      if (shouldUseMockData) {
        return countProjectsForDivision(mockProjects, currentOrgId, divisionId)
      }
      return 0
    },
    [overviewQuery?.isSuccess, overviewQuery?.data, shouldUseMockData, mockProjects, currentOrgId],
  )

  const showTemplatesBanner = overviewQuery?.isSuccess && overviewQuery.data?.hasTemplates && shouldShowTemplatesBanner

  // Safety check: ensure overviewQuery is defined
  if (!overviewQuery) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  // Safety check: ensure scope context values are defined
  if (!setScope || !setDivision) {
    console.error('ExplorerContent: Critical scope functions are undefined')
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-center h-full">
          <AlertCircle className="h-6 w-6 text-destructive mr-2" />
          <span className="text-sm text-destructive">Scope context error</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search workspace..." className="pl-9 h-8 bg-surface-elevated border-border" />
        </div>
        {showTemplatesBanner && (
          <div className="rounded-lg border border-dashed border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand-foreground flex items-center justify-between">
            <span>Sample projects are ready to customise. Edit or delete them to make this workspace yours.</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismissTemplatesBanner}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('divisions')}
            >
              {expandedSections.includes('divisions') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Divisions
            </Button>
            {expandedSections.includes('divisions') && (
              <div className="ml-4 space-y-1">
                {currentOrganization ? (
                  currentOrganization.divisions.map((division) => (
                    <button
                      key={division.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent/50',
                        currentDivision?.id === division.id && 'bg-accent',
                      )}
                      onClick={() => handleDivisionSelect(currentOrganization.id, division.id)}
                    >
                      <span className="text-sm">{division.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {projectCountForDivision(division.id)}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Select an organization to see its divisions.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('projects')}
            >
              {expandedSections.includes('projects') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Projects
            </Button>
            {expandedSections.includes('projects') && (
              <div className="ml-4">
                <ProjectList
                  compact={true}
                  showCreateButton={false}
                  showHeader={false}
                  onProjectSelect={handleProjectSelect}
                />
              </div>
            )}
          </div>

          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('docs')}
            >
              {expandedSections.includes('docs') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Documentation
            </Button>
            {expandedSections.includes('docs') && (
              <div className="ml-4 space-y-1">
                {overviewQuery.isPending && liveDataEnabled && !shouldUseMockData ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading documents...
                  </div>
                ) : overviewQuery.isError && !shouldUseMockData ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load documents.
                  </div>
                ) : docs.length > 0 ? (
                  docs.map((doc) => (
                    <div key={'id' in doc ? doc.id : `doc-${Math.random()}`} className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm">{'name' in doc ? doc.name : 'Untitled Document'}</span>
                        {'isTemplate' in doc && doc.isTemplate && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            Sample
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Switch to a division to load its documentation.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <ProjectCrudForm
          onSuccess={(project) => navigateToProject(project.id)}
        >
          <Button variant="outline" size="sm" className="w-full justify-center">
            <Plus className="size-4 mr-2" />
            New Project
          </Button>
        </ProjectCrudForm>
      </div>
    </div>
  )
}

function ChannelsContent({ className }: ChannelsContentProps) {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['channels', 'dms'])
  const { currentOrgId, currentDivisionId } = useScope()

  // Fix: Use individual selectors to prevent infinite re-renders caused by object creation
  const channelSearch = useWorkspaceStore((state) => state.channelSearch)
  const setChannelSearch = useWorkspaceStore((state) => state.setChannelSearch)

  const liveDataEnabled = isFeatureEnabled('workspace.liveData', true)

  const channelsQuery = useDivisionChannelsQuery(currentOrgId, currentDivisionId, {
    enabled: liveDataEnabled && Boolean(currentOrgId && currentDivisionId),
  })

  const mockChannels = useMockConversationStore(
    React.useCallback(
      (state) => selectChannelsForScope(state, currentOrgId, currentDivisionId),
      [currentDivisionId, currentOrgId],
    ),
  )

  const dmUsers = useMockConversationStore(
    React.useCallback(
      (state) => selectDirectMessageUsersForScope(state, currentOrgId, currentDivisionId),
      [currentDivisionId, currentOrgId],
    ),
  )

  const updateChannelMutation = useUpdateChannelMutation()
  const toggleChannelFavoriteMock = useMockConversationStore((state) => state.toggleChannelFavorite)
  const toggleChannelMuteMock = useMockConversationStore((state) => state.toggleChannelMute)
  const markDirectMessageRead = useMockConversationStore((state) => state.markDirectMessageRead)

  const shouldUseMockChannels = !liveDataEnabled

  const channels: WorkspaceChannel[] = React.useMemo(() => {
    if (channelsQuery.isSuccess) {
      return channelsQuery.data.items
    }
    if (shouldUseMockChannels) {
      return mockChannels
    }
    return []
  }, [channelsQuery.isSuccess, channelsQuery.data, shouldUseMockChannels, mockChannels])

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(channelSearch.toLowerCase()),
  )

  const buildScopedPath = React.useCallback(
    (suffix: string) => {
      if (!currentOrgId || !currentDivisionId) {
        return '/workspace-hub'
      }
      return `/${currentOrgId}/${currentDivisionId}${suffix}`
    },
    [currentDivisionId, currentOrgId],
  )

  const toggleSection = React.useCallback((section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    )
  }, [])

  const handleToggleFavorite = async (channel: WorkspaceChannel) => {
    if (!liveDataEnabled || !currentOrgId) {
      toggleChannelFavoriteMock(channel.id)
      return
    }
    try {
      await updateChannelMutation.mutateAsync({
        channelId: channel.id,
        orgId: currentOrgId,
        payload: {
          name: channel.slug,
          slug: channel.slug,
          channelType: channel.channelType,
          topic: channel.topic ?? '',
          description: channel.description ?? '',
          divisionId: channel.divisionId ?? currentDivisionId ?? null,
          isFavorite: !channel.isFavorite,
          isMuted: channel.isMuted,
        },
      })
      await channelsQuery.refetch()
    } catch (error) {
      toast({
        title: 'Unable to update channel',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleToggleMute = async (channel: WorkspaceChannel) => {
    if (!liveDataEnabled || !currentOrgId) {
      toggleChannelMuteMock(channel.id)
      return
    }
    try {
      await updateChannelMutation.mutateAsync({
        channelId: channel.id,
        orgId: currentOrgId,
        payload: {
          name: channel.slug,
          slug: channel.slug,
          channelType: channel.channelType,
          topic: channel.topic ?? '',
          description: channel.description ?? '',
          divisionId: channel.divisionId ?? currentDivisionId ?? null,
          isFavorite: channel.isFavorite,
          isMuted: !channel.isMuted,
        },
      })
      await channelsQuery.refetch()
    } catch (error) {
      toast({
        title: 'Unable to update channel',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            className="pl-9 h-8 bg-surface-elevated border-border"
            value={channelSearch}
            onChange={(event) => setChannelSearch(event.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
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
                {channelsQuery.isPending && liveDataEnabled ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading channels...
                  </div>
                ) : channelsQuery.isError ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load channels.
                  </div>
                ) : filteredChannels.length > 0 ? (
                  filteredChannels.map((channel) => {
                    const Icon = channel.channelType === 'private' ? Lock : Hash
                    return (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 group"
                      >
                        <button
                          type="button"
                          className="flex flex-1 items-center gap-2"
                          onClick={() => router.push(buildScopedPath(`/c/${channel.id}`))}
                        >
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-sm">#{channel.slug}</span>
                          {channel.isTemplate && (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                              Sample
                            </Badge>
                          )}
                          {channel.isFavorite && <Star className="size-3 fill-current text-yellow-500" />}
                          {channel.isMuted && <BellOff className="size-3 text-muted-foreground" />}
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleToggleFavorite(channel)
                            }}
                          >
                            <Star className={cn('size-3', channel.isFavorite && 'fill-current')} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleToggleMute(channel)
                            }}
                          >
                            {channel.isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                          </Button>
                          <ChannelForm
                            orgId={currentOrgId}
                            divisionId={channel.divisionId ?? currentDivisionId}
                            channel={channel}
                            onSuccess={() => {
                              if (liveDataEnabled) {
                                channelsQuery.refetch()
                              }
                            }}
                          >
                            <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground">
                              <Pencil className="size-3" />
                            </Button>
                          </ChannelForm>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No channels match this scope yet.
                  </div>
                )}
              </div>
            )}
          </div>

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
                {dmUsers.length > 0 ? (
                  dmUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => {
                        markDirectMessageRead(user.id)
                        router.push(buildScopedPath(`/dm/${user.id}`))
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('size-2 rounded-full', getStatusColor(user.status))} />
                        <span className="text-sm">{user.name}</span>
                      </div>
                      {(user.unreadCount ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {user.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No teammates linked to this division yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border space-y-2">
        <ChannelForm
          orgId={currentOrgId}
          divisionId={currentDivisionId}
          onSuccess={() => {
            if (liveDataEnabled) {
              channelsQuery.refetch()
            }
          }}
        >
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="size-4 mr-2" />
            Add channel
          </Button>
        </ChannelForm>
        <Button variant="ghost" size="sm" className="w-full">
          <Users className="size-4 mr-2" />
          Invite People
        </Button>
      </div>
    </div>
  )
}

function CalendarContent({ className }: CalendarContentProps) {
  const router = useRouter()
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium">Calendar</h3>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          <div className="text-center p-3 bg-surface-elevated rounded-lg cursor-pointer hover:bg-surface-elevated/80" onClick={() => router.push('/calendar')}>
            <div className="text-lg font-bold">November 2024</div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">TODAY</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-brand/10 border border-brand/20 cursor-pointer hover:bg-brand/20" onClick={() => router.push('/calendar')}>
                <div className="text-sm font-medium">Weekly Standup</div>
                <div className="text-xs text-muted-foreground">10:00 AM - 10:30 AM</div>
              </div>
              <div className="p-2 rounded-lg bg-surface-elevated cursor-pointer hover:bg-accent/50" onClick={() => router.push('/calendar')}>
                <div className="text-sm font-medium">Design Review</div>
                <div className="text-xs text-muted-foreground">2:00 PM - 3:00 PM</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">UPCOMING</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer" onClick={() => router.push('/calendar')}>
                <div className="text-sm font-medium">Sprint Planning</div>
                <div className="text-xs text-muted-foreground">Tomorrow, 9:00 AM</div>
              </div>
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer" onClick={() => router.push('/calendar')}>
                <div className="text-sm font-medium">Client Presentation</div>
                <div className="text-xs text-muted-foreground">Nov 15, 3:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border">
        <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/calendar')}>
          <Plus className="size-4 mr-2" />
          New Event
        </Button>
      </div>
    </div>
  )
}

function WorkspaceContent({ className, liveDataEnabled, overviewQuery }: WorkspaceContentProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['projects', 'tasks'])
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null)
  const router = useRouter()
  const { currentOrgId, currentDivision, currentDivisionId, navigateToProject } = useScope()

  const canOpenProjects = isFeatureEnabled('projects.detail', process.env.NODE_ENV !== 'production')
  const workspaceBasePath = currentOrgId && currentDivisionId ? `/${currentOrgId}/${currentDivisionId}` : null

  const handleProjectOpen = React.useCallback((projectId: string) => {
    if (!canOpenProjects) {
      return
    }
    // Use the enhanced navigation from scope context for proper URL synchronization
    navigateToProject(projectId)
  }, [canOpenProjects, navigateToProject])

  const handleProjectSelectFromList = React.useCallback((project: ProjectSummary) => {
    handleProjectOpen(project.id)
  }, [handleProjectOpen])

  // ALL hooks must be called at the top level before any conditional returns
  const mockProjects = useMockWorkspaceStore((state) => state.projects)
  const mockTasks = useMockWorkspaceStore((state) => state.tasks)

  const shouldUseMockData = !liveDataEnabled || Boolean(overviewQuery?.isError)

  const scopedProjects = React.useMemo(() => {
    if (overviewQuery?.isSuccess && overviewQuery?.data) {
      return filterProjectsByDivision(overviewQuery.data.projects || [], currentOrgId, currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterProjectsByScope(mockProjects, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery?.isSuccess,
    overviewQuery?.data,
    shouldUseMockData,
    mockProjects,
    currentOrgId,
    currentDivisionId,
  ])

  const scopedTasks = React.useMemo(() => {
    if (overviewQuery?.isSuccess && overviewQuery?.data) {
      return filterTasksByDivision(overviewQuery.data.tasks || [], currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterTasksByScope(mockTasks, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery?.isSuccess,
    overviewQuery?.data,
    shouldUseMockData,
    mockTasks,
    currentOrgId,
    currentDivisionId,
  ])

  React.useEffect(() => {
    if (scopedProjects.length === 0) {
      setSelectedItem(null)
      return
    }

    setSelectedItem((previous) =>
      previous && scopedProjects.some((project) => project.id === previous)
        ? previous
        : scopedProjects[0].id
    )
  }, [scopedProjects])

  const toggleSection = React.useCallback((section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }, [])

  const handleProjectSelect = React.useCallback((projectId: string) => {
    setSelectedItem(projectId)
    if (!canOpenProjects) {
      return
    }
    // Use the enhanced navigation from scope context for proper URL synchronization
    navigateToProject(projectId)
  }, [canOpenProjects, navigateToProject])

const handleTaskSelect = React.useCallback((taskId: string) => {
    setSelectedItem(taskId)
    if (!workspaceBasePath) {
      return
    }
    router.push(`${workspaceBasePath}/tasks/${taskId}`)
  }, [workspaceBasePath, router])

  // Safety check: ensure overviewQuery is defined
  if (!overviewQuery) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={
              currentDivision
                ? `Search ${currentDivision.name.toLowerCase()} work...`
                : 'Search projects and tasks...'
            }
            className="pl-9 h-8 bg-surface-elevated border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {/* Projects */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('projects')}
            >
              {expandedSections.includes('projects') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Projects
            </Button>
            {expandedSections.includes('projects') && (
              <div className="ml-4">
                <ProjectList
                  compact={true}
                  showCreateButton={false}
                  showHeader={false}
                  onProjectSelect={handleProjectSelectFromList}
                />
              </div>
            )}
          </div>

          {/* Tasks */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('tasks')}
            >
              {expandedSections.includes('tasks') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              My Tasks
            </Button>
            {expandedSections.includes('tasks') && (
              <div className="ml-4 space-y-1">
                {overviewQuery.isPending && liveDataEnabled && !shouldUseMockData ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading tasks...
                  </div>
                ) : overviewQuery.isError && !shouldUseMockData ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load tasks.
                  </div>
                ) : scopedTasks.length > 0 ? (
                  scopedTasks.map((task) => (
                    <div
                      key={'id' in task ? task.id : `task-${Math.random()}`}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg cursor-pointer',
                        selectedItem === ('id' in task ? task.id : undefined) ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                      onClick={() => handleTaskSelect('id' in task ? task.id : '')}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', 'dotColor' in task ? task.dotColor : 'bg-gray-500')} />
                        <span className="text-sm">{'name' in task ? task.name : 'Unnamed Task'}</span>
                        {'isTemplate' in task && task.isTemplate && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            Sample
                          </Badge>
                        )}
                      </div>
                      {'badgeVariant' in task && 'priority' in task ? (
                        <Badge variant={task.badgeVariant as any} className="text-xs">
                          {String(task.priority)}
                        </Badge>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Tasks align to the currently active division.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('labels')}
            >
              {expandedSections.includes('labels') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Labels
            </Button>
            {expandedSections.includes('labels') && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm">Bug</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Feature</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Enhancement</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border space-y-2">
        <ProjectCrudForm
          onSuccess={(project) => handleProjectOpen(project.id)}
        >
          <Button variant="outline" size="sm" className="w-full justify-center">
            <Plus className="size-4 mr-2" />
            New Project
          </Button>
        </ProjectCrudForm>
        <Button variant="ghost" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          New Task
        </Button>
      </div>
    </div>
  )
}

function SideBar({ activePanel, className }: SideBarProps) {
  const { currentOrgId, currentDivisionId, currentProjectId } = useScope()
  const liveDataEnabled = isFeatureEnabled('workspace.liveData', true)
  const overviewQuery = useWorkspaceOverviewQuery(currentOrgId, currentDivisionId, {
    enabled: liveDataEnabled && Boolean(currentOrgId),
  })

  const renderContent = () => {
    switch (activePanel) {
      case 'workspace':
        return (
          <WorkspaceContent
            overviewQuery={overviewQuery}
            liveDataEnabled={liveDataEnabled}
          />
        )
      case 'explorer':
        return (
          <ExplorerContent
            overviewQuery={overviewQuery}
            liveDataEnabled={liveDataEnabled}
          />
        )
      case 'channels':
        return <ChannelsContent />
      case 'calendar':
        return <CalendarContent />
      case 'people':
        return <PeopleSidebar />
      case 'admin':
        return <AdminSidebar />
      default:
        return (
          <ExplorerContent
            overviewQuery={overviewQuery}
            liveDataEnabled={liveDataEnabled}
          />
        )
    }
  }

  const isProjectScoped = Boolean(currentProjectId)
  const sidebarContent = isProjectScoped
    ? (
      <>
        {/* Author: Codex | Role: CTO Dev | Date: 2025-10-18 */}
        {/* Ensure project scope renders dedicated navigation to avoid duplicate workspace lists */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-brand/10 border border-brand/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" />
            <span className="text-xs text-brand font-medium">Project Mode</span>
          </div>
        </div>
        <ProjectScopeSidebarContent />
      </>
    )
    : renderContent()

  return (
    <SidebarErrorBoundary>
      <div className={cn(
        "h-full min-w-0 bg-surface-panel border-r border-border flex flex-col relative overflow-hidden",
        className
      )}>
        {sidebarContent}
      </div>
    </SidebarErrorBoundary>
  )
}

export { SideBar, ExplorerContent, ChannelsContent, CalendarContent, WorkspaceContent }
