/**
 * Real-time Activity Feed with Live Event Streaming
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Real-time activity feed showing team actions, task updates,
 * board changes, and collaborative events with live streaming and filtering.
 */

"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useScope } from "@/contexts/scope-context"
import type { KanbanUser, KanbanTask, KanbanColumn } from "@/types/kanban"
import {
  Clock,
  Filter,
  Search,
  RefreshCw,
  Pause,
  Play,
  Settings,
  User,
  MessageSquare,
  Move,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Tag,
  Paperclip,
  Heart,
  Hash,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Download,
  Share2,
  MoreHorizontal
} from "lucide-react"

export interface ActivityEvent {
  id: string
  type: 'task_created' | 'task_updated' | 'task_moved' | 'task_assigned' | 'task_completed' | 'task_deleted' |
        'comment_added' | 'comment_updated' | 'comment_deleted' | 'reaction_added' | 'reaction_removed' |
        'column_created' | 'column_updated' | 'column_deleted' | 'column_reordered' |
        'board_created' | 'board_updated' | 'member_added' | 'member_removed' | 'settings_updated' |
        'file_uploaded' | 'file_deleted' | 'label_added' | 'label_removed'
  title: string
  description?: string
  userId: string
  user: KanbanUser
  boardId: string
  taskId?: string
  columnId?: string
  commentId?: string
  metadata?: Record<string, any>
  timestamp: string
  metadata?: {
    previousValues?: Record<string, any>
    newValues?: Record<string, any>
    changes?: string[]
    mentions?: string[]
    attachments?: string[]
  }
}

export interface ActivityFilter {
  eventTypes: string[]
  users: string[]
  dateRange?: {
    start: string
    end: string
  }
  searchQuery: string
  showSystemEvents: boolean
  showUserActions: boolean
}

export interface ActivityFeedStats {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByUser: Record<string, number>
  activeUsers: number
  timeRange: string
}

interface ActivityFeedProps {
  boardId: string
  boardName: string
  currentUser: KanbanUser
  boardUsers: KanbanUser[]
  events: ActivityEvent[]
  isLoading?: boolean
  isLive?: boolean
  onLoadMore?: () => void
  onRefresh?: () => void
  onToggleLive?: (live: boolean) => void
  onExport?: (format: 'json' | 'csv') => void
  onMarkEventAsRead?: (eventId: string) => void
  onMarkAllAsRead?: () => void
  className?: string
}

const EVENT_ICONS = {
  task_created: Plus,
  task_updated: Edit3,
  task_moved: Move,
  task_assigned: User,
  task_completed: CheckCircle,
  task_deleted: Trash2,
  comment_added: MessageSquare,
  comment_updated: Edit3,
  comment_deleted: Trash2,
  reaction_added: Heart,
  reaction_removed: Heart,
  column_created: Plus,
  column_updated: Edit3,
  column_deleted: Trash2,
  column_reordered: Move,
  board_created: Plus,
  board_updated: Edit3,
  member_added: Users,
  member_removed: Users,
  settings_updated: Settings,
  file_uploaded: Paperclip,
  file_deleted: Trash2,
  label_added: Tag,
  label_removed: Tag
}

const EVENT_COLORS = {
  task_created: "text-green-600",
  task_updated: "text-blue-600",
  task_moved: "text-orange-600",
  task_assigned: "text-purple-600",
  task_completed: "text-emerald-600",
  task_deleted: "text-red-600",
  comment_added: "text-blue-600",
  comment_updated: "text-indigo-600",
  comment_deleted: "text-red-600",
  reaction_added: "text-pink-600",
  reaction_removed: "text-gray-600",
  column_created: "text-green-600",
  column_updated: "text-blue-600",
  column_deleted: "text-red-600",
  column_reordered: "text-orange-600",
  board_created: "text-green-600",
  board_updated: "text-blue-600",
  member_added: "text-emerald-600",
  member_removed: "text-orange-600",
  settings_updated: "text-gray-600",
  file_uploaded: "text-blue-600",
  file_deleted: "text-red-600",
  label_added: "text-purple-600",
  label_removed: "text-gray-600"
}

