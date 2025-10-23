/**
 * Enhanced WebSocket Hook for Kanban Board Real-time Updates
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Enhanced real-time WebSocket integration for kanban board
 * using Socket.IO with automatic reconnection, conflict resolution,
 * optimistic updates, and comprehensive presence tracking.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import * as React from 'react'
import { useScope } from '@/contexts/scope-context'
import { useCurrentUser } from '@/hooks/use-auth'
import { useKanbanStore } from '@/state/kanban.store'
import { useSocketClient } from '@/lib/socket-client'
import { toast } from '@/hooks/use-toast'
import type {
  KanbanBoardEvent,
  TaskMovedEvent,
  TaskUpdatedEvent,
  UserPresenceEvent,
  KanbanTask,
} from '@/types/kanban'

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  // This should integrate with your auth system
  // For now, return a placeholder that you should replace
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    if (token) return token
  }

  // If no token found, you might want to redirect to login
  // or throw an error
  throw new Error('No authentication token available')
}

interface UseKanbanWebSocketOptions {
  boardId?: string
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  onEvent?: (event: KanbanBoardEvent) => void
  autoConnect?: boolean
  enablePresence?: boolean
  enableCursorTracking?: boolean
}

interface ConnectionState {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  error?: Error
  lastConnected?: Date
  reconnectAttempts: number
}

interface ConflictResolution {
  resolve: (localData: any, remoteData: any) => any
  strategy: 'local-wins' | 'remote-wins' | 'merge' | 'prompt'
}

export function useKanbanWebSocket({
  boardId,
  onConnected,
  onDisconnected,
  onError,
  onEvent,
  autoConnect = true,
  enablePresence = true,
  enableCursorTracking = true,
}: UseKanbanWebSocketOptions = {}) {
  const { currentOrgId, currentDivisionId } = useScope()
  const { user: currentUser } = useCurrentUser()
  const {
    updateTask,
    moveTask,
    updatePresence,
    removePresence,
    setDraggedTask,
    setActiveBoard,
    addTaskOptimisticUpdate,
    removeTaskOptimisticUpdate,
  } = useKanbanStore()

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
  })

  const [pendingOperations, setPendingOperations] = useState<Map<string, any>>(new Map())
  const [conflictQueue, setConflictQueue] = useState<Array<{
    id: string
    local: any
    remote: any
    resolve: () => void
  }>>([])

  const pendingOperationsRef = useRef(pendingOperations)
  const conflictQueueRef = useRef(conflictQueue)

  // Update refs when state changes
  pendingOperationsRef.current = pendingOperations
  conflictQueueRef.current = conflictQueue

  // Use Socket.IO client
  const {
    client,
    status,
    connect: socketConnect,
    disconnect: socketDisconnect,
    joinBoard,
    leaveBoard,
    on: socketOn,
    emit: socketEmit,
  } = useSocketClient({
    autoConnect,
    onConnected: () => {
      console.log('[Kanban WebSocket] Connected via Socket.IO')
      onConnected?.()
    },
    onDisconnected: () => {
      console.log('[Kanban WebSocket] Disconnected from Socket.IO')
      onDisconnected?.()
    },
    onError: (error) => {
      console.error('[Kanban WebSocket] Socket.IO error:', error)
      onError?.(error)
    },
  })

  // Update connection state when socket status changes
  useEffect(() => {
    setConnectionState({
      connected: status.connected,
      connecting: status.connecting,
      reconnecting: status.reconnecting,
      error: status.error,
      lastConnected: status.lastConnected,
      reconnectAttempts: status.reconnectAttempts,
    })
  }, [status])

  // Enhanced connection management
  const connect = useCallback(async () => {
    if (!currentOrgId || !boardId) {
      console.warn('[Kanban WebSocket] Missing required parameters for connection')
      return
    }

    try {
      // Connect to Socket.IO server
      if (!currentOrgId || !currentDivisionId) {
        throw new Error('Organization and division IDs are required for connection')
      }

      await socketConnect({
        orgId: currentOrgId,
        divisionId: currentDivisionId,
        token: await getAuthToken(), // Implement this function
      })

      // Join board room
      if (status.connected) {
        await joinBoard(boardId, currentOrgId, currentDivisionId)
        setActiveBoard(boardId)
      }
    } catch (error) {
      console.error('[Kanban WebSocket] Connection failed:', error)
      onError?.(error as Error)
    }
  }, [boardId, currentOrgId, currentDivisionId, socketConnect, joinBoard, setActiveBoard, status.connected, onError])

  const disconnect = useCallback(() => {
    if (boardId && currentOrgId && currentDivisionId) {
      leaveBoard(boardId, currentOrgId, currentDivisionId)
    }
    socketDisconnect()
    setActiveBoard(undefined)
  }, [boardId, currentOrgId, currentDivisionId, leaveBoard, socketDisconnect, setActiveBoard])

  // Enhanced event sending with optimistic updates
  const sendEvent = useCallback((type: string, data: any, options?: {
    optimistic?: boolean
    conflictResolution?: ConflictResolution
  }) => {
    const operationId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`

    if (options?.optimistic) {
      // Store pending operation for conflict resolution
      setPendingOperations(prev => new Map(prev).set(operationId, { type, data, timestamp: Date.now() }))

      // Apply optimistic update to local state
      applyOptimisticUpdate(type, data)
    }

    // Send event to server
    socketEmit(type, { ...data, operationId, userId: currentUser?.id })

    return operationId
  }, [socketEmit, currentUser?.id])

  // Apply optimistic updates to local state
  const applyOptimisticUpdate = useCallback((type: string, data: any) => {
    switch (type) {
      case 'task:move':
        addTaskOptimisticUpdate({
          id: data.taskId,
          type: 'move',
          data: { columnId: data.targetColumnId, position: data.targetPosition },
          timestamp: new Date().toISOString(),
        })
        break

      case 'task:update':
        addTaskOptimisticUpdate({
          id: data.taskId,
          type: 'update',
          data: data.changes,
          timestamp: new Date().toISOString(),
        })
        break

      case 'task:create':
        addTaskOptimisticUpdate({
          id: `temp-${Date.now()}`,
          type: 'create',
          data,
          timestamp: new Date().toISOString(),
        })
        break

      case 'task:delete':
        addTaskOptimisticUpdate({
          id: data.taskId,
          type: 'delete',
          data: {},
          timestamp: new Date().toISOString(),
        })
        break
    }
  }, [addTaskOptimisticUpdate])

  // Conflict resolution
  const resolveConflict = useCallback((
    operationId: string,
    localData: any,
    remoteData: any,
    resolution: ConflictResolution
  ) => {
    const resolvedData = resolution.resolve(localData, remoteData)

    switch (resolution.strategy) {
      case 'local-wins':
        // Re-apply local changes
        console.log('[Kanban WebSocket] Resolving conflict: local wins')
        break

      case 'remote-wins':
        // Accept remote changes and remove optimistic update
        console.log('[Kanban WebSocket] Resolving conflict: remote wins')
        removeTaskOptimisticUpdate(operationId)
        break

      case 'merge':
        // Attempt to merge changes
        console.log('[Kanban WebSocket] Resolving conflict: merging')
        // Implement merge logic based on data type
        break

      case 'prompt':
        // Add to conflict queue for user resolution
        setConflictQueue(prev => [...prev, {
          id: operationId,
          local: localData,
          remote: remoteData,
          resolve: () => removeTaskOptimisticUpdate(operationId),
        }])
        break
    }

    // Remove from pending operations
    setPendingOperations(prev => {
      const newMap = new Map(prev)
      newMap.delete(operationId)
      return newMap
    })
  }, [removeTaskOptimisticUpdate])

  // Enhanced event handlers
  const handleTaskMoved = useCallback((event: TaskMovedEvent) => {
    // Don't process our own events if we have a pending operation
    const pendingOp = Array.from(pendingOperationsRef.current.values())
      .find(op => op.type === 'task:move' && op.data.taskId === event.taskId)

    if (pendingOp) {
      // Conflict detected - resolve it
      resolveConflict(
        pendingOp.operationId,
        { columnId: pendingOp.data.targetColumnId, position: pendingOp.data.targetPosition },
        { columnId: event.toColumnId, position: event.toPosition },
        { strategy: 'remote-wins', resolve: () => {} }
      )
      return
    }

    // Apply remote update
    moveTask(event.taskId, event.toColumnId, event.toPosition)

    // Show notification for other users' actions
    if (event.userId !== currentUser?.id) {
      toast({
        title: 'Task Moved',
        description: `A task was moved to another column`,
        duration: 2000,
      })
    }

    onEvent?.({ type: 'task:moved', boardId: boardId!, data: event, userId: event.userId, timestamp: new Date().toISOString() })
  }, [moveTask, currentUser?.id, boardId, onEvent, resolveConflict])

  const handleTaskUpdated = useCallback((event: TaskUpdatedEvent) => {
    // Check for conflicts with pending operations
    const pendingOp = Array.from(pendingOperationsRef.current.values())
      .find(op => op.type === 'task:update' && op.data.taskId === event.taskId)

    if (pendingOp) {
      // Conflict detected - resolve it
      resolveConflict(
        pendingOp.operationId,
        pendingOp.data.changes,
        event.changes,
        { strategy: 'merge', resolve: () => {} }
      )
      return
    }

    // Transform UpdateTaskRequest to KanbanTask format
    const { labels, ...otherChanges } = event.changes
    const taskUpdates: Partial<KanbanTask> = {
      ...otherChanges,
      // Convert string labels to KanbanLabel objects if needed
      ...(labels && {
        labels: labels.map((labelText, index) => ({
          id: `temp-label-${Date.now()}-${index}`,
          name: labelText,
          color: '#6366f1' // Default color
        }))
      })
    }

    // Apply remote update
    updateTask(event.taskId, taskUpdates)

    // Show notification for other users' actions
    if (event.userId !== currentUser?.id) {
      toast({
        title: 'Task Updated',
        description: 'Task details were updated by another user',
        duration: 2000,
      })
    }

    onEvent?.({ type: 'task:updated', boardId: boardId!, data: event, userId: event.userId, timestamp: new Date().toISOString() })
  }, [updateTask, currentUser?.id, boardId, onEvent, resolveConflict])

  const handleTaskCreated = useCallback((data: any) => {
    console.log('[Kanban WebSocket] Task created:', data)

    // Show notification
    toast({
      title: 'New Task',
      description: 'A new task was added to the board',
      duration: 2000,
    })

    onEvent?.({ type: 'task:created', boardId: boardId!, data, userId: data.userId, timestamp: new Date().toISOString() })
  }, [boardId, onEvent])

  const handleTaskDeleted = useCallback((data: any) => {
    console.log('[Kanban WebSocket] Task deleted:', data)

    // Show notification
    toast({
      title: 'Task Deleted',
      description: 'A task was removed from the board',
      duration: 2000,
    })

    onEvent?.({ type: 'task:deleted', boardId: boardId!, data, userId: data.userId, timestamp: new Date().toISOString() })
  }, [boardId, onEvent])

  const handleUserPresence = useCallback((event: UserPresenceEvent) => {
    if (!enablePresence) return

    if (event.status === 'offline') {
      removePresence(event.userId)
    } else {
      updatePresence(event.userId, {
        status: event.status,
        lastSeen: event.lastSeen,
        currentBoardId: event.boardId,
      })
    }

    onEvent?.({ type: 'user:presence', boardId: boardId!, data: event, userId: event.userId, timestamp: new Date().toISOString() })
  }, [enablePresence, updatePresence, removePresence, boardId, onEvent])

  const handleBoardUpdated = useCallback((data: any) => {
    console.log('[Kanban WebSocket] Board updated:', data)
    onEvent?.({ type: 'board:updated', boardId: boardId!, data, userId: data.userId, timestamp: new Date().toISOString() })
  }, [boardId, onEvent])

  // Set up Socket.IO event listeners
  useEffect(() => {
    if (!status.connected) return

    const unsubscribers: (() => void)[] = []

    // Task events
    unsubscribers.push(socketOn('task:moved', handleTaskMoved))
    unsubscribers.push(socketOn('task:updated', handleTaskUpdated))
    unsubscribers.push(socketOn('task:created', handleTaskCreated))
    unsubscribers.push(socketOn('task:deleted', handleTaskDeleted))

    // Presence events
    if (enablePresence) {
      unsubscribers.push(socketOn('user:presence', handleUserPresence))
    }

    // Board events
    unsubscribers.push(socketOn('board:updated', handleBoardUpdated))

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [status.connected, socketOn, handleTaskMoved, handleTaskUpdated, handleTaskCreated, handleTaskDeleted, handleUserPresence, handleBoardUpdated, enablePresence])

  // Auto-connect when dependencies change
  useEffect(() => {
    if (autoConnect && currentOrgId && boardId) {
      connect()
    }

    return () => {
      if (boardId && currentOrgId) {
        disconnect()
      }
    }
  }, [autoConnect, currentOrgId, boardId, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // Connection state
    isConnected: connectionState.connected,
    isConnecting: connectionState.connecting,
    isReconnecting: connectionState.reconnecting,
    connectionError: connectionState.error,
    reconnectAttempts: connectionState.reconnectAttempts,
    lastConnected: connectionState.lastConnected,

    // Connection management
    connect,
    disconnect,

    // Event sending
    sendEvent,
    emit: socketEmit,

    // State
    pendingOperations: Array.from(pendingOperations.entries()),
    conflictQueue,
    resolveConflict: (conflictId: string, resolution: 'local' | 'remote') => {
      const conflict = conflictQueue.find(c => c.id === conflictId)
      if (conflict) {
        if (resolution === 'local') {
          // Re-apply local changes
          console.log('[Kanban WebSocket] User chose local version')
        } else {
          // Accept remote changes
          conflict.resolve()
        }
        setConflictQueue(prev => prev.filter(c => c.id !== conflictId))
      }
    },
  }
}

// Enhanced hook for real-time cursor tracking during drag operations
export function useKanbanCursorTracking(boardId?: string) {
  const { sendEvent, isConnected } = useKanbanWebSocket({
    boardId,
    enableCursorTracking: true
  })
  const { setDraggedTask, updatePresence } = useKanbanStore()
  const { user: currentUser } = useCurrentUser()

  const [isDragging, setIsDragging] = useState(false)
  const [currentDrag, setCurrentDrag] = useState<{
    taskId: string
    startPosition: { x: number; y: number }
    currentPosition: { x: number; y: number }
  } | null>(null)

  // Throttle position updates to avoid spamming the server
  const throttledUpdateRef = useRef<{
    timeout: NodeJS.Timeout | null
    lastPosition: { x: number; y: number } | null
  }>({
    timeout: null,
    lastPosition: null,
  })

  const startDrag = useCallback((taskId: string, startPosition: { x: number; y: number }) => {
    if (!isConnected || !currentUser) return

    setIsDragging(true)
    setDraggedTask(taskId)
    setCurrentDrag({
      taskId,
      startPosition,
      currentPosition: startPosition,
    })

    // Update presence to show dragging status
    updatePresence(currentUser.id, {
      status: 'busy',
      lastSeen: new Date().toISOString(),
    })

    // Send drag start event
    sendEvent('cursor:drag-start', {
      taskId,
      userName: currentUser?.displayName || currentUser?.fullName || 'Anonymous',
      userId: currentUser?.id,
      position: startPosition,
      timestamp: new Date().toISOString(),
    }, { optimistic: false })
  }, [isConnected, currentUser, setDraggedTask, updatePresence, sendEvent])

  const updateDragPosition = useCallback((position: { x: number; y: number }) => {
    if (!isConnected || !isDragging || !currentDrag) return

    setCurrentDrag(prev => prev ? { ...prev, currentPosition: position } : null)

    // Throttle position updates
    if (throttledUpdateRef.current.timeout) {
      clearTimeout(throttledUpdateRef.current.timeout)
    }

    // Only send update if position changed significantly
    const lastPos = throttledUpdateRef.current.lastPosition
    const hasSignificantChange = !lastPos ||
      Math.abs(position.x - lastPos.x) > 5 ||
      Math.abs(position.y - lastPos.y) > 5

    if (hasSignificantChange) {
      throttledUpdateRef.current.timeout = setTimeout(() => {
        sendEvent('cursor:drag-move', {
          taskId: currentDrag.taskId,
          userId: currentUser?.id,
          position,
          timestamp: new Date().toISOString(),
        }, { optimistic: false })

        throttledUpdateRef.current.lastPosition = position
        throttledUpdateRef.current.timeout = null
      }, 50) // 50ms throttle
    }
  }, [isConnected, isDragging, currentDrag, currentUser, sendEvent])

  const endDrag = useCallback((finalPosition?: { x: number; y: number }) => {
    if (!isConnected || !currentDrag || !currentUser) return

    const position = finalPosition || currentDrag.currentPosition

    // Clear any pending throttle
    if (throttledUpdateRef.current.timeout) {
      clearTimeout(throttledUpdateRef.current.timeout)
      throttledUpdateRef.current.timeout = null
    }

    setIsDragging(false)
    setCurrentDrag(null)
    setDraggedTask(undefined)

    // Reset presence status
    updatePresence(currentUser.id, {
      status: 'online',
      lastSeen: new Date().toISOString(),
    })

    // Send drag end event
    sendEvent('cursor:drag-end', {
      taskId: currentDrag.taskId,
      userId: currentUser?.id,
      position,
      timestamp: new Date().toISOString(),
    }, { optimistic: false })

    // Clear throttled position
    throttledUpdateRef.current.lastPosition = null
  }, [isConnected, currentDrag, currentUser, setDraggedTask, updatePresence, sendEvent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttledUpdateRef.current.timeout) {
        clearTimeout(throttledUpdateRef.current.timeout)
      }
      if (isDragging) {
        endDrag()
      }
    }
  }, [isDragging, endDrag])

  return {
    isDragging,
    currentDrag,
    startDrag,
    updateDragPosition,
    endDrag,
  }
}

// Hook for real-time collaboration presence
export function useKanbanPresence(boardId?: string) {
  const { isConnected } = useKanbanWebSocket({
    boardId,
    enablePresence: true
  })
  const { presence } = useKanbanStore()
  const { user: currentUser } = useCurrentUser()

  // Get other users currently on the board
  const otherUsers = React.useMemo(() => {
    return Object.values(presence).filter(p =>
      p.userId !== currentUser?.id &&
      p.boardId === boardId &&
      p.status !== 'offline'
    )
  }, [presence, currentUser?.id, boardId])

  // Get user count by status
  const userCounts = React.useMemo(() => {
    return otherUsers.reduce((counts, user) => {
      counts[user.status] = (counts[user.status] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }, [otherUsers])

  // Check if specific user is online
  const isUserOnline = React.useCallback((userId: string) => {
    const userPresence = presence[userId]
    return userPresence && userPresence.status !== 'offline' &&
           userPresence.boardId === boardId
  }, [presence, boardId])

  return {
    isConnected,
    otherUsers,
    userCounts,
    isUserOnline,
    totalUsers: otherUsers.length,
  }
}