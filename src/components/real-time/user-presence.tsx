/**
 * User Presence Indicators with Real-time Status and Cursor Tracking
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Real-time user presence system showing online status, cursor positions,
 * viewing activity, and collaborative interactions on the kanban board.
 */

"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useScope } from "@/contexts/scope-context"
import type { KanbanUser } from "@/types/kanban"
import type {
  UserPresence,
  UserCursor,
  CollaborationState,
  NotificationPreferences
} from "@/lib/collaboration-utils"
import {
  Circle,
  Users,
  Eye,
  Edit3,
  Move,
  MousePointer2,
  MoreHorizontal,
  Settings,
  Bell,
  BellOff,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  EyeOff
} from "lucide-react"

interface UserPresenceProps {
  boardId: string
  boardUsers: KanbanUser[]
  currentUser: KanbanUser
  collaborationState: CollaborationState
  onInviteUser?: (userId: string) => void
  onRemoveUser?: (userId: string) => void
  onChangeUserPermissions?: (userId: string, permissions: string[]) => void
  onMuteUser?: (userId: string, muted: boolean) => void
  onBlockUser?: (userId: string, blocked: boolean) => void
  className?: string
}

interface PresenceIndicatorProps {
  user: KanbanUser
  presence: UserPresence
  showName?: boolean
  showStatus?: boolean
  size?: "sm" | "md" | "lg"
  onClick?: () => void
}

interface CursorOverlayProps {
  cursors: Record<string, UserCursor>
  currentUser: KanbanUser
  containerRef: React.RefObject<HTMLElement>
}

const STATUS_COLORS = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-400"
}

const STATUS_LABELS = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline"
}

const USER_ROLES = {
  owner: { icon: Crown, label: "Owner", color: "text-yellow-600" },
  admin: { icon: Shield, label: "Admin", color: "text-blue-600" },
  editor: { icon: Edit3, label: "Editor", color: "text-green-600" },
  viewer: { icon: Eye, label: "Viewer", color: "text-gray-600" }
}

const PRESENCE_TIMEOUT = 30000 // 30 seconds