const EVENT_TYPE_LABELS = {
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_moved: "Task Moved",
  task_assigned: "Task Assigned",
  task_completed: "Task Completed",
  task_deleted: "Task Deleted",
  comment_added: "Comment Added",
  comment_updated: "Comment Updated",
  comment_deleted: "Comment Deleted",
  reaction_added: "Reaction Added",
  reaction_removed: "Reaction Removed",
  column_created: "Column Created",
  column_updated: "Column Updated",
  column_deleted: "Column Deleted",
  column_reordered: "Column Reordered",
  board_created: "Board Created",
  board_updated: "Board Updated",
  member_added: "Member Added",
  member_removed: "Member Removed",
  settings_updated: "Settings Updated",
  file_uploaded: "File Uploaded",
  file_deleted: "File Deleted",
  label_added: "Label Added",
  label_removed: "Label Removed"
}

export function ActivityFeed({
  boardId,
  boardName,
  currentUser,
  boardUsers,
  events,
  isLoading = false,
  isLive = true,
  onLoadMore,
  onRefresh,
  onToggleLive,
  onExport,
  onMarkEventAsRead,
  onMarkAllAsRead,
  className
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityFilter>({
    eventTypes: [],
    users: [],
    searchQuery: "",
    showSystemEvents: true,
    showUserActions: true
  })
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [groupBy, setGroupBy] = useState<'time' | 'user' | 'type'>('time')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  const feedEndRef = useRef<HTMLDivElement>(null)
  const { currentOrgId, currentDivisionId } = useScope()

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !isLive) return

    const interval = setInterval(() => {
      onRefresh?.()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, isLive, onRefresh])

  // Scroll to bottom when new events arrive (if at bottom)
  useEffect(() => {
    if (feedEndRef.current) {
      const isAtBottom = feedEndRef.current.getBoundingClientRect().top <= window.innerHeight
      if (isAtBottom) {
        feedEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [events])

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Filter by event types
    if (filter.eventTypes.length > 0) {
      filtered = filtered.filter(event => filter.eventTypes.includes(event.type))
    }

    // Filter by users
    if (filter.users.length > 0) {
      filtered = filtered.filter(event => filter.users.includes(event.userId))
    }

    // Filter by search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.user.name.toLowerCase().includes(query)
      )
    }

    // Filter by system/user events
    if (!filter.showSystemEvents) {
      const systemEventTypes = ['board_created', 'board_updated', 'settings_updated']
      filtered = filtered.filter(event => !systemEventTypes.includes(event.type))
    }

    if (!filter.showUserActions) {
      const userActionTypes = ['task_created', 'task_updated', 'task_moved', 'comment_added']
      filtered = filtered.filter(event => !userActionTypes.includes(event.type))
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return filtered
  }, [events, filter])

  // Group events
  const groupedEvents = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {}

    filteredEvents.forEach(event => {
      let groupKey: string

      switch (groupBy) {
        case 'time':
          const eventDate = new Date(event.timestamp)
          const now = new Date()
          const diffInHours = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60))

          if (diffInHours < 1) {
            groupKey = 'Just now'
          } else if (diffInHours < 24) {
            groupKey = 'Today'
          } else if (diffInHours < 48) {
            groupKey = 'Yesterday'
          } else if (diffInHours < 168) { // 7 days
            groupKey = 'This week'
          } else {
            groupKey = 'Older'
          }
          break

        case 'user':
          groupKey = event.user.name
          break

        case 'type':
          groupKey = EVENT_TYPE_LABELS[event.type] || event.type
          break

        default:
          groupKey = 'All events'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(event)
    })

    return groups
  }, [filteredEvents, groupBy])

  // Calculate stats
  const stats: ActivityFeedStats = useMemo(() => {
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByUser = events.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uniqueUsers = new Set(events.map(e => e.userId)).size

    const oldestEvent = events[events.length - 1]
    const timeRange = oldestEvent
      ? `${Math.floor((new Date().getTime() - new Date(oldestEvent.timestamp).getTime()) / (1000 * 60 * 60))}h`
      : '0h'

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByUser,
      activeUsers: uniqueUsers,
      timeRange
    }
  }, [events])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMinutes / 60)

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`

    return date.toLocaleDateString()
  }

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const handleExport = (format: 'json' | 'csv') => {
    onExport?.(format)
  }

  const getEventDescription = (event: ActivityEvent) => {
    switch (event.type) {
      case 'task_created':
        return `created task "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'task_updated':
        return `updated task "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'task_moved':
        return `moved task from "${event.metadata?.fromColumn || 'Unknown'}" to "${event.metadata?.toColumn || 'Unknown'}"`
      case 'task_assigned':
        return `assigned task to ${event.metadata?.assigneeName || 'Unknown user'}`
      case 'task_completed':
        return `completed task "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'task_deleted':
        return `deleted task "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'comment_added':
        return `added a comment to "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'comment_updated':
        return `updated their comment on "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'comment_deleted':
        return `deleted a comment from "${event.metadata?.taskTitle || 'Unknown task'}"`
      case 'reaction_added':
        return `reacted with ${event.metadata?.reaction || 'emoji'} to a comment`
      case 'reaction_removed':
        return `removed their reaction`
      case 'column_created':
        return `created column "${event.metadata?.columnName || 'Unknown column'}"`
      case 'column_updated':
        return `updated column "${event.metadata?.columnName || 'Unknown column'}"`
      case 'column_deleted':
        return `deleted column "${event.metadata?.columnName || 'Unknown column'}"`
      case 'column_reordered':
        return `reordered columns`
      case 'board_created':
        return `created this board`
      case 'board_updated':
        return `updated board settings`
      case 'member_added':
        return `added ${event.metadata?.memberName || 'a member'} to the board`
      case 'member_removed':
        return `removed ${event.metadata?.memberName || 'a member'} from the board`
      case 'settings_updated':
        return `updated board settings`
      case 'file_uploaded':
        return `uploaded file "${event.metadata?.fileName || 'Unknown file'}"`
      case 'file_deleted':
        return `deleted file "${event.metadata?.fileName || 'Unknown file'}"`
      case 'label_added':
        return `added label "${event.metadata?.labelName || 'Unknown label'}"`
      case 'label_removed':
        return `removed label "${event.metadata?.labelName || 'Unknown label'}"`
      default:
        return event.description || 'performed an action'
    }
  }

  const EventItem = ({ event, showGroup = false }: { event: ActivityEvent; showGroup?: boolean }) => {
    const Icon = EVENT_ICONS[event.type]
    const colorClass = EVENT_COLORS[event.type]
    const isExpanded = expandedEvents.has(event.id)
    const isCurrentUser = event.userId === currentUser.id

    return (
      <div className="p-3 border-b last:border-b-0 hover:bg-accent/30 transition-colors">
        <div className="flex gap-3">
          <div className={`mt-0.5 ${colorClass} flex-shrink-0`}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={event.user.avatar} alt={event.user.name} />
                    <AvatarFallback className="text-[8px]">
                      {event.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">
                    {isCurrentUser ? 'You' : event.user.name}
                  </span>
                  {!showGroup && (
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getEventDescription(event)}
                </p>

                {/* Expanded details */}
                {isExpanded && event.metadata && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    {event.metadata.changes && event.metadata.changes.length > 0 && (
                      <div className="mb-2">
                        <span className="font-medium">Changes:</span>
                        <ul className="mt-1 ml-2 space-y-1">
                          {event.metadata.changes.map((change, index) => (
                            <li key={index}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {event.metadata.previousValues && (
                      <div className="mb-2">
                        <span className="font-medium">Previous values:</span>
                        <pre className="mt-1 text-xs">
                          {JSON.stringify(event.metadata.previousValues, null, 2)}
                        </pre>
                      </div>
                    )}

                    {event.metadata.newValues && (
                      <div>
                        <span className="font-medium">New values:</span>
                        <pre className="mt-1 text-xs">
                          {JSON.stringify(event.metadata.newValues, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                {event.metadata && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs mt-2"
                    onClick={() => toggleEventExpansion(event.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show details
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Feed
              {isLive && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              )}
            </CardTitle>
            <Badge variant="secondary">{stats.totalEvents} events</Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onRefresh?.()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleLive?.(!isLive)}
            >
              {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={filter.searchQuery}
                    onChange={(e) => setFilter(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="pl-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Event Type</Label>
                <Select
                  value={filter.eventTypes[0] || ''}
                  onValueChange={(value) =>
                    setFilter(prev => ({
                      ...prev,
                      eventTypes: value ? [value] : []
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
                      <SelectItem key={type} value={type}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">User</Label>
                <Select
                  value={filter.users[0] || ''}
                  onValueChange={(value) =>
                    setFilter(prev => ({
                      ...prev,
                      users: value ? [value] : []
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All users</SelectItem>
                    {boardUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Group by</Label>
                <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-system-events"
                  checked={filter.showSystemEvents}
                  onCheckedChange={(checked) =>
                    setFilter(prev => ({ ...prev, showSystemEvents: checked }))
                  }
                />
                <Label htmlFor="show-system-events" className="text-sm">
                  System events
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-user-actions"
                  checked={filter.showUserActions}
                  onCheckedChange={(checked) =>
                    setFilter(prev => ({ ...prev, showUserActions: checked }))
                  }
                />
                <Label htmlFor="show-user-actions" className="text-sm">
                  User actions
                </Label>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Auto-refresh</h4>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh the activity feed
                </p>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>

            {autoRefresh && (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Refresh interval</h4>
                  <p className="text-sm text-muted-foreground">
                    How often to refresh the feed
                  </p>
                </div>
                <Select
                  value={refreshInterval.toString()}
                  onValueChange={(value) => setRefreshInterval(parseInt(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">1m</SelectItem>
                    <SelectItem value="300">5m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading activity...</span>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground">
              Events will appear here as team members work on the board
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-0">
              {Object.entries(groupedEvents).map(([groupName, groupEvents]) => (
                <div key={groupName}>
                  {groupBy !== 'time' && (
                    <div className="sticky top-0 bg-background border-b px-4 py-2 z-10">
                      <h4 className="text-sm font-medium">{groupName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {groupEvents.map((event, index) => (
                    <EventItem
                      key={event.id}
                      event={event}
                      showGroup={groupBy === 'time' && index === 0}
                    />
                  ))}
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>

            {/* Load more button */}
            {onLoadMore && (
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more activity'
                  )}
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for managing activity feed
export function useActivityFeed(
  boardId: string,
  currentUser: KanbanUser,
  initialEvents: ActivityEvent[] = []
) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents)
  const [isLoading, setIsLoading] = useState(false)
  const [isLive, setIsLive] = useState(true)
  const [stats, setStats] = useState<ActivityFeedStats>({
    totalEvents: 0,
    eventsByType: {},
    eventsByUser: {},
    activeUsers: 0,
    timeRange: '0h'
  })

  // Simulated real-time event updates
  useEffect(() => {
    if (!isLive) return

    // In a real implementation, this would connect to WebSocket
    const interval = setInterval(() => {
      // Simulate receiving new events
      // const newEvent = generateMockEvent()
      // setEvents(prev => [newEvent, ...prev])
    }, 5000)

    return () => clearInterval(interval)
  }, [isLive])

  // Update stats when events change
  useEffect(() => {
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const eventsByUser = events.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const uniqueUsers = new Set(events.map(e => e.userId)).size

    const oldestEvent = events[events.length - 1]
    const timeRange = oldestEvent
      ? `${Math.floor((new Date().getTime() - new Date(oldestEvent.timestamp).getTime()) / (1000 * 60 * 60))}h`
      : '0h'

    setStats({
      totalEvents: events.length,
      eventsByType,
      eventsByUser,
      activeUsers: uniqueUsers,
      timeRange
    })
  }, [events])

  const addEvent = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString()
    }

    setEvents(prev => [newEvent, ...prev])
    return newEvent
  }, [])

  const refreshEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch events from API
      // const response = await fetchBoardEvents(boardId)
      // setEvents(response)
    } catch (error) {
      console.error('Failed to refresh events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [boardId])

  const exportEvents = useCallback((format: 'json' | 'csv') => {
    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(events, null, 2)
      filename = `activity-${boardId}-${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    } else {
      // Simple CSV export
      const headers = ['Timestamp', 'User', 'Type', 'Title', 'Description']
      const rows = events.map(event => [
        event.timestamp,
        event.user.name,
        event.type,
        event.title,
        event.description || ''
      ])

      content = [headers, ...rows].map(row => row.join(',')).join('\n')
      filename = `activity-${boardId}-${new Date().toISOString().split('T')[0]}.csv`
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [events, boardId])

  return {
    events,
    stats,
    isLoading,
    isLive,
    addEvent,
    refreshEvents,
    exportEvents,
    toggleLive: setIsLive
  }
}