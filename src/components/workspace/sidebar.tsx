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
import { ProjectForm } from "@/components/forms/project-form"
import { ChannelForm } from "@/components/forms/channel-form"
import { useScope } from "@/contexts/scope-context"
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
  projects.filter((project) => project.divisionId === divisionId).length

const filterProjectsByDivision = (
  projects: WorkspaceProject[],
  orgId?: string | null,
  divisionId?: string | null,
) => {
  if (!orgId) return []
  if (divisionId) {
    return projects.filter((project) => project.divisionId === divisionId)
  }
  return projects
}

const filterDocsByDivision = (
  docs: { divisionId: string | null }[],
  divisionId?: string | null,
) => {
  if (divisionId) {
    return docs.filter((doc) => doc.divisionId === divisionId)
  }
  return docs
}

const filterTasksByDivision = (
  tasks: { divisionId: string | null }[],
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
  const bannerState = useWorkspaceStore((state) => ({
    showBanner: state.showTemplatesBanner,
    dismiss: state.dismissTemplatesBanner,
  }))
  const { currentOrganization, currentOrgId, currentDivision, currentDivisionId, setScope, setDivision } = useScope()

  const mockProjects = useMockWorkspaceStore((state) => state.projects)
  const mockDocs = useMockWorkspaceStore((state) => state.docs)
  const mockTasks = useMockWorkspaceStore((state) => state.tasks)

  const shouldUseMockData = !liveDataEnabled

  const projects: WorkspaceProject[] = React.useMemo(() => {
    if (overviewQuery.isSuccess) {
      return overviewQuery.data.projects
    }
    if (shouldUseMockData) {
      return filterProjectsByScope(mockProjects, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery.isSuccess,
    overviewQuery.data,
    shouldUseMockData,
    mockProjects,
    currentOrgId,
    currentDivisionId,
  ])

  const docs = React.useMemo(() => {
    if (overviewQuery.isSuccess) {
      return filterDocsByDivision(overviewQuery.data.docs, currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterDocsByScope(mockDocs, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery.isSuccess,
    overviewQuery.data,
    shouldUseMockData,
    mockDocs,
    currentOrgId,
    currentDivisionId,
  ])

  const tasks = React.useMemo(() => {
    if (overviewQuery.isSuccess) {
      return filterTasksByDivision(overviewQuery.data.tasks, currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterTasksByScope(mockTasks, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery.isSuccess,
    overviewQuery.data,
    shouldUseMockData,
    mockTasks,
    currentOrgId,
    currentDivisionId,
  ])

  const canOpenProjects = isFeatureEnabled('projects.detail', process.env.NODE_ENV !== 'production')
  const workspaceBasePath = currentOrgId && currentDivisionId ? `/${currentOrgId}/${currentDivisionId}` : null

  const handleProjectOpen = (projectId: string) => {
    if (!workspaceBasePath || !canOpenProjects) {
      return
    }
    router.push(`${workspaceBasePath}/projects/${projectId}`)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const handleDivisionSelect = (orgId: string, divisionId: string) => {
    if (currentOrganization?.id === orgId) {
      void setDivision(divisionId)
    } else {
      void setScope(orgId, divisionId)
    }
  }

  const projectCountForDivision = React.useCallback(
    (divisionId: string) => {
      if (overviewQuery.isSuccess) {
        return countProjectsForDivisionLive(overviewQuery.data.projects, divisionId)
      }
      if (shouldUseMockData) {
        return countProjectsForDivision(mockProjects, currentOrgId, divisionId)
      }
      return 0
    },
    [overviewQuery.isSuccess, overviewQuery.data, shouldUseMockData, mockProjects, currentOrgId],
  )

  const showTemplatesBanner = overviewQuery.isSuccess && overviewQuery.data.hasTemplates && bannerState.showBanner

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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={bannerState.dismiss}>
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
              <div className="ml-4 space-y-1">
                {overviewQuery.isPending && liveDataEnabled ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading scoped projects...
                  </div>
                ) : overviewQuery.isError ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load projects.
                  </div>
                ) : projects.length > 0 ? (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-accent/50"
                    >
                      <button
                        type="button"
                        className={cn(
                          'flex flex-1 items-center justify-between text-left',
                          canOpenProjects ? '' : 'cursor-not-allowed opacity-60',
                        )}
                        onClick={() => handleProjectOpen(project.id)}
                        disabled={!canOpenProjects || !workspaceBasePath}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{project.name}</span>
                          {project.isTemplate && (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                              Sample
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {project.badgeCount}
                        </Badge>
                      </button>
                      <ProjectForm
                        orgId={currentOrgId}
                        divisionId={project.divisionId ?? currentDivisionId}
                        project={project}
                        onSuccess={() => {
                          if (liveDataEnabled) {
                            overviewQuery.refetch()
                          }
                        }}
                      >
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </ProjectForm>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Select a division to see scoped projects.</p>
                )}
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
                {overviewQuery.isPending && liveDataEnabled ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-3">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading documents...
                  </div>
                ) : overviewQuery.isError ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load documents.
                  </div>
                ) : docs.length > 0 ? (
                  docs.map((doc) => (
                    <div key={doc.id} className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm">{doc.name}</span>
                        {doc.isTemplate && (
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
        <ProjectForm
          orgId={currentOrgId}
          divisionId={currentDivisionId}
          onSuccess={() => {
            if (liveDataEnabled) {
              overviewQuery.refetch()
            }
          }}
        >
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="size-4 mr-2" />
            New project
          </Button>
        </ProjectForm>
      </div>
    </div>
  )
}

function ChannelsContent({ className }: ChannelsContentProps) {
  const router = useRouter()
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['channels', 'dms'])
  const { currentOrgId, currentDivisionId } = useScope()
  const store = useWorkspaceStore((state) => ({
    search: state.channelSearch,
    setSearch: state.setChannelSearch,
  }))
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
    channel.name.toLowerCase().includes(store.search.toLowerCase()),
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

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    )
  }

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
            value={store.search}
            onChange={(event) => store.setSearch(event.target.value)}
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
  const { currentOrgId, currentDivision, currentDivisionId } = useScope()
  const mockProjects = useMockWorkspaceStore((state) => state.projects)
  const mockTasks = useMockWorkspaceStore((state) => state.tasks)

  const shouldUseMockData = !liveDataEnabled

  const scopedProjects = React.useMemo(() => {
    if (overviewQuery.isSuccess) {
      return filterProjectsByDivision(overviewQuery.data.projects, currentOrgId, currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterProjectsByScope(mockProjects, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery.isSuccess,
    overviewQuery.data,
    shouldUseMockData,
    mockProjects,
    currentOrgId,
    currentDivisionId,
  ])

  const scopedTasks = React.useMemo(() => {
    if (overviewQuery.isSuccess) {
      return filterTasksByDivision(overviewQuery.data.tasks, currentDivisionId)
    }
    if (shouldUseMockData) {
      return filterTasksByScope(mockTasks, currentOrgId, currentDivisionId)
    }
    return []
  }, [
    overviewQuery.isSuccess,
    overviewQuery.data,
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

  const canOpenProjects = isFeatureEnabled("projects.detail", process.env.NODE_ENV !== "production")
  const workspaceBasePath =
    currentOrgId && currentDivisionId ? `/${currentOrgId}/${currentDivisionId}` : null

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const handleProjectSelect = (projectId: string) => {
    setSelectedItem(projectId)
    if (!workspaceBasePath || !canOpenProjects) {
      return
    }
    router.push(`${workspaceBasePath}/projects/${projectId}`)
  }

  const handleTaskSelect = (taskId: string) => {
    setSelectedItem(taskId)
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
              <div className="ml-4 space-y-1">
                {overviewQuery.isPending && liveDataEnabled ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading projects...
                  </div>
                ) : overviewQuery.isError ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load projects.
                  </div>
                ) : scopedProjects.length > 0 ? (
                  scopedProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg p-2 transition-colors',
                        selectedItem === project.id
                          ? 'bg-accent'
                          : canOpenProjects
                          ? 'hover:bg-accent/50'
                          : 'cursor-not-allowed opacity-60',
                      )}
                      onClick={() => handleProjectSelect(project.id)}
                      disabled={!canOpenProjects || !workspaceBasePath}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', project.dotColor)} />
                        <span className="text-sm">{project.name}</span>
                        {project.isTemplate && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            Sample
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {project.badgeCount}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Projects scoped to this division will appear here.
                  </p>
                )}
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
                {overviewQuery.isPending && liveDataEnabled ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading tasks...
                  </div>
                ) : overviewQuery.isError ? (
                  <div className="flex items-center gap-2 text-xs text-destructive px-2 py-3">
                    <AlertCircle className="h-3 w-3" /> Unable to load tasks.
                  </div>
                ) : scopedTasks.length > 0 ? (
                  scopedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-lg cursor-pointer',
                        selectedItem === task.id ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                      onClick={() => handleTaskSelect(task.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full', task.dotColor)} />
                        <span className="text-sm">{task.name}</span>
                        {task.isTemplate && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide text-muted-foreground"
                          >
                            Sample
                          </Badge>
                        )}
                      </div>
                      <Badge variant={task.badgeVariant} className="text-xs">
                        {task.priority}
                      </Badge>
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
        <ProjectForm
          orgId={currentOrgId}
          divisionId={currentDivisionId}
          onSuccess={() => {
            if (liveDataEnabled) {
              overviewQuery.refetch()
            }
          }}
        >
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="size-4 mr-2" />
            New Project
          </Button>
        </ProjectForm>
        <Button variant="ghost" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          New Task
        </Button>
      </div>
    </div>
  )
}

function SideBar({ activePanel, className }: SideBarProps) {
  const { currentOrgId, currentDivisionId } = useScope()
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
        return <ExplorerContent />
    }
  }

  return (
    <div className={cn(
      "w-64 h-full bg-surface-panel border-r border-border flex flex-col",
      className
    )}>
      {renderContent()}
    </div>
  )
}

export { SideBar, ExplorerContent, ChannelsContent, CalendarContent, WorkspaceContent }
