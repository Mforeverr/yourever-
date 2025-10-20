/**
 * Real-time Collaboration Cursors Component
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Visual cursor tracking during drag operations showing
 * real-time collaboration cursors, drag indicators, and task movement
 * visualization across multiple users.
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useKanbanStore } from "@/state/kanban.store"
import { useScope } from "@/contexts/scope-context"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from "date-fns"
import {
  GripVertical,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import type { KanbanUser } from "@/types/kanban"

// ============================================================================
// Types and Interfaces
// ============================================================================

interface CollaborationCursor {
  userId: string
  user: KanbanUser
  position: { x: number; y: number }
  taskId: string
  taskTitle: string
  isActive: boolean
  lastUpdated: string
  direction?: 'up' | 'down' | 'left' | 'right'
}

interface CollaborationCursorsProps {
  containerRef?: React.RefObject<HTMLElement>
  showUsernames?: boolean
  className?: string
}

interface DragIndicatorProps {
  cursor: CollaborationCursor
  containerRect?: DOMRect
  onHover?: (userId: string) => void
  onLeave?: (userId: string) => void
}

interface GhostCardProps {
  cursor: CollaborationCursor
  containerRect?: DOMRect
  className?: string
}

interface UserCursorProps {
  cursor: CollaborationCursor
  containerRect?: DOMRect
  showUsername?: boolean
  className?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

const getUserColor = (userId: string) => {
  const colors = [
    "#ef4444", // red
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

const getArrowIcon = (direction?: string) => {
  switch (direction) {
    case 'up':
      return <ArrowUp className="h-3 w-3" />
    case 'down':
      return <ArrowDown className="h-3 w-3" />
    case 'left':
      return <ArrowLeft className="h-3 w-3" />
    case 'right':
      return <ArrowRight className="h-3 w-3" />
    default:
      return <Move className="h-3 w-3" />
  }
}

// ============================================================================
// Component Implementations
// ============================================================================

/**
 * Individual user cursor with visual indicators
 */
