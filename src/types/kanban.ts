/**
 * Kanban Board Type Definitions
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Complete TypeScript interfaces for the kanban board system
 * following the API specification from the implementation plan.
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface KanbanUser {
  id: string
  name: string
  email: string
  avatar?: string
  status: 'online' | 'away' | 'offline' | 'busy'
}

export interface KanbanLabel {
  id: string
  name: string
  color: string
}

export interface KanbanComment {
  id: string
  content: string
  author: KanbanUser
  createdAt: string
  updatedAt: string
}

export interface KanbanAttachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: KanbanUser
  uploadedAt: string
}

// ============================================================================
// Task/Card Types
// ============================================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done'

export interface KanbanTask {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  position: number

  // Relationships
  columnId: string
  boardId: string
  projectId?: string
  createdBy: string
  assignedTo?: string

  // Optional fields
  storyPoints?: number
  dueDate?: string
  startDate?: string
  completedAt?: string
  whyNote?: string

  // Collections
  labels: KanbanLabel[]
  customFields: Record<string, any>

  // Metadata
  isArchived: boolean
  createdAt: string
  updatedAt: string

  // Computed fields (API-side)
  commentsCount?: number
  attachmentsCount?: number

  // Populated relationships (when requested)
  assignee?: KanbanUser
  author?: KanbanUser
  comments?: KanbanComment[]
  attachments?: KanbanAttachment[]
}

// ============================================================================
// Column Types
// ============================================================================

export type ColumnType = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'custom'

export interface KanbanColumn {
  id: string
  name: string
  color: string
  position: number
  columnType: ColumnType
  wipLimit?: number

  // Relationships
  boardId: string

  // Metadata
  createdAt: string
  updatedAt: string

  // Computed fields
  tasksCount?: number

  // Populated relationships (when requested)
  tasks?: KanbanTask[]
}

// ============================================================================
// Board Types
// ============================================================================

export interface KanbanBoard {
  id: string
  name: string
  description?: string

  // Relationships
  organizationId: string
  divisionId?: string
  projectId?: string
  createdBy: string

  // Configuration
  isPublic: boolean
  settings: KanbanBoardSettings

  // Metadata
  createdAt: string
  updatedAt: string

  // Populated relationships (when requested)
  columns?: KanbanColumn[]
  tasks?: KanbanTask[]
  labels?: KanbanLabel[]
  members?: KanbanBoardMember[]

  // Computed fields
  tasksCount?: number
  columnsCount?: number
}

export interface KanbanBoardSettings {
  allowGuestAccess: boolean
  requireAssignmentToMove: boolean
  showProjectInfo: boolean
  enableWipLimits: boolean
  defaultCardColor?: string
  autoArchiveDelay: number // days
}

// ============================================================================
// Permission and Access Types
// ============================================================================

export interface KanbanBoardMember {
  id: string
  user: KanbanUser
  role: KanbanBoardRole
  joinedAt: string
}

export type KanbanBoardRole = 'owner' | 'admin' | 'editor' | 'viewer'

export interface KanbanBoardPermissions {
  canView: boolean
  canEdit: boolean
  canAddTasks: boolean
  canMoveTasks: boolean
  canDeleteTasks: boolean
  canManageColumns: boolean
  canManageBoard: boolean
  canInviteMembers: boolean
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// --- Task Operations ---
export interface CreateTaskRequest {
  title: string
  description?: string
  priority: TaskPriority
  columnId: string
  position?: number
  assignedTo?: string
  dueDate?: string
  startDate?: string
  storyPoints?: number
  whyNote?: string
  labels?: string[]
  customFields?: Record<string, any>
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: string
  startDate?: string
  storyPoints?: number
  whyNote?: string
  labels?: string[]
  customFields?: Record<string, any>
}

export interface MoveTaskRequest {
  targetColumnId: string
  targetPosition: number
}

export interface AssignTaskRequest {
  assignedTo?: string
}

// --- Column Operations ---
export interface CreateColumnRequest {
  name: string
  color?: string
  position?: number
  columnType?: ColumnType
  wipLimit?: number
}

export interface UpdateColumnRequest {
  name?: string
  color?: string
  position?: number
  wipLimit?: number
}

export interface ReorderColumnsRequest {
  columnOrders: Array<{
    columnId: string
    position: number
  }>
}

// --- Board Operations ---
export interface CreateBoardRequest {
  name: string
  description?: string
  projectId?: string
  isPublic?: boolean
  settings?: Partial<KanbanBoardSettings>
}

export interface UpdateBoardRequest {
  name?: string
  description?: string
  isPublic?: boolean
  settings?: Partial<KanbanBoardSettings>
}

export interface GetBoardResponse {
  board: KanbanBoard
  columns: KanbanColumn[]
  tasks: KanbanTask[]
  labels: KanbanLabel[]
  permissions: KanbanBoardPermissions
}

// ============================================================================
// Real-time Event Types
// ============================================================================

export interface KanbanBoardEvent {
  type: 'task:created' | 'task:updated' | 'task:moved' | 'task:deleted' | 'task:assigned' |
        'column:created' | 'column:updated' | 'column:deleted' | 'column:reordered' |
        'board:updated' | 'member:added' | 'member:removed' | 'user:presence'
  boardId: string
  data: any
  userId: string
  timestamp: string
}

export interface TaskMovedEvent {
  taskId: string
  fromColumnId: string
  toColumnId: string
  fromPosition: number
  toPosition: number
  userId: string
}

export interface TaskUpdatedEvent {
  taskId: string
  changes: Partial<UpdateTaskRequest>
  userId: string
}

export interface UserPresenceEvent {
  userId: string
  status: KanbanUser['status']
  boardId: string
  lastSeen: string
}

// ============================================================================
// UI State Types
// ============================================================================

export interface KanbanBoardUIState {
  selectedTaskId?: string
  draggedTaskId?: string
  hoveredColumnId?: string
  filterState: KanbanFilterState
  viewMode: 'board' | 'list' | 'calendar'
  isLoading: boolean
  error?: string
}

export interface KanbanFilterState {
  assigneeIds?: string[]
  priorities?: TaskPriority[]
  labels?: string[]
  dueDateRange?: {
    start?: string
    end?: string
  }
  searchQuery?: string
  hideCompleted?: boolean
}

// ============================================================================
// Store and Query Types
// ============================================================================

export interface KanbanStoreState {
  // Data
  boards: Record<string, KanbanBoard>
  columns: Record<string, KanbanColumn>
  tasks: Record<string, KanbanTask>
  labels: Record<string, KanbanLabel>
  users: Record<string, KanbanUser>

  // UI State
  ui: KanbanBoardUIState

  // Active board context
  activeBoardId?: string
  activeProjectId?: string

  // Real-time presence
  presence: Record<string, UserPresenceEvent>
}

export interface UserPresence {
  userId: string
  status: KanbanUser['status']
  lastSeen: string
  currentBoardId?: string
}

// ============================================================================
// Error Types
// ============================================================================

export interface KanbanValidationError {
  field: string
  message: string
  code: string
}

export interface KanbanError extends Error {
  code: string
  field?: string
  details?: Record<string, any>
}

// ============================================================================
// Utility Types
// ============================================================================

export type TaskFormData = Omit<CreateTaskRequest, 'columnId' | 'position'>
export type ColumnFormData = Omit<CreateColumnRequest, 'boardId'>
export type BoardFormData = Omit<CreateBoardRequest, 'organizationId' | 'divisionId'>

export type TaskOptimisticUpdate = {
  id: string
  type: 'create' | 'update' | 'move' | 'delete'
  data: Partial<KanbanTask>
  timestamp: string
}

export type ColumnOptimisticUpdate = {
  id: string
  type: 'create' | 'update' | 'reorder' | 'delete'
  data: Partial<KanbanColumn>
  timestamp: string
}

// ============================================================================
// Legacy Compatibility Types (for gradual migration)
// ============================================================================

/** @deprecated Use KanbanTask instead */
export type Task = KanbanTask

/** @deprecated Use KanbanColumn instead */
export type Column = KanbanColumn

/** @deprecated Use KanbanUser instead */
export type User = KanbanUser