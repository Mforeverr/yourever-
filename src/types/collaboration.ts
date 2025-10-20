/**
 * Comprehensive TypeScript Interfaces for Real-time Collaboration Features
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Complete type definitions for all real-time collaboration features
 * including comments, presence, notifications, activity feed, and conflict resolution.
 */

// ============================================================================
// Base Types and Enums
// ============================================================================

export type UserStatus = 'online' | 'away' | 'busy' | 'offline'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'
export type ColumnType = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'custom'
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task_assigned' | 'task_moved' | 'task_commented' | 'task_completed' | 'mention_received' | 'board_invitation' | 'due_date_reminder'
export type ActivityEventType = 'task_created' | 'task_updated' | 'task_moved' | 'task_assigned' | 'task_completed' | 'task_deleted' | 'comment_added' | 'comment_updated' | 'comment_deleted' | 'reaction_added' | 'reaction_removed' | 'column_created' | 'column_updated' | 'column_deleted' | 'column_reordered' | 'board_created' | 'board_updated' | 'member_added' | 'member_removed' | 'settings_updated' | 'file_uploaded' | 'file_deleted' | 'label_added' | 'label_removed'

export type OperationType = 'create' | 'update' | 'move' | 'delete'
export type ConflictResolutionStrategy = 'last-write-wins' | 'merge' | 'manual'

// ============================================================================
// User and Presence Types
// ============================================================================

export interface CollaborationUser {
  id: string
  name: string
  email: string
  avatar?: string
  status: UserStatus
  lastSeen: string
  permissions: UserPermissions
}

export interface UserPermissions {
  canViewBoard: boolean
  canEditBoard: boolean
  canAddTasks: boolean
  canEditTasks: boolean
  canDeleteTasks: boolean
  canMoveTasks: boolean
  canManageColumns: boolean
  canInviteMembers: boolean
  canManageSettings: boolean
}

export interface UserPresence {
  userId: string
  userName: string
  userAvatar?: string
  status: UserStatus
  lastSeen: string
  currentTaskId?: string
  currentColumnId?: string
  currentBoardId?: string
  isTyping?: boolean
  cursor?: UserCursor
  activeProperties?: string[] // Properties currently being edited
}

export interface UserCursor {
  userId: string
  userName: string
  userAvatar?: string
  x: number
  y: number
  isVisible: boolean
  timestamp: string
  isDragging?: boolean
  draggedTaskId?: string
}

export interface TypingIndicator {
  userId: string
  userName: string
  taskId: string
  timestamp: string
}

// ============================================================================
// Comment and Communication Types
// ============================================================================

export interface Comment {
  id: string
  content: string
  author: CollaborationUser
  taskId: string
  parentCommentId?: string
  thread?: Comment[]
  reactions: CommentReaction[]
  mentions: Mention[]
  isPinned: boolean
  isEdited: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CommentReaction {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  emoji: string
  createdAt: string
}

export interface Mention {
  id: string
  userId: string
  userName: string
  startIndex: number
  endIndex: number
}

export interface CommentThread {
  rootComment: Comment
  replies: Comment[]
  totalCount: number
  unreadCount: number
  lastActivity: string
  participants: CollaborationUser[]
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  userId: string
  boardId?: string
  taskId?: string
  commentId?: string
  read: boolean
  timestamp: string
  expiresAt?: string
  actions?: NotificationAction[]
  metadata?: NotificationMetadata
}

export interface NotificationAction {
  id: string
  label: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  action: () => void | Promise<void>
}

export interface NotificationMetadata {
  taskTitle?: string
  boardName?: string
  authorName?: string
  mentionText?: string
  dueDate?: string
  assigneeName?: string
  fromColumn?: string
  toColumn?: string
  [key: string]: any
}

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
  soundEnabled: boolean
  desktopEnabled: boolean
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  recent: number
}

// ============================================================================
// Activity Feed Types
// ============================================================================

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  title: string
  description?: string
  userId: string
  user: CollaborationUser
  boardId: string
  taskId?: string
  columnId?: string
  commentId?: string
  timestamp: string
  metadata?: ActivityEventMetadata
}

