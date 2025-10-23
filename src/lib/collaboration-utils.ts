/**
 * Collaboration Utilities for Real-time Features
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Utility functions and helpers for real-time collaboration features
 * including conflict resolution, cursor tracking, presence management, and sync.
 */

import type {
  KanbanTask,
  KanbanUser,
  TaskMovedEvent,
  TaskUpdatedEvent,
  UserPresenceEvent,
  KanbanBoardEvent
} from '@/types/kanban'

// ============================================================================
// Date Formatting Utilities
// ============================================================================

/**
 * Format the last seen time in a human-readable format
 * @param lastSeen - ISO timestamp string
 * @returns Formatted relative time string
 */
export function formatLastSeen(lastSeen: string): string {
  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffMs = now.getTime() - lastSeenDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return lastSeenDate.toLocaleDateString()
  }
}

// ============================================================================
// Presence and Cursor Management
// ============================================================================

export interface UserCursor {
  userId: string
  userName: string
  userAvatar?: string
  x: number
  y: number
  isVisible: boolean
  timestamp: string
}

export interface UserPresence {
  userId: string
  userName: string
  userAvatar?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: string
  currentTaskId?: string
  currentColumnId?: string
  isTyping?: boolean
  cursor?: UserCursor
}

export interface CollaborationState {
  users: Record<string, UserPresence>
  activeCursors: Record<string, UserCursor>
  typingUsers: Record<string, { taskId: string; timestamp: string }>
  pendingOperations: Record<string, PendingOperation>
}

export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'move' | 'delete'
  entityType: 'task' | 'column' | 'comment'
  entityId: string
  data: any
  timestamp: string
  userId: string
  retryCount?: number
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual'
  resolution?: any
  conflicts: Array<{
    field: string
    localValue: any
    remoteValue: any
    timestamp: string
  }>
}

export type OperationType = 'create' | 'update' | 'move' | 'delete'

/**
 * Detects conflicts between local and remote task updates
 */
export function detectTaskConflict(
  localTask: KanbanTask,
  remoteTask: KanbanTask,
  lastSyncTime: string
): ConflictResolution | null {
  const conflicts: Array<{ field: string; localValue: any; remoteValue: any; timestamp: string }> = []

  // Check for conflicts in key fields
  const fieldsToCheck: Array<keyof KanbanTask> = [
    'title', 'description', 'priority', 'assignedTo', 'dueDate', 'status'
  ]

  for (const field of fieldsToCheck) {
    const localValue = localTask[field]
    const remoteValue = remoteTask[field]

    if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      // Determine which update is more recent
      const localTime = localTask.updatedAt
      const remoteTime = remoteTask.updatedAt

      conflicts.push({
        field,
        localValue,
        remoteValue,
        timestamp: remoteTime > localTime ? remoteTime : localTime
      })
    }
  }

  if (conflicts.length === 0) return null

  return {
    strategy: 'last-write-wins',
    conflicts
  }
}

/**
 * Resolves conflicts using the specified strategy
 */
export function resolveConflict(
  conflict: ConflictResolution,
  localData: any,
  remoteData: any
): any {
  switch (conflict.strategy) {
    case 'last-write-wins':
      return remoteData

    case 'merge':
      // Simple merge strategy - can be enhanced
      return {
        ...localData,
        ...remoteData,
        updatedAt: new Date().toISOString()
      }

    case 'manual':
      // Return conflict info for manual resolution
      return {
        conflict,
        localData,
        remoteData
      }

    default:
      return remoteData
  }
}

// ============================================================================
// Optimistic Updates and Sync
// ============================================================================

/**
 * Creates an optimistic update with retry capability
 */
export function createOptimisticUpdate(
  type: OperationType,
  entityType: 'task' | 'column' | 'comment',
  entityId: string,
  data: any,
  userId: string
): PendingOperation {
  return {
    id: `${type}-${entityType}-${entityId}-${Date.now()}`,
    type,
    entityType,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    userId,
    retryCount: 0
  }
}

/**
 * Applies optimistic update to local state
 */