export function UserPresence({
  boardId,
  boardUsers,
  currentUser,
  collaborationState,
  onInviteUser,
  onRemoveUser,
  onChangeUserPermissions,
  onMuteUser,
  onBlockUser,
  className
}: UserPresenceProps) {
  const [showUserList, setShowUserList] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set())
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())
  const [notificationSettings, setNotificationSettings] = useState<NotificationPreferences>({
    taskAssigned: true,
    taskMoved: true,
    taskCommented: true,
    taskCompleted: true,
    mentionReceived: true,
    boardInvitation: true,
    dueDateReminder: true,
    pushEnabled: true,
    emailEnabled: false
  })

  const containerRef = useRef<HTMLElement>(null)
  const { currentOrgId, currentDivisionId } = useScope()

  // Clean up stale presence data
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const staleThreshold = new Date(now.getTime() - PRESENCE_TIMEOUT)

      Object.entries(collaborationState.users).forEach(([userId, presence]) => {
        if (new Date(presence.lastSeen) < staleThreshold && presence.status !== 'offline') {
          // Update user to offline (this would typically be handled by the real-time system)
        }
      })
    }, PRESENCE_TIMEOUT)

    return () => clearInterval(interval)
  }, [collaborationState.users])

  const getActiveUsers = useCallback(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() - PRESENCE_TIMEOUT)

    return boardUsers.filter(user => {
      const presence = collaborationState.users[user.id]
      if (!presence) return false

      // Filter out blocked users
      if (blockedUsers.has(user.id)) return false

      // Consider user active if they're online or recently active
      return presence.status === 'online' || new Date(presence.lastSeen) > threshold
    })
  }, [boardUsers, collaborationState.users, blockedUsers])

  const getUsersInColumn = useCallback((columnId: string) => {
    return getActiveUsers().filter(user => {
      const presence = collaborationState.users[user.id]
      return presence?.currentColumnId === columnId
    })
  }, [getActiveUsers, collaborationState.users])

  const getUsersViewingTask = useCallback((taskId: string) => {
    return getActiveUsers().filter(user => {
      const presence = collaborationState.users[user.id]
      return presence?.currentTaskId === taskId
    })
  }, [getActiveUsers, collaborationState.users])

  const handleMuteUser = useCallback((userId: string, muted: boolean) => {
    if (muted) {
      setMutedUsers(prev => new Set(prev).add(userId))
    } else {
      setMutedUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
    onMuteUser?.(userId, muted)
  }, [onMuteUser])

  const handleBlockUser = useCallback((userId: string, blocked: boolean) => {
    if (blocked) {
      setBlockedUsers(prev => new Set(prev).add(userId))
    } else {
      setBlockedUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
    onBlockUser?.(userId, blocked)
  }, [onBlockUser])

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const activeUsers = getActiveUsers()
  const onlineCount = activeUsers.filter(u => collaborationState.users[u.id]?.status === 'online').length

  return (
    <div className={className}>
      {/* Main presence indicator */}
      <div className="flex items-center gap-2">
        <Popover open={showUserList} onOpenChange={setShowUserList}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Users className="h-4 w-4 mr-2" />
              {onlineCount} online
              {activeUsers.length > onlineCount && (
                <span className="text-muted-foreground">/{activeUsers.length}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Board Members</h4>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-muted-foreground">{onlineCount}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} viewing this board
              </p>
            </div>

            <ScrollArea className="h-64">
              <div className="p-2">
                {activeUsers.map(user => {
                  const presence = collaborationState.users[user.id]
                  const isMuted = mutedUsers.has(user.id)
                  const isBlocked = blockedUsers.has(user.id)
                  const isCurrentUser = user.id === currentUser.id

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0 -right-0 w-3 h-3 rounded-full border-2 border-background ${
                          STATUS_COLORS[presence?.status || 'offline']
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          {isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                          {isBlocked && <EyeOff className="h-3 w-3 text-destructive" />}
                          {isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{STATUS_LABELS[presence?.status || 'offline']}</span>
                          {presence?.currentTaskId && (
                            <>
                              <span>•</span>
                              <span>Viewing task</span>
                            </>
                          )}
                          {presence?.lastSeen && (
                            <>
                              <span>•</span>
                              <span>{formatLastSeen(presence.lastSeen)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1">
                            <div className="space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 px-2"
                                onClick={() => handleMuteUser(user.id, !isMuted)}
                              >
                                {isMuted ? (
                                  <>
                                    <Bell className="h-3 w-3 mr-2" />
                                    Unmute
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="h-3 w-3 mr-2" />
                                    Mute
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 px-2 text-destructive"
                                onClick={() => handleBlockUser(user.id, !isBlocked)}
                              >
                                {isBlocked ? (
                                  <>
                                    <UserPlus className="h-3 w-3 mr-2" />
                                    Unblock
                                  </>
                                ) : (
                                  <>
                                    <UserMinus className="h-3 w-3 mr-2" />
                                    Block
                                  </>
                                )}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="p-2 border-t">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite to Board
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Settings */}
        <Popover open={showSettings} onOpenChange={setShowSettings}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <h4 className="font-medium mb-3">Presence Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Show cursor</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  {/* Toggle implementation */}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Show typing indicators</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  {/* Toggle implementation */}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Sound notifications</label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  {/* Toggle implementation */}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cursor overlay */}
      <CursorOverlay
        cursors={collaborationState.activeCursors}
        currentUser={currentUser}
        containerRef={containerRef}
      />
    </div>
  )
}

// Presence indicator component
export function PresenceIndicator({
  user,
  presence,
  showName = true,
  showStatus = true,
  size = "md",
  onClick
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10"
  }

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-lg p-1 transition-colors"
            onClick={onClick}
          >
            <div className="relative">
              <Avatar className={sizeClasses[size]}>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className={textSizeClasses[size]}>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {showStatus && (
                <div className={`absolute -bottom-0 -right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                  STATUS_COLORS[presence?.status || 'offline']
                }`} />
              )}
            </div>
            {showName && (
              <span className="font-medium text-sm truncate">{user.name}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">
              {STATUS_LABELS[presence?.status || 'offline']}
              {presence?.lastSeen && ` • ${formatLastSeen(presence.lastSeen)}`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Cursor overlay component
function CursorOverlay({
  cursors,
  currentUser,
  containerRef
}: CursorOverlayProps) {
  const [cursorPositions, setCursorPositions] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    if (!containerRef.current) return

    const updateCursorPosition = (cursor: UserCursor) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const relativeX = cursor.x - rect.left
      const relativeY = cursor.y - rect.top

      setCursorPositions(prev => ({
        ...prev,
        [cursor.userId]: { x: relativeX, y: relativeY }
      }))
    }

    Object.values(cursors).forEach(updateCursorPosition)
  }, [cursors, containerRef])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Object.entries(cursors)
        .filter(([_, cursor]) => cursor.userId !== currentUser.id && cursor.isVisible)
        .map(([userId, cursor]) => {
          const position = cursorPositions[userId]
          if (!position) return null

          return (
            <div
              key={userId}
              className="absolute transition-all duration-75 ease-out"
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translate(-2px, -2px)'
              }}
            >
              {/* Cursor */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 2L18 9L10 10L8 18L5 2Z"
                  fill="currentColor"
                  className="text-blue-500"
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>

              {/* User label */}
              <div className="absolute top-5 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  {cursor.userName}
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}

// Component for showing users viewing a specific column
export function ColumnUsers({
  columnId,
  collaborationState,
  boardUsers,
  maxVisible = 3
}: {
  columnId: string
  collaborationState: CollaborationState
  boardUsers: KanbanUser[]
  maxVisible?: number
}) {
  const usersInColumn = React.useMemo(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() - PRESENCE_TIMEOUT)

    return boardUsers.filter(user => {
      const presence = collaborationState.users[user.id]
      return presence?.currentColumnId === columnId && new Date(presence.lastSeen) > threshold
    })
  }, [columnId, collaborationState.users, boardUsers])

  if (usersInColumn.length === 0) return null

  const visibleUsers = usersInColumn.slice(0, maxVisible)
  const remainingCount = usersInColumn.length - maxVisible

  return (
    <div className="flex items-center gap-1">
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          className="relative"
          style={{ marginLeft: index > 0 ? '-8px' : '0' }}
        >
          <PresenceIndicator
            user={user}
            presence={collaborationState.users[user.id]}
            showName={false}
            size="sm"
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                {usersInColumn.slice(maxVisible).map(user => user.name).join(', ')}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

// Component for showing users viewing a specific task
export function TaskUsers({
  taskId,
  collaborationState,
  boardUsers,
  currentUser,
  showViewingLabel = true
}: {
  taskId: string
  collaborationState: CollaborationState
  boardUsers: KanbanUser[]
  currentUser: KanbanUser
  showViewingLabel?: boolean
}) {
  const usersViewingTask = React.useMemo(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() - PRESENCE_TIMEOUT)

    return boardUsers.filter(user => {
      if (user.id === currentUser.id) return false
      const presence = collaborationState.users[user.id]
      return presence?.currentTaskId === taskId && new Date(presence.lastSeen) > threshold
    })
  }, [taskId, collaborationState.users, boardUsers, currentUser])

  if (usersViewingTask.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {showViewingLabel && (
        <Eye className="h-3 w-3 text-muted-foreground" />
      )}
      <div className="flex items-center gap-1">
        {usersViewingTask.map((user, index) => (
          <div
            key={user.id}
            className="relative"
            style={{ marginLeft: index > 0 ? '-6px' : '0' }}
          >
            <PresenceIndicator
              user={user}
              presence={collaborationState.users[user.id]}
              showName={false}
              size="sm"
            />
          </div>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {usersViewingTask.length} viewing
      </span>
    </div>
  )
}