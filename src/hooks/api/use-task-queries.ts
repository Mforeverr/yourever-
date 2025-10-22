/**
 * React Query Hooks for Kanban Task Management
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Complete React Query hooks for all kanban board API operations
 * with proper error handling, optimistic updates, and scope integration.
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpRequest } from '@/lib/api/http'
import { useScope } from '@/contexts/scope-context'
import { toast } from '@/hooks/use-toast'
import type {
  KanbanBoard,
  KanbanTask,
  KanbanColumn,
  KanbanLabel,
  KanbanBoardMember,
  KanbanBoardPermissions,
  CreateTaskRequest,
  UpdateTaskRequest,
  MoveTaskRequest,
  AssignTaskRequest,
  CreateColumnRequest,
  UpdateColumnRequest,
  ReorderColumnsRequest,
  CreateBoardRequest,
  UpdateBoardRequest,
  GetBoardResponse,
  TaskMovedEvent,
  TaskUpdatedEvent,
} from '@/types/kanban'

// ============================================================================
// API Client Functions
// ============================================================================

const API_BASE = '/api/v1'

// --- Board API Functions ---
async function getBoard(orgId: string, boardId: string): Promise<GetBoardResponse> {
  return httpRequest('GET', `${API_BASE}/organizations/${orgId}/boards/${boardId}`, {
    meta: {
      endpoint: `organizations/${orgId}/boards/${boardId}`,
      method: 'GET',
      scope: { orgId },
    },
  })
}

async function getBoards(orgId: string, divisionId?: string): Promise<KanbanBoard[]> {
  const url = divisionId
    ? `${API_BASE}/organizations/${orgId}/divisions/${divisionId}/boards`
    : `${API_BASE}/organizations/${orgId}/boards`

  return httpRequest('GET', url, {
    meta: {
      endpoint: url,
      method: 'GET',
      scope: { orgId, divisionId },
    },
  })
}

async function createBoard(orgId: string, payload: CreateBoardRequest): Promise<KanbanBoard> {
  return httpRequest('POST', `${API_BASE}/organizations/${orgId}/boards`, {
    body: payload,
    meta: {
      endpoint: `organizations/${orgId}/boards`,
      method: 'POST',
      scope: { orgId },
    },
  })
}

async function updateBoard(orgId: string, boardId: string, payload: UpdateBoardRequest): Promise<KanbanBoard> {
  return httpRequest('PUT', `${API_BASE}/organizations/${orgId}/boards/${boardId}`, {
    body: payload,
    meta: {
      endpoint: `organizations/${orgId}/boards/${boardId}`,
      method: 'PUT',
      scope: { orgId },
    },
  })
}

async function deleteBoard(orgId: string, boardId: string): Promise<void> {
  return httpRequest('DELETE', `${API_BASE}/organizations/${orgId}/boards/${boardId}`, {
    meta: {
      endpoint: `organizations/${orgId}/boards/${boardId}`,
      method: 'DELETE',
      scope: { orgId },
    },
  })
}

// --- Column API Functions ---
async function getColumns(boardId: string): Promise<KanbanColumn[]> {
  return httpRequest('GET', `${API_BASE}/boards/${boardId}/columns`, {
    meta: {
      endpoint: `boards/${boardId}/columns`,
      method: 'GET',
    },
  })
}

async function createColumn(boardId: string, payload: CreateColumnRequest): Promise<KanbanColumn> {
  return httpRequest('POST', `${API_BASE}/boards/${boardId}/columns`, {
    body: payload,
    meta: {
      endpoint: `boards/${boardId}/columns`,
      method: 'POST',
    },
  })
}

async function updateColumn(boardId: string, columnId: string, payload: UpdateColumnRequest): Promise<KanbanColumn> {
  return httpRequest('PUT', `${API_BASE}/boards/${boardId}/columns/${columnId}`, {
    body: payload,
    meta: {
      endpoint: `boards/${boardId}/columns/${columnId}`,
      method: 'PUT',
    },
  })
}

async function deleteColumn(boardId: string, columnId: string): Promise<void> {
  return httpRequest('DELETE', `${API_BASE}/boards/${boardId}/columns/${columnId}`, {
    meta: {
      endpoint: `boards/${boardId}/columns/${columnId}`,
      method: 'DELETE',
    },
  })
}

async function reorderColumns(boardId: string, payload: ReorderColumnsRequest): Promise<KanbanColumn[]> {
  return httpRequest('PUT', `${API_BASE}/boards/${boardId}/columns/reorder`, {
    body: payload,
    meta: {
      endpoint: `boards/${boardId}/columns/reorder`,
      method: 'PUT',
    },
  })
}

// --- Task API Functions ---
async function getTasks(columnId: string): Promise<KanbanTask[]> {
  return httpRequest('GET', `${API_BASE}/columns/${columnId}/tasks`, {
    meta: {
      endpoint: `columns/${columnId}/tasks`,
      method: 'GET',
    },
  })
}

async function getTask(taskId: string): Promise<KanbanTask> {
  return httpRequest('GET', `${API_BASE}/tasks/${taskId}`, {
    meta: {
      endpoint: `tasks/${taskId}`,
      method: 'GET',
    },
  })
}

async function createTask(columnId: string, payload: CreateTaskRequest): Promise<KanbanTask> {
  return httpRequest('POST', `${API_BASE}/columns/${columnId}/tasks`, {
    body: payload,
    meta: {
      endpoint: `columns/${columnId}/tasks`,
      method: 'POST',
    },
  })
}

async function updateTask(taskId: string, payload: UpdateTaskRequest): Promise<KanbanTask> {
  return httpRequest('PUT', `${API_BASE}/tasks/${taskId}`, {
    body: payload,
    meta: {
      endpoint: `tasks/${taskId}`,
      method: 'PUT',
    },
  })
}

async function deleteTask(taskId: string): Promise<void> {
  return httpRequest('DELETE', `${API_BASE}/tasks/${taskId}`, {
    meta: {
      endpoint: `tasks/${taskId}`,
      method: 'DELETE',
    },
  })
}

async function moveTask(taskId: string, payload: MoveTaskRequest): Promise<KanbanTask> {
  return httpRequest('PUT', `${API_BASE}/tasks/${taskId}/move`, {
    body: payload,
    meta: {
      endpoint: `tasks/${taskId}/move`,
      method: 'PUT',
    },
  })
}

async function assignTask(taskId: string, payload: AssignTaskRequest): Promise<KanbanTask> {
  return httpRequest('PUT', `${API_BASE}/tasks/${taskId}/assign`, {
    body: payload,
    meta: {
      endpoint: `tasks/${taskId}/assign`,
      method: 'PUT',
    },
  })
}

// --- Label API Functions ---
async function getLabels(boardId: string): Promise<KanbanLabel[]> {
  return httpRequest('GET', `${API_BASE}/boards/${boardId}/labels`, {
    meta: {
      endpoint: `boards/${boardId}/labels`,
      method: 'GET',
    },
  })
}

// --- Member API Functions ---
async function getBoardMembers(boardId: string): Promise<KanbanBoardMember[]> {
  return httpRequest('GET', `${API_BASE}/boards/${boardId}/members`, {
    meta: {
      endpoint: `boards/${boardId}/members`,
      method: 'GET',
    },
  })
}

// ============================================================================
// Query Hooks
// ============================================================================

export function useBoardQuery(boardId: string) {
  const { currentOrgId } = useScope()

  return useQuery({
    queryKey: ['kanban', 'board', currentOrgId, boardId],
    queryFn: () => {
      if (!currentOrgId || !boardId) {
        throw new Error('Organization ID and Board ID are required')
      }
      return getBoard(currentOrgId, boardId)
    },
    enabled: !!currentOrgId && !!boardId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useBoardsQuery(divisionId?: string) {
  const { currentOrgId } = useScope()

  return useQuery({
    queryKey: ['kanban', 'boards', currentOrgId, divisionId],
    queryFn: () => {
      if (!currentOrgId) {
        throw new Error('Organization ID is required')
      }
      return getBoards(currentOrgId, divisionId)
    },
    enabled: !!currentOrgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useTasksQuery(columnId: string) {
  return useQuery({
    queryKey: ['kanban', 'tasks', columnId],
    queryFn: () => {
      if (!columnId) {
        throw new Error('Column ID is required')
      }
      return getTasks(columnId)
    },
    enabled: !!columnId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useTaskQuery(taskId: string) {
  return useQuery({
    queryKey: ['kanban', 'task', taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error('Task ID is required')
      }
      return getTask(taskId)
    },
    enabled: !!taskId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useLabelsQuery(boardId: string) {
  return useQuery({
    queryKey: ['kanban', 'labels', boardId],
    queryFn: () => {
      if (!boardId) {
        throw new Error('Board ID is required')
      }
      return getLabels(boardId)
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useBoardMembersQuery(boardId: string) {
  return useQuery({
    queryKey: ['kanban', 'members', boardId],
    queryFn: () => {
      if (!boardId) {
        throw new Error('Board ID is required')
      }
      return getBoardMembers(boardId)
    },
    enabled: !!boardId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  })
}

// ============================================================================
// Mutation Hooks with Optimistic Updates
// ============================================================================

export function useCreateTaskMutation() {
  const queryClient = useQueryClient()
  const { currentOrgId, currentDivisionId } = useScope()

  return useMutation({
    mutationFn: async ({ columnId, payload }: { columnId: string; payload: CreateTaskRequest }) => {
      return createTask(columnId, payload)
    },
    onMutate: async ({ columnId, payload }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['kanban', 'tasks', columnId] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<KanbanTask[]>(['kanban', 'tasks', columnId]) || []

      // Optimistically update to the new value
      const optimisticTask: KanbanTask = {
        id: `temp-${Date.now()}`,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        status: 'todo', // Will be updated by API
        position: payload.position ?? previousTasks.length,
        columnId,
        boardId: '', // Will be filled by API
        createdBy: '', // Will be filled by API
        assignedTo: payload.assignedTo,
        dueDate: payload.dueDate,
        startDate: payload.startDate,
        storyPoints: payload.storyPoints,
        whyNote: payload.whyNote,
        labels: [], // Will be populated by API
        customFields: payload.customFields || {},
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData(['kanban', 'tasks', columnId], (old: KanbanTask[] = []) => [
        ...old,
        optimisticTask,
      ])

      return { previousTasks, optimisticTask }
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        queryClient.setQueryData(['kanban', 'tasks', variables.columnId], context.previousTasks)
      }

      toast({
        title: 'Failed to create task',
        description: error.message || 'An error occurred while creating the task',
        variant: 'destructive',
      })
    },
    onSuccess: (newTask, variables) => {
      // Update the cache with the real task data
      queryClient.setQueryData(['kanban', 'tasks', variables.columnId], (old: KanbanTask[] = []) =>
        old.map(task => task.id.startsWith('temp-') ? newTask : task)
      )

      toast({
        title: 'Task created',
        description: `"${newTask.title}" has been created successfully`,
      })
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to make sure the server state is reflected
      queryClient.invalidateQueries({ queryKey: ['kanban', 'tasks', variables.columnId] })
    },
  })
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: UpdateTaskRequest }) => {
      return updateTask(taskId, payload)
    },
    onMutate: async ({ taskId, payload }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['kanban', 'task', taskId] })

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<KanbanTask>(['kanban', 'task', taskId])

      // Optimistically update the task
      if (previousTask) {
        const optimisticTask = { ...previousTask, ...payload, updatedAt: new Date().toISOString() }
        queryClient.setQueryData(['kanban', 'task', taskId], optimisticTask)

        // Also update the task in the column cache if it exists there
        queryClient.setQueriesData(
          { queryKey: ['kanban', 'tasks'] },
          (oldTasks: KanbanTask[] = []) =>
            oldTasks.map(task => task.id === taskId ? optimisticTask : task)
        )
      }

      return { previousTask }
    },
    onError: (error, variables, context) => {
      // Roll back on error
      if (context?.previousTask) {
        queryClient.setQueryData(['kanban', 'task', variables.taskId], context.previousTask)

        // Also rollback in column caches
        queryClient.setQueriesData(
          { queryKey: ['kanban', 'tasks'] },
          (oldTasks: KanbanTask[] = []) =>
            oldTasks.map(task => task.id === variables.taskId ? context.previousTask! : task)
        )
      }

      toast({
        title: 'Failed to update task',
        description: error.message || 'An error occurred while updating the task',
        variant: 'destructive',
      })
    },
    onSuccess: (updatedTask) => {
      // Update all caches with the new task data
      queryClient.setQueryData(['kanban', 'task', updatedTask.id], updatedTask)

      queryClient.setQueriesData(
        { queryKey: ['kanban', 'tasks'] },
        (oldTasks: KanbanTask[] = []) =>
          oldTasks.map(task => task.id === updatedTask.id ? updatedTask : task)
      )

      toast({
        title: 'Task updated',
        description: `"${updatedTask.title}" has been updated successfully`,
      })
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['kanban', 'task', variables.taskId] })
    },
  })
}

export function useMoveTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, payload }: { taskId: string; payload: MoveTaskRequest }) => {
      return moveTask(taskId, payload)
    },
    onMutate: async ({ taskId, payload }) => {
      // Cancel any outgoing refetches for both columns
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['kanban', 'tasks'] }),
        queryClient.cancelQueries({ queryKey: ['kanban', 'task', taskId] }),
      ])

      // Find the current task to get its data
      let currentTask: KanbanTask | undefined
      queryClient.setQueriesData(
        { queryKey: ['kanban', 'tasks'] },
        (oldTasks: KanbanTask[] = []) => {
          const updatedTasks = oldTasks.map(task => {
            if (task.id === taskId) {
              currentTask = task
              return {
                ...task,
                columnId: payload.targetColumnId,
                position: payload.targetPosition,
                status: getColumnStatus(payload.targetColumnId), // Would need column data
                updatedAt: new Date().toISOString(),
              }
            }
            return task
          })
          return updatedTasks
        }
      )

      // Update the individual task cache
      if (currentTask) {
        queryClient.setQueryData(['kanban', 'task', taskId], {
          ...currentTask,
          columnId: payload.targetColumnId,
          position: payload.targetPosition,
          updatedAt: new Date().toISOString(),
        })
      }

      return { currentTask }
    },
    onError: (error, variables, context) => {
      // Roll back the optimistic update
      if (context?.currentTask) {
        queryClient.setQueriesData(
          { queryKey: ['kanban', 'tasks'] },
          (oldTasks: KanbanTask[] = []) =>
            oldTasks.map(task => task.id === variables.taskId ? context.currentTask! : task)
        )

        queryClient.setQueryData(['kanban', 'task', variables.taskId], context.currentTask)
      }

      toast({
        title: 'Failed to move task',
        description: error.message || 'An error occurred while moving the task',
        variant: 'destructive',
      })
    },
    onSuccess: (movedTask) => {
      // Update caches with the final state
      queryClient.setQueryData(['kanban', 'task', movedTask.id], movedTask)

      queryClient.setQueriesData(
        { queryKey: ['kanban', 'tasks'] },
        (oldTasks: KanbanTask[] = []) =>
          oldTasks.map(task => task.id === movedTask.id ? movedTask : task)
      )
    },
    onSettled: (data, error, variables) => {
      // Refetch all affected queries
      queryClient.invalidateQueries({ queryKey: ['kanban', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban', 'task', variables.taskId] })
    },
  })
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      return deleteTask(taskId)
    },
    onMutate: async ({ taskId }) => {
      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['kanban', 'tasks'] }),
        queryClient.cancelQueries({ queryKey: ['kanban', 'task', taskId] }),
      ])

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<KanbanTask>(['kanban', 'task', taskId])

      // Optimistically remove the task from all caches
      queryClient.setQueriesData(
        { queryKey: ['kanban', 'tasks'] },
        (oldTasks: KanbanTask[] = []) => oldTasks.filter(task => task.id !== taskId)
      )

      queryClient.removeQueries({ queryKey: ['kanban', 'task', taskId] })

      return { previousTask }
    },
    onError: (error, variables, context) => {
      // Restore the task on error
      if (context?.previousTask) {
        queryClient.setQueriesData(
          { queryKey: ['kanban', 'tasks'] },
          (oldTasks: KanbanTask[] = []) => [...oldTasks, context.previousTask!]
        )

        queryClient.setQueryData(['kanban', 'task', variables.taskId], context.previousTask)
      }

      toast({
        title: 'Failed to delete task',
        description: error.message || 'An error occurred while deleting the task',
        variant: 'destructive',
      })
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Task deleted',
        description: 'The task has been deleted successfully',
      })
    },
  })
}

export function useCreateColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boardId, payload }: { boardId: string; payload: CreateColumnRequest }) => {
      return createColumn(boardId, payload)
    },
    onSuccess: (newColumn) => {
      queryClient.setQueryData(['kanban', 'column', newColumn.id], newColumn)
      queryClient.invalidateQueries({ queryKey: ['kanban', 'board'] })

      toast({
        title: 'Column created',
        description: `"${newColumn.name}" has been created successfully`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create column',
        description: error.message || 'An error occurred while creating the column',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

// Helper function to determine task status from column type
// In a real implementation, this would query the column data
function getColumnStatus(columnId: string): KanbanTask['status'] {
  // This is a simplified version - in practice you'd query the column
  // to determine its type and map to the appropriate status
  if (columnId.includes('todo')) return 'todo'
  if (columnId.includes('progress')) return 'in-progress'
  if (columnId.includes('review')) return 'review'
  if (columnId.includes('done')) return 'done'
  return 'todo'
}

// Helper function to invalidate kanban-related queries
export function invalidateKanbanQueries(queryClient: ReturnType<typeof useQueryClient>, orgId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [namespace] = Array.isArray(query.queryKey) ? query.queryKey : []
      return namespace === 'kanban'
    },
  })
}