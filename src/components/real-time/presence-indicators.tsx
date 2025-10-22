/**
 * Real-time Presence Indicators Component
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Live collaboration presence indicators showing currently
 * active users on the kanban board with real-time status updates,
 * avatars, and user interactions.
 */

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useKanbanPresence } from "@/hooks/use-kanban-websocket"
import { useKanbanStore } from "@/state/kanban.store"
import { useScope } from "@/contexts/scope-context"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
  Users,
  Wifi,
  WifiOff,
  Circle,
  Loader2,
  MoreVertical,
  Eye,
  Edit3,
  MessageSquare,
} from "lucide-react"
import type { UserPresence, KanbanUser } from "@/types/kanban"

// ============================================================================
// Types and Interfaces
// ============================================================================

interface PresenceIndicatorProps {
  boardId: string
  showDetails?: boolean
  maxVisible?: number
  className?: string
}

interface UserPresenceAvatarProps {
  user: KanbanUser
  presence: UserPresence
  showStatus?: boolean
  showTooltip?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

interface PresenceListProps {
  users: Array<{ user: KanbanUser; presence: UserPresence }>
  className?: string
}

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting?: boolean
  className?: string
}

// ============================================================================
// Helper Components
// ============================================================================

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-400",
} as const

const statusIcons = {
  online: <Circle className="h-2 w-2 fill-green-500 text-green-500" />,
  away: <Circle className="h-2 w-2 fill-yellow-500 text-yellow-500" />,
  busy: <Circle className="h-2 w-2 fill-red-500 text-red-500" />,
  offline: <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />,
} as const

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
} as const

/**
 * Individual user presence avatar with status indicator
 */
function UserPresenceAvatar({
  user,
  presence,
  showStatus = true,
  showTooltip = true,
  size = "md",
  className,
}: UserPresenceAvatarProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const timeAgo = presence.lastSeen
    ? formatDistanceToNow(new Date(presence.lastSeen), { addSuffix: true })
    : "Unknown"

  const avatarContent = (
    <div
      className={cn(
        "relative transition-all duration-200",
        isHovered && "scale-105",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {showStatus && (
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-background",
            statusColors[presence.status]
          )}
        >
          {statusIcons[presence.status]}
        </div>
      )}
    </div>
  )

  if (!showTooltip) {
    return avatarContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-medium">{user.name}</p>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  presence.status === "online" && "bg-green-100 text-green-800",
                  presence.status === "away" && "bg-yellow-100 text-yellow-800",
                  presence.status === "busy" && "bg-red-100 text-red-800",
                  presence.status === "offline" && "bg-gray-100 text-gray-800"
                )}
              >
                {presence.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Last seen: {timeAgo}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ isConnected, isConnecting, className }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Connecting...</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  )
}

/**
 * Detailed presence list
 */
function PresenceList({ users, className }: PresenceListProps) {
  const [showAll, setShowAll] = React.useState(false)
  const displayUsers = showAll ? users : users.slice(0, 5)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Active Users</h4>
        <Badge variant="secondary" className="text-xs">
          {users.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {displayUsers.map(({ user, presence }) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <UserPresenceAvatar
              user={user}
              presence={presence}
              size="sm"
              showTooltip={false}
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {presence.status === "busy" ? "Currently editing" :
                 presence.status === "away" ? "Away from keyboard" :
                 presence.status === "online" ? "Active now" : "Offline"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {presence.status === "busy" && (
                <Edit3 className="h-3 w-3 text-muted-foreground" />
              )}
              {presence.status === "online" && (
                <Eye className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>

      {users.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? "Show Less" : `Show ${users.length - 5} More`}
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main presence indicators component
 */
export function PresenceIndicators({
  boardId,
  showDetails = false,
  maxVisible = 3,
  className,
}: PresenceIndicatorProps) {
  const { isConnected, otherUsers, totalUsers } = useKanbanPresence(boardId)
  const { users } = useKanbanStore()
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)

  // Get user details for presence data
  const usersWithPresence = React.useMemo(() => {
    return otherUsers
      .map(presence => ({
        presence,
        user: users[presence.userId],
      }))
      .filter(({ user }) => user) // Filter out users not found in store
      .slice(0, maxVisible)
  }, [otherUsers, users, maxVisible])

  if (totalUsers === 0 && !showDetails) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} />

      {/* Presence Avatars */}
      {usersWithPresence.length > 0 && (
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            {usersWithPresence.map(({ user, presence }) => (
              <UserPresenceAvatar
                key={user.id}
                user={user}
                presence={presence}
                size="sm"
              />
            ))}
          </div>

          {totalUsers > maxVisible && (
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted border-2 border-background">
              <span className="text-xs font-medium">+{totalUsers - maxVisible}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{totalUsers}</span>
          </div>
        </div>
      )}

      {/* Details Toggle */}
      {showDetails && totalUsers > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="h-8 w-8 p-0"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      )}

      {/* Details Panel */}
      {showDetails && isDetailsOpen && totalUsers > 0 && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-[280px]">
          <PresenceList
            users={otherUsers
              .map(presence => ({
                presence,
                user: users[presence.userId],
              }))
              .filter(({ user }) => user)}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Specialized Components
// ============================================================================

/**
 * Compact presence indicator for headers
 */
export function CompactPresence({ boardId, className }: { boardId: string; className?: string }) {
  const { isConnected, totalUsers } = useKanbanPresence(boardId)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isConnected ? "bg-green-500" : "bg-red-500"
      )} />
      {totalUsers > 0 && (
        <span className="text-xs text-muted-foreground">
          {totalUsers} {totalUsers === 1 ? "user" : "users"} online
        </span>
      )}
    </div>
  )
}

/**
 * Task-specific presence indicator
 */
export function TaskPresence({
  taskId,
  users,
  className
}: {
  taskId: string
  users: Array<{ user: KanbanUser; activity: string }>
  className?: string
}) {
  if (users.length === 0) return null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex -space-x-1">
        {users.slice(0, 2).map(({ user }) => (
          <Avatar key={user.id} className="h-5 w-5 border-2 border-background">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {user.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      {users.length > 2 && (
        <span className="text-xs text-muted-foreground">
          +{users.length - 2}
        </span>
      )}

      <div className="flex items-center gap-1">
        {users.some(u => u.activity.includes("edit")) && (
          <Edit3 className="h-3 w-3 text-blue-500" />
        )}
        {users.some(u => u.activity.includes("view")) && (
          <Eye className="h-3 w-3 text-green-500" />
        )}
        {users.some(u => u.activity.includes("comment")) && (
          <MessageSquare className="h-3 w-3 text-purple-500" />
        )}
      </div>
    </div>
  )
}

export default PresenceIndicators