export interface ActivityEventMetadata {
  taskTitle?: string
  columnName?: string
  fromColumn?: string
  toColumn?: string
  assigneeName?: string
  memberName?: string
  fileName?: string
  labelName?: string
  reaction?: string
  changes?: string[]
  previousValues?: Record<string, any>
  newValues?: Record<string, any>
  mentions?: string[]
  attachments?: string[]
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

// ============================================================================
// Real-time Event Types
// ============================================================================

export interface RealtimeEvent {
  id: string
  type: string
  userId: string
  boardId: string
  data: any
  timestamp: string
  optimistic?: boolean
}

export interface TaskMovedEvent extends RealtimeEvent {
  type: 'task:moved'
  taskId: string
  fromColumnId: string
  toColumnId: string
  fromPosition: number
  toPosition: number
}

export interface TaskUpdatedEvent extends RealtimeEvent {
  type: 'task:updated'
  taskId: string
  changes: Record<string, any>
}

export interface UserPresenceEvent extends RealtimeEvent {
  type: 'user:presence'
  status: UserStatus
  currentTaskId?: string
  currentColumnId?: string
}

export interface CursorEvent extends RealtimeEvent {
  type: 'cursor:move' | 'cursor:drag-start' | 'cursor:drag-end'
  position: { x: number; y: number }
  taskId?: string
}

export interface CommentEvent extends RealtimeEvent {
  type: 'comment:added' | 'comment:updated' | 'comment:deleted'
  commentId: string
  taskId: string
  content?: string
}

export interface ReactionEvent extends RealtimeEvent {
  type: 'reaction:added' | 'reaction:removed'
  commentId: string
  emoji: string
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export interface Conflict {
  id: string
  entityType: 'task' | 'column' | 'comment'
  entityId: string
  field: string
  localValue: any
  remoteValue: any
  localTimestamp: string
  remoteTimestamp: string
  userId: string
  resolved: boolean
  resolution?: ConflictResolution
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy
  resolvedBy: string
  resolvedAt: string
  winningValue: any
  losingValue: any
}

export interface PendingOperation {
  id: string
  type: OperationType
  entityType: 'task' | 'column' | 'comment'
  entityId: string
  data: any
  timestamp: string
  userId: string
  retryCount?: number
  conflicts?: Conflict[]
}

export interface ConflictQueue {
  conflicts: Conflict[]
  pendingResolutions: Record<string, ConflictResolution>
  autoResolveEnabled: boolean
}

// ============================================================================
// Collaboration State Types
// ============================================================================

export interface CollaborationState {
  users: Record<string, UserPresence>
  activeCursors: Record<string, UserCursor>
  typingUsers: Record<string, TypingIndicator>
  pendingOperations: Record<string, PendingOperation>
  conflictQueue: ConflictQueue
  connectionStatus: ConnectionStatus
  lastSyncTime?: string
  syncInProgress: boolean
}

export interface ConnectionStatus {
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  lastConnected?: string
  connectionAttempts: number
  error?: string
}

// ============================================================================
// WebSocket Configuration Types
// ============================================================================

export interface WebSocketConfig {
  url: string
  boardId: string
  userId: string
  authToken: string
  reconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: number
  enableCompression: boolean
}

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
  userId: string
  messageId: string
}

// ============================================================================
// UI State Types
// ============================================================================

export interface CollaborationUIState {
  showPresenceIndicators: boolean
  showCursorTracking: boolean
  showTypingIndicators: boolean
  showRealTimeNotifications: boolean
  conflictResolutionMode: 'manual' | 'auto'
  activePanel?: 'comments' | 'activity' | 'presence' | 'notifications'
  expandedThreads: Set<string>
  selectedUsers: Set<string>
  filters: ActivityFilter
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCommentRequest {
  taskId: string
  content: string
  parentCommentId?: string
  mentions?: string[]
}

export interface UpdateCommentRequest {
  content: string
  mentions?: string[]
}

export interface AddReactionRequest {
  emoji: string
}

export interface UpdatePresenceRequest {
  status: UserStatus
  currentTaskId?: string
  currentColumnId?: string
}

export interface MarkNotificationsReadRequest {
  notificationIds?: string[]
  markAll?: boolean
}

export interface GetActivityFeedRequest {
  boardId: string
  limit?: number
  offset?: number
  filters?: ActivityFilter
}

export interface ExportActivityRequest {
  boardId: string
  format: 'json' | 'csv'
  dateRange?: {
    start: string
    end: string
  }
  filters?: ActivityFilter
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface LiveCommentsProps {
  taskId: string
  taskTitle?: string
  comments: Comment[]
  currentUser: CollaborationUser
  boardUsers: CollaborationUser[]
  onAddComment: (content: string, parentCommentId?: string) => Promise<void>
  onEditComment: (commentId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onAddReaction: (commentId: string, emoji: string) => Promise<void>
  onRemoveReaction: (commentId: string, reactionId: string) => Promise<void>
  onPinComment: (commentId: string) => Promise<void>
  typingUsers?: TypingIndicator[]
  presence?: Record<string, UserPresence>
  className?: string
}

export interface UserPresenceProps {
  boardId: string
  boardUsers: CollaborationUser[]
  currentUser: CollaborationUser
  collaborationState: CollaborationState
  onInviteUser?: (userId: string) => void
  onRemoveUser?: (userId: string) => void
  onChangeUserPermissions?: (userId: string, permissions: string[]) => void
  onMuteUser?: (userId: string, muted: boolean) => void
  onBlockUser?: (userId: string, blocked: boolean) => void
  className?: string
}

export interface NotificationSystemProps {
  currentUser: CollaborationUser
  notifications: Notification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onClearAllNotifications: () => void
  onArchiveNotification: (notificationId: string) => void
  onUpdatePreferences: (preferences: NotificationPreferences) => void
  onRequestPermission: () => Promise<boolean>
  className?: string
}

export interface ActivityFeedProps {
  boardId: string
  boardName: string
  currentUser: CollaborationUser
  boardUsers: CollaborationUser[]
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

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseCollaborationReturn {
  state: CollaborationState
  isConnected: boolean
  isConnecting: boolean
  sendEvent: (type: string, data: any, options?: { optimistic?: boolean }) => void
  joinBoard: (boardId: string) => void
  leaveBoard: (boardId: string) => void
  updatePresence: (presence: Partial<UserPresence>) => void
  resolveConflict: (conflictId: string, resolution: ConflictResolutionStrategy) => void
  clearConflicts: () => void
}

export interface UseNotificationSystemReturn {
  notifications: Notification[]
  preferences: NotificationPreferences
  stats: NotificationStats
  addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'read' | 'timestamp'>) => Notification
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  deleteNotification: (notificationId: string) => void
  clearAllNotifications: () => void
  updatePreferences: (preferences: NotificationPreferences) => void
  requestPermission: () => Promise<boolean>
}

export interface UseActivityFeedReturn {
  events: ActivityEvent[]
  stats: ActivityFeedStats
  isLoading: boolean
  isLive: boolean
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => ActivityEvent
  refreshEvents: () => Promise<void>
  exportEvents: (format: 'json' | 'csv') => void
  toggleLive: (live: boolean) => void
}

// ============================================================================
// Error Types
// ============================================================================

export interface CollaborationError extends Error {
  code: string
  type: 'connection' | 'sync' | 'conflict' | 'permission' | 'validation'
  userId?: string
  boardId?: string
  taskId?: string
  retryable: boolean
  details?: Record<string, any>
}

export interface WebSocketError extends CollaborationError {
  type: 'connection'
  closeCode?: number
  closeReason?: string
}

export interface ConflictError extends CollaborationError {
  type: 'conflict'
  conflicts: Conflict[]
}

export interface PermissionError extends CollaborationError {
  type: 'permission'
  requiredPermission: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type RealtimeEventHandler<T = any> = (event: T) => void
export type ConflictResolutionHandler = (conflict: Conflict) => Promise<ConflictResolution>
export type NotificationClickHandler = (notification: Notification) => void
export type UserActionHandler = (userId: string, action: string) => void

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ============================================================================
// Legacy Compatibility Types (for gradual migration)
// ============================================================================

/** @deprecated Use CollaborationUser instead */
export type User = CollaborationUser

/** @deprecated Use UserPresence instead */
export type Presence = UserPresence

/** @deprecated Use Comment instead */
export type TaskComment = Comment

/** @deprecated Use Notification instead */
export type ToastNotification = Notification

/** @deprecated Use ActivityEvent instead */
export type BoardActivity = ActivityEvent