export function applyOptimisticUpdate<T>(
  entities: Record<string, T>,
  update: PendingOperation,
  createTemporaryEntity?: (data: any) => T
): Record<string, T> {
  const { type, entityId, data } = update

  switch (type) {
    case 'create':
      if (!createTemporaryEntity) return entities
      return {
        ...entities,
        [entityId]: createTemporaryEntity(data)
      }

    case 'update':
      const existingEntity = entities[entityId]
      if (!existingEntity) return entities

      return {
        ...entities,
        [entityId]: {
          ...existingEntity,
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

    case 'move':
      const movingEntity = entities[entityId]
      if (!movingEntity) return entities

      return {
        ...entities,
        [entityId]: {
          ...movingEntity,
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

    case 'delete':
      const newEntities = { ...entities }
      delete newEntities[entityId]
      return newEntities

    default:
      return entities
  }
}

/**
 * Checks if an operation can be retried
 */
export function canRetryOperation(operation: PendingOperation): boolean {
  const maxRetries = 3
  return (operation.retryCount || 0) < maxRetries
}

/**
 * Increments retry count for an operation
 */
export function incrementRetryCount(operation: PendingOperation): PendingOperation {
  return {
    ...operation,
    retryCount: (operation.retryCount || 0) + 1,
    timestamp: new Date().toISOString()
  }
}

// ============================================================================
// Real-time Event Processing
// ============================================================================

/**
 * Processes incoming real-time events
 */
export function processRealtimeEvent(
  event: KanbanBoardEvent,
  collaborationState: CollaborationState,
  currentUserId: string
): CollaborationState {
  // Ignore events from current user
  if (event.userId === currentUserId) {
    return collaborationState
  }

  const newState = { ...collaborationState }

  switch (event.type) {
    case 'user:presence':
      return handlePresenceEvent(newState, event as any)

    case 'task:moved':
      return handleTaskMovedEvent(newState, event as unknown as TaskMovedEvent)

    case 'task:updated':
      return handleTaskUpdatedEvent(newState, event as unknown as TaskUpdatedEvent)

    default:
      return newState
  }
}

function handlePresenceEvent(
  state: CollaborationState,
  event: UserPresenceEvent
): CollaborationState {
  const user: UserPresence = {
    userId: event.userId,
    userName: event.userId, // Will be populated from user lookup
    status: event.status,
    lastSeen: event.lastSeen,
    currentTaskId: event.boardId, // Using boardId as currentTaskId for now
  }

  return {
    ...state,
    users: {
      ...state.users,
      [event.userId]: user
    }
  }
}

function handleTaskMovedEvent(
  state: CollaborationState,
  event: TaskMovedEvent
): CollaborationState {
  // Update user presence to show they're working on a task
  const user = state.users[event.userId]
  if (!user) return state

  return {
    ...state,
    users: {
      ...state.users,
      [event.userId]: {
        ...user,
        currentTaskId: event.taskId,
        currentColumnId: event.toColumnId,
        lastSeen: new Date().toISOString()
      }
    }
  }
}

function handleTaskUpdatedEvent(
  state: CollaborationState,
  event: TaskUpdatedEvent
): CollaborationState {
  // Update user presence when they edit a task
  const user = state.users[event.userId]
  if (!user) return state

  return {
    ...state,
    users: {
      ...state.users,
      [event.userId]: {
        ...user,
        lastSeen: new Date().toISOString()
      }
    }
  }
}

// ============================================================================
// Cursor Tracking
// ============================================================================

/**
 * Updates cursor position for a user
 */
export function updateCursorPosition(
  state: CollaborationState,
  userId: string,
  x: number,
  y: number,
  isVisible: boolean
): CollaborationState {
  const user = state.users[userId]
  if (!user) return state

  const cursor: UserCursor = {
    userId,
    userName: user.userName,
    userAvatar: user.userAvatar,
    x,
    y,
    isVisible,
    timestamp: new Date().toISOString()
  }

  return {
    ...state,
    activeCursors: {
      ...state.activeCursors,
      [userId]: cursor
    }
  }
}

/**
 * Removes cursor for a user
 */
export function removeUserCursor(
  state: CollaborationState,
  userId: string
): CollaborationState {
  const newCursors = { ...state.activeCursors }
  delete newCursors[userId]

  return {
    ...state,
    activeCursors: newCursors
  }
}

/**
 * Cleans up stale cursors
 */
export function cleanupStaleCursors(
  state: CollaborationState,
  maxAgeMs: number = 30000 // 30 seconds
): CollaborationState {
  const now = new Date()
  const newCursors: Record<string, UserCursor> = {}

  Object.entries(state.activeCursors).forEach(([userId, cursor]) => {
    const cursorAge = now.getTime() - new Date(cursor.timestamp).getTime()
    if (cursorAge < maxAgeMs) {
      newCursors[userId] = cursor
    }
  })

  return {
    ...state,
    activeCursors: newCursors
  }
}

// ============================================================================
// Typing Indicators
// ============================================================================

/**
 * Sets a user as typing on a specific task
 */
export function setUserTyping(
  state: CollaborationState,
  userId: string,
  taskId: string
): CollaborationState {
  return {
    ...state,
    typingUsers: {
      ...state.typingUsers,
      [userId]: {
        taskId,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Removes typing indicator for a user
 */
export function removeUserTyping(
  state: CollaborationState,
  userId: string
): CollaborationState {
  const newTypingUsers = { ...state.typingUsers }
  delete newTypingUsers[userId]

  return {
    ...state,
    typingUsers: newTypingUsers
  }
}

/**
 * Gets users currently typing on a specific task
 */
export function getTypingUsersForTask(
  state: CollaborationState,
  taskId: string,
  excludeUserId?: string
): UserPresence[] {
  const typingUserIds = Object.entries(state.typingUsers)
    .filter(([userId, typing]) =>
      typing.taskId === taskId &&
      userId !== excludeUserId &&
      Date.now() - new Date(typing.timestamp).getTime() < 5000 // 5 seconds
    )
    .map(([userId]) => userId)

  return typingUserIds
    .map(userId => state.users[userId])
    .filter(Boolean)
}

// ============================================================================
// Mention System
// ============================================================================

export interface Mention {
  id: string
  userId: string
  userName: string
  startIndex: number
  endIndex: number
}

/**
 * Parses mentions from text content
 */
export function parseMentions(text: string, users: KanbanUser[]): Mention[] {
  const mentions: Mention[] = []
  const mentionRegex = /@(\w+)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    const userName = match[1]
    const user = users.find(u =>
      u.name.toLowerCase().includes(userName.toLowerCase()) ||
      u.email.toLowerCase().includes(userName.toLowerCase())
    )

    if (user) {
      mentions.push({
        id: `mention-${Date.now()}-${Math.random()}`,
        userId: user.id,
        userName: user.name,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })
    }
  }

  return mentions
}

/**
 * Replaces mentions with formatted text
 */
export function formatMentions(text: string, mentions: Mention[]): string {
  let formattedText = text

  // Sort mentions by startIndex in reverse order to avoid index shifting
  mentions
    .sort((a, b) => b.startIndex - a.startIndex)
    .forEach(mention => {
      const before = formattedText.substring(0, mention.startIndex)
      const mentionText = formattedText.substring(mention.startIndex, mention.endIndex)
      const after = formattedText.substring(mention.endIndex)

      formattedText = `${before}[${mentionText}](${mention.userId})${after}`
    })

  return formattedText
}

/**
 * Finds users that can be mentioned
 */
export function findMentionableUsers(
  query: string,
  users: KanbanUser[],
  excludeUserIds: string[] = []
): KanbanUser[] {
  return users.filter(user =>
    !excludeUserIds.includes(user.id) &&
    (user.name.toLowerCase().includes(query.toLowerCase()) ||
     user.email.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8) // Limit to 8 results
}

// ============================================================================
// Notification Helpers
// ============================================================================

export interface NotificationPreferences {
  taskAssigned: boolean
  taskMoved: boolean
  taskCommented: boolean
  taskCompleted: boolean
  mentionReceived: boolean
  boardInvitation: boolean
  dueDateReminder: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

/**
 * Creates a notification preference object with defaults
 */
export function createDefaultNotificationPreferences(): NotificationPreferences {
  return {
    taskAssigned: true,
    taskMoved: true,
    taskCommented: true,
    taskCompleted: true,
    mentionReceived: true,
    boardInvitation: true,
    dueDateReminder: true,
    pushEnabled: true,
    emailEnabled: false
  }
}

/**
 * Checks if a notification should be sent based on preferences
 */
export function shouldSendNotification(
  eventType: keyof NotificationPreferences,
  preferences: NotificationPreferences,
  userId: string,
  eventUserId: string
): boolean {
  // Don't send notifications for own actions
  if (userId === eventUserId) return false

  return preferences[eventType] || false
}

// ============================================================================
// Performance and Cleanup
// ============================================================================

/**
 * Cleans up old data to prevent memory leaks
 */
export function cleanupCollaborationState(
  state: CollaborationState,
  maxAgeMs: number = 300000 // 5 minutes
): CollaborationState {
  const now = new Date()
  const cutoffTime = new Date(now.getTime() - maxAgeMs)

  // Clean up stale users
  const activeUsers: Record<string, UserPresence> = {}
  Object.entries(state.users).forEach(([userId, user]) => {
    if (new Date(user.lastSeen) > cutoffTime) {
      activeUsers[userId] = user
    }
  })

  // Clean up stale pending operations
  const activeOperations: Record<string, PendingOperation> = {}
  Object.entries(state.pendingOperations).forEach(([opId, operation]) => {
    if (new Date(operation.timestamp) > cutoffTime) {
      activeOperations[opId] = operation
    }
  })

  return {
    ...state,
    users: activeUsers,
    activeCursors: cleanupStaleCursors(state, maxAgeMs).activeCursors,
    typingUsers: state.typingUsers, // These are cleaned up more aggressively
    pendingOperations: activeOperations
  }
}

/**
 * Debounces rapid updates to prevent excessive network traffic
 */
export function debounce<T extends any[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttles updates to ensure smooth performance
 */
export function throttle<T extends any[]>(
  fn: (...args: T) => void,
  interval: number
): (...args: T) => void {
  let lastCall = 0

  return (...args: T) => {
    const now = Date.now()
    if (now - lastCall >= interval) {
      fn(...args)
      lastCall = now
    }
  }
}