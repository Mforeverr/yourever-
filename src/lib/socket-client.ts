/**
 * Socket.IO Client for Real-time Kanban Collaboration
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Comprehensive Socket.IO client with authentication, automatic
 * reconnection with exponential backoff, connection management, and room-based
 * collaboration for kanban boards.
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { KanbanBoardEvent, TaskMovedEvent, TaskUpdatedEvent, UserPresenceEvent } from '@/types/kanban'

// ============================================================================
// Configuration and Types
// ============================================================================

export interface SocketClientConfig {
  url?: string
  auth?: {
    token?: string
    orgId?: string
    divisionId?: string
  }
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  reconnectionDelayMax?: number
  timeout?: number
  autoConnect?: boolean
}

export interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  error?: Error
  lastConnected?: Date
  reconnectAttempts: number
}

export interface RoomSubscription {
  boardId: string
  orgId: string
  divisionId?: string
  joinedAt: Date
}

// ============================================================================
// Socket.IO Client Implementation
// ============================================================================

export class KanbanSocketClient {
  private socket: Socket | null = null
  private config: Required<SocketClientConfig>
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
  }
  private subscriptions = new Map<string, RoomSubscription>()
  private eventHandlers = new Map<string, Set<Function>>()
  private statusHandlers = new Set<(status: ConnectionStatus) => void>()

  constructor(config: SocketClientConfig = {}) {
    this.config = {
      url: config.url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3005',
      auth: {
        token: config.auth?.token || '',
        orgId: config.auth?.orgId || '',
        divisionId: config.auth?.divisionId,
      },
      reconnection: config.reconnection ?? true,
      reconnectionAttempts: config.reconnectionAttempts ?? 5,
      reconnectionDelay: config.reconnectionDelay ?? 1000,
      reconnectionDelayMax: config.reconnectionDelayMax ?? 5000,
      timeout: config.timeout ?? 20000,
      autoConnect: config.autoConnect ?? true,
    }
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to Socket.IO server with authentication
   */
  async connect(authOverrides?: Partial<SocketClientConfig['auth']>): Promise<void> {
    if (this.socket?.connected) {
      console.log('[SocketClient] Already connected')
      return
    }

    this.updateConnectionStatus({ connecting: true, error: undefined })

    try {
      // Get fresh auth token
      const auth = { ...this.config.auth, ...authOverrides }

      if (!auth.token) {
        throw new Error('Authentication token required')
      }

      if (!auth.orgId) {
        throw new Error('Organization ID required')
      }

      // Create socket connection
      this.socket = io(`${this.config.url}/kanban`, {
        auth,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        autoConnect: false,
      })

      this.setupEventHandlers()

      // Connect after setting up handlers
      this.socket.connect()

      // Wait for connection or timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, this.config.timeout)

        const onConnect = () => {
          clearTimeout(timeout)
          resolve()
        }

        const onError = (error: Error) => {
          clearTimeout(timeout)
          reject(error)
        }

        this.socket!.once('connect', onConnect)
        this.socket!.once('connect_error', onError)
      })

    } catch (error) {
      this.updateConnectionStatus({
        connecting: false,
        connected: false,
        error: error as Error
      })
      throw error
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      // Leave all rooms before disconnecting
      this.subscriptions.forEach((_, roomKey) => {
        this.leaveRoom(roomKey)
      })

      this.socket.disconnect()
      this.socket = null
    }

    this.updateConnectionStatus({
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
    })
  }

  /**
   * Check if connected to server
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Join a kanban board room for real-time updates
   */
  async joinBoard(boardId: string, orgId: string, divisionId?: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Must be connected to join board room')
    }

    const roomKey = `${boardId}:${orgId}${divisionId ? `:${divisionId}` : ''}`

    if (this.subscriptions.has(roomKey)) {
      console.log(`[SocketClient] Already subscribed to room: ${roomKey}`)
      return
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'))
      }, 5000)

      const onJoinSuccess = (data: any) => {
        clearTimeout(timeout)
        console.log(`[SocketClient] Joined room: ${roomKey}`, data)

        this.subscriptions.set(roomKey, {
          boardId,
          orgId,
          divisionId,
          joinedAt: new Date(),
        })

        resolve()
      }

      const onJoinError = (error: any) => {
        clearTimeout(timeout)
        console.error(`[SocketClient] Failed to join room: ${roomKey}`, error)
        reject(new Error(error.message || 'Failed to join room'))
      }

      // Set up temporary listeners
      this.socket!.once(`room:joined:${roomKey}`, onJoinSuccess)
      this.socket!.once(`room:error:${roomKey}`, onJoinError)

      // Join the room
      this.socket!.emit('join-board', {
        boardId,
        orgId,
        divisionId,
        roomKey,
      })
    })
  }

  /**
   * Leave a kanban board room
   */
  leaveBoard(boardId: string, orgId: string, divisionId?: string): void {
    const roomKey = `${boardId}:${orgId}${divisionId ? `:${divisionId}` : ''}`
    this.leaveRoom(roomKey)
  }

  /**
   * Leave room by room key
   */
  private leaveRoom(roomKey: string): void {
    if (!this.socket?.connected || !this.subscriptions.has(roomKey)) {
      return
    }

    const subscription = this.subscriptions.get(roomKey)!

    this.socket.emit('leave-board', {
      boardId: subscription.boardId,
      orgId: subscription.orgId,
      divisionId: subscription.divisionId,
      roomKey,
    })

    this.subscriptions.delete(roomKey)
    console.log(`[SocketClient] Left room: ${roomKey}`)
  }

  /**
   * Get current room subscriptions
   */
  getSubscriptions(): RoomSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Listen to specific real-time events
   */
  on<T = any>(event: string, handler: (data: T) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }

    this.eventHandlers.get(event)!.add(handler)

    // Set up socket listener if not already set
    if (this.socket && !this.socket.hasListeners(event)) {
      this.socket.on(event, (data) => {
        const handlers = this.eventHandlers.get(event)
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(data)
            } catch (error) {
              console.error(`[SocketClient] Error in event handler for ${event}:`, error)
            }
          })
        }
      })
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.eventHandlers.delete(event)
          this.socket?.off(event)
        }
      }
    }
  }

  /**
   * Listen to connection status changes
   */
  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler)

    // Call immediately with current status
    handler(this.getConnectionStatus())

    // Return unsubscribe function
    return () => {
      this.statusHandlers.delete(handler)
    }
  }

  /**
   * Emit events to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('[SocketClient] Cannot emit event - not connected')
      return
    }

    this.socket.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected to server')
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        reconnecting: false,
        reconnectAttempts: 0,
        lastConnected: new Date(),
        error: undefined,
      })

      // Re-join all rooms after reconnection
      this.subscriptions.forEach((subscription, roomKey) => {
        console.log(`[SocketClient] Re-joining room: ${roomKey}`)
        this.joinBoard(subscription.boardId, subscription.orgId, subscription.divisionId)
          .catch(error => {
            console.error(`[SocketClient] Failed to re-join room ${roomKey}:`, error)
          })
      })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected from server:', reason)
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
      })
    })

    this.socket.on('connect_error', (error) => {
      console.error('[SocketClient] Connection error:', error)
      this.updateConnectionStatus({
        connecting: false,
        connected: false,
        error: new Error(error.message),
      })
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[SocketClient] Reconnected after ${attemptNumber} attempts`)
      this.updateConnectionStatus({
        reconnecting: false,
        reconnectAttempts: 0,
        error: undefined,
      })
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[SocketClient] Reconnection attempt ${attemptNumber}`)
      this.updateConnectionStatus({
        reconnecting: true,
        reconnectAttempts: attemptNumber,
      })
    })

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketClient] Failed to reconnect after all attempts')
      this.updateConnectionStatus({
        reconnecting: false,
        error: new Error('Failed to reconnect'),
      })
    })

    // Handle board-specific events
    this.setupBoardEventHandlers()
  }

  /**
   * Set up handlers for kanban board events
   */
  private setupBoardEventHandlers(): void {
    if (!this.socket) return

    // Task events
    this.socket.on('task:moved', (data: TaskMovedEvent) => {
      this.emit('kanban-event', { type: 'task:moved', data })
    })

    this.socket.on('task:updated', (data: TaskUpdatedEvent) => {
      this.emit('kanban-event', { type: 'task:updated', data })
    })

    this.socket.on('task:created', (data: any) => {
      this.emit('kanban-event', { type: 'task:created', data })
    })

    this.socket.on('task:deleted', (data: any) => {
      this.emit('kanban-event', { type: 'task:deleted', data })
    })

    // User presence events
    this.socket.on('user:presence', (data: UserPresenceEvent) => {
      this.emit('kanban-event', { type: 'user:presence', data })
    })

    // Cursor tracking events
    this.socket.on('cursor:drag-start', (data: any) => {
      this.emit('kanban-event', { type: 'cursor:drag-start', data })
    })

    this.socket.on('cursor:drag-move', (data: any) => {
      this.emit('kanban-event', { type: 'cursor:drag-move', data })
    })

    this.socket.on('cursor:drag-end', (data: any) => {
      this.emit('kanban-event', { type: 'cursor:drag-end', data })
    })
  }

  /**
   * Update connection status and notify handlers
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates }

    // Notify all status handlers
    this.statusHandlers.forEach(handler => {
      try {
        handler(this.getConnectionStatus())
      } catch (error) {
        console.error('[SocketClient] Error in status handler:', error)
      }
    })
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.disconnect()
    this.eventHandlers.clear()
    this.statusHandlers.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let socketClientInstance: KanbanSocketClient | null = null

/**
 * Get or create the singleton socket client instance
 */
