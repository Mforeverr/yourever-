/**
 * Zustand Store for Kanban Board State Management
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Comprehensive state management for kanban boards with
 * optimistic updates, real-time sync, and proper TypeScript typing.
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { useCallback } from 'react'
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
  KanbanLabel,
  KanbanUser,
  KanbanBoardPermissions,
  KanbanBoardUIState,
  KanbanFilterState,
  KanbanStoreState,
  TaskOptimisticUpdate,
  ColumnOptimisticUpdate,
  UserPresence,
  TaskMovedEvent,
  TaskUpdatedEvent,
  UserPresenceEvent,
  KanbanBoardEvent,
} from '@/types/kanban'

// ============================================================================
// Store State Interface
// ============================================================================

interface KanbanStore extends KanbanStoreState {
  // --- Data Management ---
  setBoard: (board: KanbanBoard) => void
  setBoards: (boards: KanbanBoard[]) => void
  updateBoard: (boardId: string, updates: Partial<KanbanBoard>) => void
  removeBoard: (boardId: string) => void

  setColumn: (column: KanbanColumn) => void
  setColumns: (columns: KanbanColumn[]) => void
  updateColumn: (columnId: string, updates: Partial<KanbanColumn>) => void
  removeColumn: (columnId: string) => void
  reorderColumns: (boardId: string, columnOrders: Array<{ columnId: string; position: number }>) => void

  setTask: (task: KanbanTask) => void
  setTasks: (tasks: KanbanTask[]) => void
  updateTask: (taskId: string, updates: Partial<KanbanTask>) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, targetColumnId: string, targetPosition: number) => void

  setLabel: (label: KanbanLabel) => void
  setLabels: (labels: KanbanLabel[]) => void
  removeLabel: (labelId: string) => void

  setUser: (user: KanbanUser) => void
  setUsers: (users: KanbanUser[]) => void

  // --- Active Context Management ---
  setActiveBoard: (boardId?: string) => void
  setActiveProject: (projectId?: string) => void

  // --- UI State Management ---
  setSelectedTask: (taskId?: string) => void
  setDraggedTask: (taskId?: string) => void
  setHoveredColumn: (columnId?: string) => void
  setViewMode: (mode: 'board' | 'list' | 'calendar') => void
  setLoading: (isLoading: boolean) => void
  setError: (error?: string) => void

  // --- Filter Management ---
  updateFilters: (filters: Partial<KanbanFilterState>) => void
  clearFilters: () => void
  setSearchQuery: (query: string) => void

  // --- Optimistic Updates ---
  addTaskOptimisticUpdate: (update: TaskOptimisticUpdate) => void
  removeTaskOptimisticUpdate: (taskId: string) => void
  addColumnOptimisticUpdate: (update: ColumnOptimisticUpdate) => void
  removeColumnOptimisticUpdate: (columnId: string) => void

  // --- Real-time Presence ---
  updatePresence: (userId: string, presence: Partial<UserPresence>) => void
  removePresence: (userId: string) => void

  // --- Real-time Sync Management ---
  setConnectionStatus: (status: 'online' | 'offline' | 'syncing') => void
  addSyncEvent: (event: KanbanBoardEvent) => void
  clearSyncEvents: () => void
  setConflictResolution: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => void
  removeConflict: (conflictId: string) => void

  // --- Cursor Tracking ---
  setActiveCursors: (cursors: Record<string, any>) => void
  updateCursor: (userId: string, cursor: any) => void
  removeCursor: (userId: string) => void

  // --- Activity History ---
  addActivityEvent: (event: any) => void
  clearActivityEvents: () => void

  // --- Board Management ---
  initializeBoard: (boardData: {
    board: KanbanBoard
    columns: KanbanColumn[]
    tasks: KanbanTask[]
    labels: KanbanLabel[]
    permissions: KanbanBoardPermissions
  }) => void
  clearBoard: () => void

  // --- Computed Selectors ---
  getActiveBoard: () => KanbanBoard | undefined
  getActiveBoardColumns: () => KanbanColumn[]
  getActiveBoardTasks: () => KanbanTask[]
  getTasksByColumn: (columnId: string) => KanbanTask[]
  getFilteredTasks: () => KanbanTask[]
  getBoardUsers: () => KanbanUser[]
  getBoardLabels: () => KanbanLabel[]
  getOptimisticTask: (taskId: string) => TaskOptimisticUpdate | undefined
  getOptimisticColumn: (columnId: string) => ColumnOptimisticUpdate | undefined
  getIsTaskFiltered: (task: KanbanTask) => boolean
  getTaskCount: () => number
  getColumnTaskCount: (columnId: string) => number

  // --- Additional state properties for real-time features ---
  connectionStatus: 'online' | 'offline' | 'syncing'
  syncEvents: KanbanBoardEvent[]
  conflicts: Map<string, any>
  activeCursors: Record<string, any>
  activityHistory: any[]
}

// ============================================================================
// Helper Functions
// ============================================================================

const createOptimisticTaskId = () => `temp-task-${Date.now()}-${Math.random().toString(36).slice(2)}`
const createOptimisticColumnId = () => `temp-column-${Date.now()}-${Math.random().toString(36).slice(2)}`

const applyTaskOptimisticUpdate = (task: KanbanTask, update: TaskOptimisticUpdate): KanbanTask => {
  switch (update.type) {
    case 'create':
      return {
        ...task,
        ...update.data,
        id: update.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    case 'update':
      return {
        ...task,
        ...update.data,
        updatedAt: new Date().toISOString(),
      }
    case 'move':
      return {
        ...task,
        columnId: update.data.columnId || task.columnId,
        position: update.data.position ?? task.position,
        updatedAt: new Date().toISOString(),
      }
    case 'delete':
      return task // Will be filtered out in getters
    default:
      return task
  }
}

const applyColumnOptimisticUpdate = (column: KanbanColumn, update: ColumnOptimisticUpdate): KanbanColumn => {
  switch (update.type) {
    case 'create':
      return {
        ...column,
        ...update.data,
        id: update.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    case 'update':
      return {
        ...column,
        ...update.data,
        updatedAt: new Date().toISOString(),
      }
    case 'reorder':
      return {
        ...column,
        position: update.data.position ?? column.position,
        updatedAt: new Date().toISOString(),
      }
    case 'delete':
      return column // Will be filtered out in getters
    default:
      return column
  }
}

const isTaskFiltered = (task: KanbanTask, filters: KanbanFilterState): boolean => {
  if (filters.assigneeIds && filters.assigneeIds.length > 0) {
    if (!task.assignedTo || !filters.assigneeIds.includes(task.assignedTo)) {
      return true
    }
  }

  if (filters.priorities && filters.priorities.length > 0) {
    if (!filters.priorities.includes(task.priority)) {
      return true
    }
  }

  if (filters.labels && filters.labels.length > 0) {
    const taskLabelIds = task.labels.map(label => label.id)
    if (!filters.labels.some(labelId => taskLabelIds.includes(labelId))) {
      return true
    }
  }

  if (filters.dueDateRange?.start || filters.dueDateRange?.end) {
    if (!task.dueDate) {
      return true
    }
    const dueDate = new Date(task.dueDate)
    if (filters.dueDateRange.start && dueDate < new Date(filters.dueDateRange.start)) {
      return true
    }
    if (filters.dueDateRange.end && dueDate > new Date(filters.dueDateRange.end)) {
      return true
    }
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    const searchText = `${task.title} ${task.description || ''}`.toLowerCase()
    if (!searchText.includes(query)) {
      return true
    }
  }

  if (filters.hideCompleted && task.status === 'done') {
    return true
  }

  return false
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useKanbanStore = create<KanbanStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // --- Initial State ---
      boards: {},
      columns: {},
      tasks: {},
      labels: {},
      users: {},
      ui: {
        selectedTaskId: undefined,
        draggedTaskId: undefined,
        hoveredColumnId: undefined,
        filterState: {},
        viewMode: 'board',
        isLoading: false,
        error: undefined,
      },
      activeBoardId: undefined,
      activeProjectId: undefined,
      presence: {},

      // --- Real-time State ---
      connectionStatus: 'offline' as 'online' | 'offline' | 'syncing',
      syncEvents: [],
      conflicts: new Map(),
      activeCursors: {},
      activityHistory: [],

      // --- Data Management ---
      setBoard: (board) =>
        set(
          (state) => ({
            boards: { ...state.boards, [board.id]: board },
          }),
          false,
          'setBoard'
        ),

      setBoards: (boards) =>
        set(
          (state) => ({
            boards: boards.reduce((acc, board) => ({ ...acc, [board.id]: board }), {}),
          }),
          false,
          'setBoards'
        ),

      updateBoard: (boardId, updates) =>
        set(
          (state) => ({
            boards: state.boards[boardId]
              ? { ...state.boards, [boardId]: { ...state.boards[boardId], ...updates } }
              : state.boards,
          }),
          false,
          'updateBoard'
        ),

      removeBoard: (boardId) =>
        set(
          (state) => {
            const newBoards = { ...state.boards }
            delete newBoards[boardId]
            return { boards: newBoards }
          },
          false,
          'removeBoard'
        ),

      setColumn: (column) =>
        set(
          (state) => ({
            columns: { ...state.columns, [column.id]: column },
          }),
          false,
          'setColumn'
        ),

      setColumns: (columns) =>
        set(
          (state) => ({
            columns: columns.reduce((acc, column) => ({ ...acc, [column.id]: column }), {}),
          }),
          false,
          'setColumns'
        ),

      updateColumn: (columnId, updates) =>
        set(
          (state) => ({
            columns: state.columns[columnId]
              ? { ...state.columns, [columnId]: { ...state.columns[columnId], ...updates } }
              : state.columns,
          }),
          false,
          'updateColumn'
        ),

      removeColumn: (columnId) =>
        set(
          (state) => {
            const newColumns = { ...state.columns }
            delete newColumns[columnId]
            return { columns: newColumns }
          },
          false,
          'removeColumn'
        ),

      reorderColumns: (boardId, columnOrders) =>
        set(
          (state) => {
            const newColumns = { ...state.columns }
            columnOrders.forEach(({ columnId, position }) => {
              if (newColumns[columnId]) {
                newColumns[columnId] = { ...newColumns[columnId], position }
              }
            })
            return { columns: newColumns }
          },
          false,
          'reorderColumns'
        ),

      setTask: (task) =>
        set(
          (state) => ({
            tasks: { ...state.tasks, [task.id]: task },
          }),
          false,
          'setTask'
        ),

      setTasks: (tasks) =>
        set(
          (state) => ({
            tasks: tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {}),
          }),
          false,
          'setTasks'
        ),

      updateTask: (taskId, updates) =>
        set(
          (state) => ({
            tasks: state.tasks[taskId]
              ? { ...state.tasks, [taskId]: { ...state.tasks[taskId], ...updates, updatedAt: new Date().toISOString() } }
              : state.tasks,
          }),
          false,
          'updateTask'
        ),

      removeTask: (taskId) =>
        set(
          (state) => {
            const newTasks = { ...state.tasks }
            delete newTasks[taskId]
            return { tasks: newTasks }
          },
          false,
          'removeTask'
        ),

      moveTask: (taskId, targetColumnId, targetPosition) =>
        set(
          (state) => ({
            tasks: state.tasks[taskId]
              ? {
                  ...state.tasks,
                  [taskId]: {
                    ...state.tasks[taskId],
                    columnId: targetColumnId,
                    position: targetPosition,
                    updatedAt: new Date().toISOString(),
                  },
                }
              : state.tasks,
          }),
          false,
          'moveTask'
        ),

      setLabel: (label) =>
        set(
          (state) => ({
            labels: { ...state.labels, [label.id]: label },
          }),
          false,
          'setLabel'
        ),

      setLabels: (labels) =>
        set(
          (state) => ({
            labels: labels.reduce((acc, label) => ({ ...acc, [label.id]: label }), {}),
          }),
          false,
          'setLabels'
        ),

      removeLabel: (labelId) =>
        set(
          (state) => {
            const newLabels = { ...state.labels }
            delete newLabels[labelId]
            return { labels: newLabels }
          },
          false,
          'removeLabel'
        ),

      setUser: (user) =>
        set(
          (state) => ({
            users: { ...state.users, [user.id]: user },
          }),
          false,
          'setUser'
        ),

      setUsers: (users) =>
        set(
          (state) => ({
            users: users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {}),
          }),
          false,
          'setUsers'
        ),

      // --- Active Context Management ---
      setActiveBoard: (boardId) =>
        set(
          { activeBoardId: boardId },
          false,
          'setActiveBoard'
        ),

      setActiveProject: (projectId) =>
        set(
          { activeProjectId: projectId },
          false,
          'setActiveProject'
        ),

      // --- UI State Management ---
      setSelectedTask: (taskId) =>
        set(
          (state) => ({
            ui: { ...state.ui, selectedTaskId: taskId },
          }),
          false,
          'setSelectedTask'
        ),

      setDraggedTask: (taskId) =>
        set(
          (state) => ({
            ui: { ...state.ui, draggedTaskId: taskId },
          }),
          false,
          'setDraggedTask'
        ),

      setHoveredColumn: (columnId) =>
        set(
          (state) => ({
            ui: { ...state.ui, hoveredColumnId: columnId },
          }),
          false,
          'setHoveredColumn'
        ),

      setViewMode: (mode) =>
        set(
          (state) => ({
            ui: { ...state.ui, viewMode: mode },
          }),
          false,
          'setViewMode'
        ),

      setLoading: (isLoading) =>
        set(
          (state) => ({
            ui: { ...state.ui, isLoading },
          }),
          false,
          'setLoading'
        ),

      setError: (error) =>
        set(
          (state) => ({
            ui: { ...state.ui, error },
          }),
          false,
          'setError'
        ),

      // --- Filter Management ---
      updateFilters: (filters) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              filterState: { ...state.ui.filterState, ...filters },
            },
          }),
          false,
          'updateFilters'
        ),

      clearFilters: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              filterState: {},
            },
          }),
          false,
          'clearFilters'
        ),

      setSearchQuery: (query) =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              filterState: { ...state.ui.filterState, searchQuery: query },
            },
          }),
          false,
          'setSearchQuery'
        ),

      // --- Optimistic Updates ---
      addTaskOptimisticUpdate: (update) =>
        set(
          (state) => ({
            tasks: {
              ...state.tasks,
              [update.id]: update.type === 'create'
                ? {
                    id: update.id,
                    title: '',
                    priority: 'medium',
                    status: 'todo',
                    position: 0,
                    columnId: '',
                    boardId: '',
                    createdBy: '',
                    labels: [],
                    customFields: {},
                    isArchived: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...update.data,
                  }
                : state.tasks[update.id]
                  ? applyTaskOptimisticUpdate(state.tasks[update.id], update)
                  : state.tasks[update.id],
            },
          }),
          false,
          'addTaskOptimisticUpdate'
        ),

      removeTaskOptimisticUpdate: (taskId) =>
        set(
          (state) => {
            const newTasks = { ...state.tasks }
            if (newTasks[taskId]?.id.startsWith('temp-')) {
              delete newTasks[taskId]
            }
            return { tasks: newTasks }
          },
          false,
          'removeTaskOptimisticUpdate'
        ),

      addColumnOptimisticUpdate: (update) =>
        set(
          (state) => ({
            columns: {
              ...state.columns,
              [update.id]: update.type === 'create'
                ? {
                    id: update.id,
                    name: '',
                    color: '#3b82f6',
                    position: 0,
                    columnType: 'custom',
                    boardId: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...update.data,
                  }
                : state.columns[update.id]
                  ? applyColumnOptimisticUpdate(state.columns[update.id], update)
                  : state.columns[update.id],
            },
          }),
          false,
          'addColumnOptimisticUpdate'
        ),

      removeColumnOptimisticUpdate: (columnId) =>
        set(
          (state) => {
            const newColumns = { ...state.columns }
            if (newColumns[columnId]?.id.startsWith('temp-')) {
              delete newColumns[columnId]
            }
            return { columns: newColumns }
          },
          false,
          'removeColumnOptimisticUpdate'
        ),

      // --- Real-time Presence ---
      updatePresence: (userId, presence) =>
        set(
          (state) => ({
            presence: {
              ...state.presence,
              [userId]: {
                ...state.presence[userId],
                userId,
                status: 'online',
                lastSeen: new Date().toISOString(),
                ...presence,
              },
            },
          }),
          false,
          'updatePresence'
        ),

      removePresence: (userId) =>
        set(
          (state) => {
            const newPresence = { ...state.presence }
            delete newPresence[userId]
            return { presence: newPresence }
          },
          false,
          'removePresence'
        ),

      // --- Real-time Sync Management ---
      setConnectionStatus: (status) =>
        set({ connectionStatus: status }, false, 'setConnectionStatus'),

      addSyncEvent: (event) =>
        set(
          (state) => ({
            syncEvents: [...state.syncEvents.slice(-99), event], // Keep last 100 events
          }),
          false,
          'addSyncEvent'
        ),

      clearSyncEvents: () =>
        set({ syncEvents: [] }, false, 'clearSyncEvents'),

      setConflictResolution: (conflictId, resolution) =>
        set(
          (state) => {
            const newConflicts = new Map(state.conflicts)
            const conflict = newConflicts.get(conflictId)
            if (conflict) {
              newConflicts.set(conflictId, { ...conflict, resolution })
            }
            return { conflicts: newConflicts }
          },
          false,
          'setConflictResolution'
        ),

      removeConflict: (conflictId) =>
        set(
          (state) => {
            const newConflicts = new Map(state.conflicts)
            newConflicts.delete(conflictId)
            return { conflicts: newConflicts }
          },
          false,
          'removeConflict'
        ),

      // --- Cursor Tracking ---
      setActiveCursors: (cursors) =>
        set({ activeCursors: cursors }, false, 'setActiveCursors'),

      updateCursor: (userId, cursor) =>
        set(
          (state) => ({
            activeCursors: {
              ...state.activeCursors,
              [userId]: {
                ...state.activeCursors[userId],
                ...cursor,
                lastUpdated: new Date().toISOString(),
              },
            },
          }),
          false,
          'updateCursor'
        ),

      removeCursor: (userId) =>
        set(
          (state) => {
            const newCursors = { ...state.activeCursors }
            delete newCursors[userId]
            return { activeCursors: newCursors }
          },
          false,
          'removeCursor'
        ),

      // --- Activity History ---
      addActivityEvent: (event) =>
        set(
          (state) => ({
            activityHistory: [
              {
                ...event,
                timestamp: event.timestamp || new Date().toISOString(),
              },
              ...state.activityHistory.slice(0, 49), // Keep last 50 events
            ],
          }),
          false,
          'addActivityEvent'
        ),

      clearActivityEvents: () =>
        set({ activityHistory: [] }, false, 'clearActivityEvents'),

      // --- Board Management ---
      initializeBoard: ({ board, columns, tasks, labels }) =>
        set(
          (state) => ({
            boards: { ...state.boards, [board.id]: board },
            columns: columns.reduce((acc, column) => ({ ...acc, [column.id]: column }), {}),
            tasks: tasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {}),
            labels: labels.reduce((acc, label) => ({ ...acc, [label.id]: label }), {}),
            activeBoardId: board.id,
            ui: { ...state.ui, isLoading: false, error: undefined },
          }),
          false,
          'initializeBoard'
        ),

      clearBoard: () =>
        set(
          (state) => ({
            activeBoardId: undefined,
            ui: { ...state.ui, selectedTaskId: undefined, draggedTaskId: undefined },
          }),
          false,
          'clearBoard'
        ),

      // --- Computed Selectors ---
      getActiveBoard: () => {
        const { activeBoardId, boards } = get()
        return activeBoardId ? boards[activeBoardId] : undefined
      },

      getActiveBoardColumns: () => {
        const { activeBoardId, columns } = get()
        return Object.values(columns)
          .filter(column => activeBoardId && column.boardId === activeBoardId)
          .sort((a, b) => a.position - b.position)
      },

      getActiveBoardTasks: () => {
        const { activeBoardId, tasks, ui } = get()
        return Object.values(tasks).filter(task => {
          const isActiveBoard = activeBoardId && task.boardId === activeBoardId
          const isNotFiltered = !isTaskFiltered(task, ui.filterState)
          return isActiveBoard && isNotFiltered
        })
      },

      getTasksByColumn: (columnId) => {
        const { tasks, ui } = get()
        return Object.values(tasks)
          .filter(task => task.columnId === columnId && !isTaskFiltered(task, ui.filterState))
          .sort((a, b) => a.position - b.position)
      },

      getFilteredTasks: () => {
        const { tasks, ui } = get()
        return Object.values(tasks).filter(task => !isTaskFiltered(task, ui.filterState))
      },

      getBoardUsers: () => {
        const { tasks, users } = get()
        const userIds = new Set(
          Object.values(tasks).flatMap(task => [
            task.createdBy,
            task.assignedTo,
          ].filter(Boolean) as string[])
        )
        return Array.from(userIds).map(userId => users[userId]).filter(Boolean)
      },

      getBoardLabels: () => {
        const { tasks, labels } = get()
        const labelIds = new Set(
          Object.values(tasks).flatMap(task => task.labels.map(label => label.id))
        )
        return Array.from(labelIds).map(labelId => labels[labelId]).filter(Boolean)
      },

      getOptimisticTask: (taskId) => {
        const { tasks } = get()
        const task = tasks[taskId]
        return task && task.id.startsWith('temp-')
          ? {
              id: task.id,
              type: 'create' as const,
              data: task,
              timestamp: task.createdAt,
            }
          : undefined
      },

      getOptimisticColumn: (columnId) => {
        const { columns } = get()
        const column = columns[columnId]
        return column && column.id.startsWith('temp-')
          ? {
              id: column.id,
              type: 'create' as const,
              data: column,
              timestamp: column.createdAt,
            }
          : undefined
      },

      getIsTaskFiltered: (task) => {
        const { ui } = get()
        return isTaskFiltered(task, ui.filterState)
      },

      getTaskCount: () => {
        const { tasks, ui } = get()
        return Object.values(tasks).filter(task => !isTaskFiltered(task, ui.filterState)).length
      },

      getColumnTaskCount: (columnId) => {
        const { tasks, ui } = get()
        return Object.values(tasks).filter(
          task => task.columnId === columnId && !isTaskFiltered(task, ui.filterState)
        ).length
      },
    })),
    { name: 'kanban-store' }
  )
)

// ============================================================================
// Selectors for Specific Use Cases
// ============================================================================

// Memoized selectors to prevent infinite re-renders
export const useActiveBoard = () => useKanbanStore(
  useCallback((state) => {
    const { activeBoardId, boards } = state
    return activeBoardId ? boards[activeBoardId] : undefined
  }, [])
)

export const useActiveBoardColumns = () => useKanbanStore(
  useCallback((state) => {
    const { activeBoardId, columns } = state
    return Object.values(columns)
      .filter(column => activeBoardId && column.boardId === activeBoardId)
      .sort((a, b) => a.position - b.position)
  }, [])
)

export const useActiveBoardTasks = () => useKanbanStore(
  useCallback((state) => {
    const { activeBoardId, tasks, ui } = state
    return Object.values(tasks).filter(task => {
      const isActiveBoard = activeBoardId && task.boardId === activeBoardId
      const isNotFiltered = !isTaskFiltered(task, ui.filterState)
      return isActiveBoard && isNotFiltered
    })
  }, [])
)

export const useKanbanUI = () => useKanbanStore(
  useCallback((state) => state.ui, [])
)

export const useKanbanFilters = () => useKanbanStore(
  useCallback((state) => state.ui.filterState, [])
)

export const useSelectedTask = () => useKanbanStore(
  useCallback((state) => {
    const selectedTaskId = state.ui.selectedTaskId
    return selectedTaskId ? state.tasks[selectedTaskId] : undefined
  }, [])
)

// Additional optimized selectors
export const useTasksByColumn = (columnId: string) => useKanbanStore(
  useCallback((state) => {
    const { tasks, ui } = state
    return Object.values(tasks)
      .filter(task => task.columnId === columnId && !isTaskFiltered(task, ui.filterState))
      .sort((a, b) => a.position - b.position)
  }, [columnId])
)

export const useFilteredTasks = () => useKanbanStore(
  useCallback((state) => {
    const { tasks, ui } = state
    return Object.values(tasks).filter(task => !isTaskFiltered(task, ui.filterState))
  }, [])
)

export const useBoardUsers = () => useKanbanStore(
  useCallback((state) => {
    const { tasks, users } = state
    const userIds = new Set(
      Object.values(tasks).flatMap(task => [
        task.createdBy,
        task.assignedTo,
      ].filter(Boolean) as string[])
    )
    return Array.from(userIds).map(userId => users[userId]).filter(Boolean)
  }, [])
)

export const useBoardLabels = () => useKanbanStore(
  useCallback((state) => {
    const { tasks, labels } = state
    const labelIds = new Set(
      Object.values(tasks).flatMap(task => task.labels.map(label => label.id))
    )
    return Array.from(labelIds).map(labelId => labels[labelId]).filter(Boolean)
  }, [])
)

export const useOptimisticTask = (taskId: string) => useKanbanStore(
  useCallback((state) => {
    const { tasks } = state
    const task = tasks[taskId]
    return task && task.id.startsWith('temp-')
      ? {
          id: task.id,
          type: 'create' as const,
          data: task,
          timestamp: task.createdAt,
        }
      : undefined
  }, [taskId])
)

export const useOptimisticColumn = (columnId: string) => useKanbanStore(
  useCallback((state) => {
    const { columns } = state
    const column = columns[columnId]
    return column && column.id.startsWith('temp-')
      ? {
          id: column.id,
          type: 'create' as const,
          data: column,
          timestamp: column.createdAt,
        }
      : undefined
  }, [columnId])
)

export const useTaskCount = () => useKanbanStore(
  useCallback((state) => {
    const { tasks, ui } = state
    return Object.values(tasks).filter(task => !isTaskFiltered(task, ui.filterState)).length
  }, [])
)

export const useColumnTaskCount = (columnId: string) => useKanbanStore(
  useCallback((state) => {
    const { tasks, ui } = state
    return Object.values(tasks).filter(
      task => task.columnId === columnId && !isTaskFiltered(task, ui.filterState)
    ).length
  }, [columnId])
)

// ============================================================================
// Real-time Event Handlers
// ============================================================================

export const handleTaskMovedEvent = (event: TaskMovedEvent) => {
  const store = useKanbanStore.getState()
  store.moveTask(event.taskId, event.toColumnId, event.toPosition)
}

export const handleTaskUpdatedEvent = (event: TaskUpdatedEvent) => {
  const store = useKanbanStore.getState()

  // Convert UpdateTaskRequest to Partial<KanbanTask>
  const taskUpdates: Partial<KanbanTask> = {}

  // Copy compatible properties
  if (event.changes.title !== undefined) taskUpdates.title = event.changes.title
  if (event.changes.description !== undefined) taskUpdates.description = event.changes.description
  if (event.changes.priority !== undefined) taskUpdates.priority = event.changes.priority
  if (event.changes.assignedTo !== undefined) taskUpdates.assignedTo = event.changes.assignedTo
  if (event.changes.dueDate !== undefined) taskUpdates.dueDate = event.changes.dueDate
  if (event.changes.startDate !== undefined) taskUpdates.startDate = event.changes.startDate
  if (event.changes.storyPoints !== undefined) taskUpdates.storyPoints = event.changes.storyPoints
  if (event.changes.whyNote !== undefined) taskUpdates.description = event.changes.whyNote
  if (event.changes.customFields !== undefined) taskUpdates.customFields = event.changes.customFields

  // Convert label strings to KanbanLabel objects if needed
  if (event.changes.labels) {
    taskUpdates.labels = event.changes.labels.map((labelId: string) => ({
      id: labelId,
      name: labelId, // Fallback name - in real implementation, this should fetch the actual label
      color: '#gray', // Fallback color
    }))
  }

  store.updateTask(event.taskId, taskUpdates)
}

export const handleUserPresenceEvent = (event: UserPresenceEvent) => {
  const store = useKanbanStore.getState()
  store.updatePresence(event.userId, {
    status: event.status,
    lastSeen: event.lastSeen,
    currentBoardId: event.boardId,
  })
}