function UserCursor({
  cursor,
  containerRect,
  showUsername = true,
  className,
}: UserCursorProps) {
  const [isHovered, setIsHovered] = React.useState(false)
  const userColor = getUserColor(cursor.userId)

  const position = containerRect
    ? {
        x: Math.max(0, Math.min(containerRect.width - 40, cursor.position.x)),
        y: Math.max(0, Math.min(containerRect.height - 40, cursor.position.y)),
      }
    : cursor.position

  const timeAgo = formatDistanceToNow(new Date(cursor.lastUpdated), {
    addSuffix: true,
  })

  return (
    <motion.div
      className={cn(
        "absolute pointer-events-none z-50",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Cursor Arrow */}
      <motion.div
        className="relative"
        animate={{
          x: isHovered ? 2 : 0,
          y: isHovered ? 2 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background shadow-lg"
          style={{ backgroundColor: userColor }}
        >
          {getArrowIcon(cursor.direction)}
        </div>

        {/* Username Label */}
        {showUsername && (
          <motion.div
            className={cn(
              "absolute top-full left-1/2 mt-1 px-2 py-1 rounded-md text-xs text-white whitespace-nowrap shadow-lg",
              "transform -translate-x-1/2"
            )}
            style={{ backgroundColor: userColor }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-1">
              <GripVertical className="h-3 w-3" />
              <span className="font-medium truncate max-w-24">
                {cursor.user.name}
              </span>
            </div>

            {isHovered && (
              <div className="absolute top-full left-0 mt-1 p-1 bg-black/80 text-white rounded text-xs whitespace-nowrap">
                <div>Dragging: {cursor.taskTitle}</div>
                <div className="text-gray-300">{timeAgo}</div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Hover Area */}
      <div
        className="absolute inset-0 w-12 h-12 -ml-6 -mt-6"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </motion.div>
  )
}

/**
 * Ghost card representation of dragged task
 */
function GhostCard({
  cursor,
  containerRect,
  className,
}: GhostCardProps) {
  const userColor = getUserColor(cursor.userId)

  const position = containerRect
    ? {
        x: Math.max(0, Math.min(containerRect.width - 200, cursor.position.x)),
        y: Math.max(0, Math.min(containerRect.height - 100, cursor.position.y)),
      }
    : cursor.position

  return (
    <motion.div
      className={cn(
        "absolute pointer-events-none z-40",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0.8, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 0.9 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          "w-48 p-3 rounded-lg border-2 border-dashed shadow-lg backdrop-blur-sm",
          "bg-white/80 dark:bg-gray-900/80"
        )}
        style={{ borderColor: userColor }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="text-sm font-medium truncate">
            {cursor.taskTitle}
          </span>
        </div>

        <div className="mt-1 text-xs text-muted-foreground">
          {cursor.user.name} is moving this task
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Drag indicator showing target position
 */
function DragIndicator({
  cursor,
  containerRect,
  onHover,
  onLeave,
}: DragIndicatorProps) {
  const userColor = getUserColor(cursor.userId)
  const [isPulse, setIsPulse] = React.useState(true)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsPulse(prev => !prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const position = containerRect
    ? {
        x: Math.max(20, Math.min(containerRect.width - 20, cursor.position.x)),
        y: Math.max(20, Math.min(containerRect.height - 20, cursor.position.y)),
      }
    : cursor.position

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0 }}
      animate={{ scale: isPulse ? 1.2 : 1 }}
      exit={{ scale: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => onHover?.(cursor.userId)}
      onMouseLeave={() => onLeave?.(cursor.userId)}
    >
      <div
        className="w-4 h-4 rounded-full border-2 border-background shadow-lg"
        style={{ backgroundColor: userColor }}
      />

      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: userColor }}
        initial={{ scale: 1, opacity: 0.3 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Main collaboration cursors component
 */
export function CollaborationCursors({
  containerRef,
  showUsernames = true,
  className,
}: CollaborationCursorsProps) {
  const [containerRect, setContainerRect] = React.useState<DOMRect>()
  const [hoveredUserId, setHoveredUserId] = React.useState<string>()
  const { activeCursors, users } = useKanbanStore()
  const { user } = useAuth()

  // Update container rect when container changes
  React.useEffect(() => {
    const updateRect = () => {
      if (containerRef?.current) {
        setContainerRect(containerRef.current.getBoundingClientRect())
      }
    }

    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect)

    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect)
    }
  }, [containerRef])

  // Filter out current user's cursor and prepare cursor data
  const collaborationCursors = React.useMemo(() => {
    return Object.entries(activeCursors)
      .filter(([userId]) => userId !== user?.id)
      .map(([userId, cursorData]) => ({
        userId,
        user: users[userId],
        position: cursorData.position || { x: 0, y: 0 },
        taskId: cursorData.taskId || "",
        taskTitle: cursorData.taskTitle || "Unknown Task",
        isActive: cursorData.isActive ?? false,
        lastUpdated: cursorData.lastUpdated || new Date().toISOString(),
        direction: cursorData.direction,
      }))
      .filter(cursor => cursor.user && cursor.isActive) // Only show active cursors with valid users
  }, [activeCursors, users, user])

  const handleCursorHover = React.useCallback((userId: string) => {
    setHoveredUserId(userId)
  }, [])

  const handleCursorLeave = React.useCallback((userId: string) => {
    if (hoveredUserId === userId) {
      setHoveredUserId(undefined)
    }
  }, [hoveredUserId])

  if (collaborationCursors.length === 0) {
    return null
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      <AnimatePresence mode="popLayout">
        {collaborationCursors.map((cursor) => (
          <React.Fragment key={cursor.userId}>
            {/* Ghost Card */}
            <GhostCard
              cursor={cursor}
              containerRect={containerRect}
            />

            {/* User Cursor */}
            <UserCursor
              cursor={cursor}
              containerRect={containerRect}
              showUsername={showUsernames}
              className={hoveredUserId === cursor.userId ? "z-50" : "z-40"}
            />

            {/* Drag Indicator */}
            {hoveredUserId === cursor.userId && (
              <DragIndicator
                cursor={cursor}
                containerRect={containerRect}
                onHover={handleCursorHover}
                onLeave={handleCursorLeave}
              />
            )}
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* Collaboration Badge */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg">
          <div className="flex -space-x-2">
            {collaborationCursors.slice(0, 3).map((cursor) => (
              <div
                key={cursor.userId}
                className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: getUserColor(cursor.userId) }}
              >
                {cursor.user.name[0].toUpperCase()}
              </div>
            ))}
          </div>

          {collaborationCursors.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{collaborationCursors.length - 3}
            </span>
          )}

          <span className="text-xs text-muted-foreground">
            {collaborationCursors.length === 1 ? "user is" : "users are"} collaborating
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Specialized Components
// ============================================================================

/**
 * Minimal cursor indicator for task cards
 */
export function TaskCardCursor({
  userId,
  user,
  position,
  isActive,
  className,
}: {
  userId: string
  user: KanbanUser
  position: { x: number; y: number }
  isActive: boolean
  className?: string
}) {
  const userColor = getUserColor(userId)

  if (!isActive) return null

  return (
    <motion.div
      className={cn(
        "absolute top-2 right-2 z-10",
        className
      )}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      <div
        className="w-4 h-4 rounded-full border border-background shadow-sm"
        style={{ backgroundColor: userColor }}
        title={`${user.name} is viewing this task`}
      />
    </motion.div>
  )
}

/**
 * Column hover indicator showing user interest
 */
export function ColumnPresenceIndicator({
  columnId,
  users,
  className,
}: {
  columnId: string
  users: Array<{ user: KanbanUser; activity: string }>
  className?: string
}) {
  if (users.length === 0) return null

  return (
    <div className={cn("absolute top-2 right-2 z-10", className)}>
      <div className="flex -space-x-1">
        {users.slice(0, 2).map(({ user }) => (
          <div
            key={user.id}
            className="w-5 h-5 rounded-full border-2 border-background flex items-center justify-center text-xs"
            style={{ backgroundColor: getUserColor(user.id) }}
          >
            {user.name[0].toUpperCase()}
          </div>
        ))}
      </div>

      {users.length > 2 && (
        <div className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
          +{users.length - 2}
        </div>
      )}
    </div>
  )
}

export default CollaborationCursors