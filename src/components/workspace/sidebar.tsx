'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ChevronDown, ChevronRight, Hash, Lock, Users, Star, Bell, BellOff, Calendar, FileText } from "lucide-react"
import { PeopleSidebar } from "@/components/people/people-sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { ProjectForm } from "@/components/forms/project-form"
import { ChannelForm } from "@/components/forms/channel-form"
import { useScope } from "@/contexts/scope-context"
import {
  useMockConversationStore,
  selectChannelsForScope,
  selectDirectMessageUsersForScope
} from "@/lib/mock-conversations"
import {
  useMockWorkspaceStore,
  filterProjectsByScope,
  filterTasksByScope,
  filterDocsByScope,
  countProjectsForDivision
} from "@/lib/mock-workspace"

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

interface PeopleContentProps {
  className?: string
}

interface AdminContentProps {
  className?: string
}

interface WorkspaceContentProps {
  className?: string
}

function ExplorerContent({ className }: ExplorerContentProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['divisions', 'projects'])
  const router = useRouter()
  const { currentOrganization, currentOrgId, currentDivision, currentDivisionId, setScope, setDivision } = useScope()

  const projects = useMockWorkspaceStore((state) => state.projects)
  const docs = useMockWorkspaceStore((state) => state.docs)

  const scopedProjects = React.useMemo(
    () => filterProjectsByScope(projects, currentOrgId, currentDivisionId),
    [projects, currentOrgId, currentDivisionId]
  )

  const scopedDocs = React.useMemo(
    () => filterDocsByScope(docs, currentOrgId, currentDivisionId),
    [docs, currentOrgId, currentDivisionId]
  )

  const canOpenProjects = isFeatureEnabled("projects.detail", process.env.NODE_ENV !== "production")
  const workspaceBasePath =
    currentOrgId && currentDivisionId ? `/${currentOrgId}/${currentDivisionId}` : null

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
      setDivision(divisionId)
    } else {
      setScope(orgId, divisionId)
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace..."
            className="pl-9 h-8 bg-surface-elevated border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {/* Divisions */}
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
                  currentOrganization.divisions.map((division) => {
                    const projectCount = countProjectsForDivision(projects, currentOrgId, division.id)
                    return (
                      <button
                        key={division.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg p-2 transition-colors hover:bg-accent/50",
                          currentDivision?.id === division.id && "bg-accent"
                        )}
                        onClick={() => handleDivisionSelect(currentOrganization.id, division.id)}
                      >
                        <span className="text-sm">{division.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {projectCount}
                        </Badge>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an organization to see its divisions.
                  </p>
                )}
              </div>
            )}
          </div>

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
                {scopedProjects.length > 0 ? (
                  scopedProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => handleProjectOpen(project.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg p-2 transition-colors",
                        canOpenProjects ? "hover:bg-accent/50" : "cursor-not-allowed opacity-60"
                      )}
                      disabled={!canOpenProjects || !workspaceBasePath}
                    >
                      <span className="text-sm text-left">{project.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {project.badgeCount}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a division to see scoped projects.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Docs */}
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
                {scopedDocs.length > 0 ? (
                  scopedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    >
                      <span className="text-sm">{doc.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Switch to a division to load its documentation.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-border">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          New Project
        </Button>
      </div>
    </div>
  )
}

function ChannelsContent({ className }: ChannelsContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['channels', 'dms'])
  const { currentOrgId, currentDivisionId } = useScope()

  const channels = useMockConversationStore(
    React.useCallback(
      (state) => selectChannelsForScope(state, currentOrgId, currentDivisionId),
      [currentDivisionId, currentOrgId]
    )
  )

  const dmUsers = useMockConversationStore(
    React.useCallback(
      (state) => selectDirectMessageUsersForScope(state, currentOrgId, currentDivisionId),
      [currentDivisionId, currentOrgId]
    )
  )

  const toggleChannelFavorite = useMockConversationStore((state) => state.toggleChannelFavorite)
  const toggleChannelMute = useMockConversationStore((state) => state.toggleChannelMute)
  const markChannelRead = useMockConversationStore((state) => state.markChannelRead)
  const markDirectMessageRead = useMockConversationStore((state) => state.markDirectMessageRead)

  const buildScopedPath = React.useCallback(
    (suffix: string) => {
      if (!currentOrgId || !currentDivisionId) {
        return '/select-org'
      }
      return `/${currentOrgId}/${currentDivisionId}${suffix}`
    },
    [currentDivisionId, currentOrgId]
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFavorites = !showFavoritesOnly || !!channel.isFavorite
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
                {filteredChannels.length > 0 ? filteredChannels.map(channel => {
                  const Icon = channel.type === 'private' ? Lock : Hash
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer group"
                      onClick={() => {
                        markChannelRead(channel.id)
                        router.push(buildScopedPath(`/c/${channel.id}`))
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="text-sm">#{channel.name}</span>
                        {channel.isFavorite && <Star className="size-3 fill-current text-yellow-500" />}
                        {channel.isMuted && <BellOff className="size-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {(channel.unreadCount ?? 0) > 0 && (
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
                              toggleChannelFavorite(channel.id)
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
                              toggleChannelMute(channel.id)
                            }}
                          >
                            {channel.isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    No channels match this scope yet.
                  </div>
                )}
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
                {dmUsers.length > 0 ? dmUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => {
                      markDirectMessageRead(user.id)
                      router.push(buildScopedPath(`/dm/${user.id}`))
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", getStatusColor(user.status))} />
                      <span className="text-sm">{user.name}</span>
                    </div>
                    {(user.unreadCount ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {user.unreadCount}
                      </Badge>
                    )}
                  </div>
                )) : (
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
        <ChannelForm>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="size-4 mr-2" />
            Add Channel
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

function WorkspaceContent({ className }: WorkspaceContentProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['projects', 'tasks'])
  const [selectedItem, setSelectedItem] = React.useState<string | null>(null)
  const router = useRouter()
  const { currentOrgId, currentDivision, currentDivisionId } = useScope()

  const projects = useMockWorkspaceStore((state) => state.projects)
  const tasks = useMockWorkspaceStore((state) => state.tasks)

  const scopedProjects = React.useMemo(
    () => filterProjectsByScope(projects, currentOrgId, currentDivisionId),
    [projects, currentOrgId, currentDivisionId]
  )

  const scopedTasks = React.useMemo(
    () => filterTasksByScope(tasks, currentOrgId, currentDivisionId),
    [tasks, currentOrgId, currentDivisionId]
  )

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
                {scopedProjects.length > 0 ? (
                  scopedProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg p-2 transition-colors",
                        selectedItem === project.id ? "bg-accent" : canOpenProjects ? "hover:bg-accent/50" : "cursor-not-allowed opacity-60"
                      )}
                      onClick={() => handleProjectSelect(project.id)}
                      disabled={!canOpenProjects || !workspaceBasePath}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", project.dotColor)} />
                        <span className="text-sm">{project.name}</span>
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
                {scopedTasks.length > 0 ? (
                  scopedTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer",
                        selectedItem === task.id ? "bg-accent" : "hover:bg-accent/50"
                      )}
                      onClick={() => handleSelect(task.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", task.dotColor)} />
                        <span className="text-sm">{task.name}</span>
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
        <ProjectForm>
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
  const renderContent = () => {
    switch (activePanel) {
      case 'workspace':
        return <WorkspaceContent />
      case 'explorer':
        return <ExplorerContent />
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