export function getSocketClient(config?: SocketClientConfig): KanbanSocketClient {
  if (!socketClientInstance) {
    socketClientInstance = new KanbanSocketClient(config)
  }
  return socketClientInstance
}

/**
 * Reset the singleton instance (useful for testing or auth changes)
 */
export function resetSocketClient(): void {
  if (socketClientInstance) {
    socketClientInstance.destroy()
    socketClientInstance = null
  }
}

// ============================================================================
// React Hook Integration
// ============================================================================

export interface UseSocketClientOptions {
  autoConnect?: boolean
  auth?: Partial<SocketClientConfig['auth']>
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

/**
 * React hook for using the socket client
 */
export function useSocketClient(options: UseSocketClientOptions = {}) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
  })

  const client = useMemo(() => getSocketClient(), [])

  useEffect(() => {
    const unsubscribe = client.onStatusChange(setConnectionStatus)
    return unsubscribe
  }, [client])

  useEffect(() => {
    if (options.autoConnect && !connectionStatus.connected && !connectionStatus.connecting) {
      client.connect(options.auth).catch(error => {
        options.onError?.(error)
      })
    }
  }, [options.autoConnect, connectionStatus.connected, connectionStatus.connecting])

  useEffect(() => {
    const unsubscribe = client.onStatusChange((status) => {
      if (status.connected) {
        options.onConnected?.()
      } else if (!status.connecting && !status.reconnecting) {
        options.onDisconnected?.()
      }

      if (status.error) {
        options.onError?.(status.error)
      }
    })

    return unsubscribe
  }, [client, options.onConnected, options.onDisconnected, options.onError])

  return {
    client,
    status: connectionStatus,
    connect: (authOverrides?: Partial<SocketClientConfig['auth']>) =>
      client.connect(authOverrides),
    disconnect: () => client.disconnect(),
    joinBoard: (boardId: string, orgId: string, divisionId?: string) =>
      client.joinBoard(boardId, orgId, divisionId),
    leaveBoard: (boardId: string, orgId: string, divisionId?: string) =>
      client.leaveBoard(boardId, orgId, divisionId),
    on: <T = any>(event: string, handler: (data: T) => void) =>
      client.on(event, handler),
    emit: (event: string, data?: any) =>
      client.emit(event, data),
  }
}