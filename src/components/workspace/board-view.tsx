"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDate } from "@/lib/date-utils"
import { PriorityBadge } from "@/components/ui/priority-badge"
import { WhyNoteEditor } from "@/components/ui/why-note-editor"
import { AssigneeSelector } from "@/components/ui/assignee-selector"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { useScope } from "@/contexts/scope-context"
import { useKanbanStore, useActiveBoard, useActiveBoardColumns, useActiveBoardTasks } from "@/state/kanban.store"
import { useBoardQuery, useCreateTaskMutation, useMoveTaskMutation } from "@/hooks/api/use-task-queries"
import { useKanbanWebSocket, useKanbanCursorTracking } from "@/hooks/use-kanban-websocket"
import { toast } from "@/hooks/use-toast"
import type { KanbanTask, KanbanColumn, KanbanUser } from "@/types/kanban"
import { PresenceIndicators } from "@/components/real-time/presence-indicators"
import { CollaborationCursors } from "@/components/real-time/collaboration-cursors"
import { ConnectionStatusBar } from "@/components/real-time/connection-status-bar"
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Paperclip,
  Edit2,
  X,
  Check,
  Filter,
  Loader2,
  Wifi,
  WifiOff,
  Users,
  AlertCircle
} from "lucide-react"

// Board component props
interface BoardViewProps {
  boardId?: string
}

function TaskCard({ task, onEdit, onDelete, onViewProject }: {
  task: KanbanTask
  onEdit: (task: KanbanTask) => void
  onDelete: (taskId: string) => void
  onViewProject?: (task: KanbanTask) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(task.title)
  const [expanded, setExpanded] = React.useState(false)
  const { updateTask, users, presence, ui } = useKanbanStore()
  const { currentUser } = useScope()

  // Check if other users are viewing this task
  const viewingUsers = React.useMemo(() => {
    return Object.values(presence).filter(p =>
      p.currentTaskId === task.id &&
      p.userId !== currentUser?.id
    )
  }, [presence, task.id, currentUser?.id])

  // Check if task is being edited by someone else
  const isBeingEdited = React.useMemo(() => {
    return ui.draggedTaskId === task.id &&
           Object.values(presence).some(p => p.userId !== currentUser?.id)
  }, [ui.draggedTaskId, presence, currentUser?.id])

  const handleSave = () => {
    updateTask(task.id, { title: editTitle })
    setIsEditing(false)
    onEdit({ ...task, title: editTitle })
  }

  const handleCancel = () => {
    setEditTitle(task.title)
    setIsEditing(false)
  }

  return (
    <Card className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-border rounded"
                  autoFocus
                />
                <Button size="sm" className="h-6 px-2" onClick={handleSave}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleCancel}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <h3 
                className="font-medium text-sm truncate flex-1"
                onDoubleClick={() => setIsEditing(true)}
              >
                {task.title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onViewProject && task.projectId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onViewProject(task)}
              >
                View project
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <PriorityBadge priority={task.priority} />
          {task.labels?.map((label) => (
            <Badge key={label.id} variant="outline" className="text-xs" style={{ backgroundColor: label.color + '20', borderColor: label.color }}>
              {label.name}
            </Badge>
          ))}
        </div>

        {/* Task Details */}
        <div className="space-y-2">
          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-3 w-3 text-muted-foreground" />
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={task.assignee?.avatar} alt={task.assignee?.name} />
                  <AvatarFallback className="text-[8px]">
                    {task.assignee?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{task.assignee?.name}</span>
              </div>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">
                {formatDate(new Date(task.dueDate))}
              </span>
            </div>
          )}

          {/* Comments and Attachments */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(task.commentsCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{task.commentsCount}</span>
              </div>
            )}
            {(task.attachmentsCount ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachmentsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Why Note */}
        {task.whyNote && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              Why? {expanded ? '▼' : '▶'}
            </Button>
            {expanded && (
              <div className="mt-2 p-2 bg-surface-elevated rounded text-xs">
                {task.whyNote}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Column({ column, onTaskEdit, onTaskDelete, onTaskViewProject }: {
  column: KanbanColumn
  onTaskEdit: (task: KanbanTask) => void
  onTaskDelete: (taskId: string) => void
  onTaskViewProject?: (task: KanbanTask) => void
}) {
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")
  const { getTasksByColumn } = useKanbanStore()
  const createTaskMutation = useCreateTaskMutation()

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      createTaskMutation.mutate({
        columnId: column.id,
        payload: {
          title: newTaskTitle.trim(),
          priority: 'medium',
          position: getTasksByColumn(column.id).length,
        }
      })
      setNewTaskTitle("")
      setIsAddingTask(false)
    }
  }

  const columnTasks = getTasksByColumn(column.id)

  return (
    <div className="flex-1 min-w-80">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <CardTitle className="text-sm font-medium">
                {column.name}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {isAddingTask && (
              <Card className="border-2 border-dashed border-brand">
                <CardContent className="p-3">
                  <input
                    type="text"
                    placeholder="Enter task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask()
                      if (e.key === 'Escape') setIsAddingTask(false)
                    }}
                    className="w-full px-2 py-1 text-sm border-none outline-none bg-transparent"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" className="h-6 px-2" onClick={handleAddTask}>
                      Add
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2"
                      onClick={() => setIsAddingTask(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
  
            <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                  onViewProject={onTaskViewProject}
                />
              ))}
            </SortableContext>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function BoardView({ boardId }: BoardViewProps) {
  const router = useRouter()
  const { currentOrgId, currentDivisionId, currentUser } = useScope()
  const canOpenProject = isFeatureEnabled("projects.detail", process.env.NODE_ENV !== "production")

  // Ref for collaboration cursors container
  const boardContainerRef = React.useRef<HTMLDivElement>(null)

  // Store hooks
  const activeBoard = useActiveBoard()
  const activeColumns = useActiveBoardColumns()
  const {
    setActiveBoard,
    moveTask: moveTaskInStore,
    setConnectionStatus,
    addSyncEvent,
    addActivityEvent
  } = useKanbanStore()

  // Real-time hooks
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    connectionError,
    sendEvent,
    conflictQueue,
    resolveConflict,
  } = useKanbanWebSocket({
    boardId: activeBoard?.id || boardId,
    onConnected: () => {
      setConnectionStatus('online')
      toast({
        title: "Connected",
        description: "Real-time collaboration is now active",
        duration: 2000,
      })
    },
    onDisconnected: () => {
      setConnectionStatus('offline')
    },
    onError: (error) => {
      console.error('WebSocket connection error:', error)
      toast({
        title: "Connection Error",
        description: "Real-time features may be unavailable",
        variant: "destructive",
        duration: 3000,
      })
    },
    onEvent: (event) => {
      addSyncEvent(event)
      addActivityEvent({
        type: event.type,
        userId: event.userId,
        data: event.data,
        timestamp: event.timestamp,
      })
    },
  })

  const cursorTracking = useKanbanCursorTracking(activeBoard?.id || boardId)

  // API hooks
  const boardQuery = useBoardQuery(boardId || '')
  const moveTaskMutation = useMoveTaskMutation()

  // Initialize board when data is loaded
  React.useEffect(() => {
    if (boardQuery.data && !boardQuery.isLoading) {
      const { board, columns, tasks, labels, permissions } = boardQuery.data
      setActiveBoard(board.id)

      // Initialize store with board data
      const store = useKanbanStore.getState()
      store.initializeBoard({
        board,
        columns,
        tasks,
        labels,
        permissions,
      })
    }
  }, [boardQuery.data, boardQuery.isLoading, setActiveBoard])

  const workspaceBasePath = React.useMemo(() => {
    if (!currentOrgId || !currentDivisionId) {
      return null
    }
    return `/${currentOrgId}/${currentDivisionId}`
  }, [currentDivisionId, currentOrgId])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const onTaskViewProject = React.useCallback(
    (task: KanbanTask) => {
      if (!task.projectId || !workspaceBasePath || !canOpenProject) {
        return
      }
      router.push(`${workspaceBasePath}/projects/${task.projectId}`)
    },
    [canOpenProject, router, workspaceBasePath]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id as string

    // Set dragged task in store for UI feedback
    const store = useKanbanStore.getState()
    store.setDraggedTask(taskId)

    // Start real-time cursor tracking
    if (isConnected && currentUser) {
      const task = store.tasks[taskId]
      if (task) {
        cursorTracking.startDrag(taskId, {
          x: 0,
          y: 0,
        })

        // Send drag start event
        sendEvent('cursor:drag-start', {
          taskId,
          taskTitle: task.title,
          userId: currentUser.id,
          position: { x: 0, y: 0 },
        })
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event
    if (over) {
      // Set hovered column for UI feedback
      const store = useKanbanStore.getState()
      store.setHoveredColumn(over.id as string)

      // Update cursor position during drag
      if (isConnected && currentUser && active) {
        const position = { x: 0, y: 0 } // Would need actual mouse position
        cursorTracking.updateDragPosition(position.x, position.y)

        sendEvent('cursor:drag-move', {
          taskId: active.id as string,
          userId: currentUser.id,
          position,
        })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const taskId = active.id as string

    // End cursor tracking
    cursorTracking.endDrag({ x: 0, y: 0 })

    // Clear drag state
    const store = useKanbanStore.getState()
    store.setDraggedTask(undefined)
    store.setHoveredColumn(undefined)

    // Send drag end event
    if (isConnected && currentUser) {
      sendEvent('cursor:drag-end', {
        taskId,
        userId: currentUser.id,
        position: { x: 0, y: 0 },
      })
    }

    if (!over) return

    const targetColumnId = over.id as string

    // Find the target column
    const targetColumn = activeColumns.find(col => col.id === targetColumnId)
    if (!targetColumn) return

    // Get current tasks in target column to determine position
    const { getTasksByColumn } = useKanbanStore.getState()
    const targetColumnTasks = getTasksByColumn(targetColumnId)
    const targetPosition = targetColumnTasks.length

    // Send real-time task move event with optimistic update
    if (isConnected && currentUser) {
      sendEvent('task:move', {
        taskId,
        targetColumnId,
        targetPosition,
        fromColumnId: store.tasks[taskId]?.columnId,
        userId: currentUser.id,
      }, { optimistic: true })
    }

    // Optimistically update the store
    moveTaskInStore(taskId, targetColumnId, targetPosition)

    // Call API to move the task
    moveTaskMutation.mutate({
      taskId,
      payload: {
        targetColumnId,
        targetPosition,
      },
    })
  }

  const handleTaskEdit = (updatedTask: KanbanTask) => {
    const store = useKanbanStore.getState()
    const changes = {
      title: updatedTask.title,
      description: updatedTask.description,
      priority: updatedTask.priority,
      dueDate: updatedTask.dueDate,
      whyNote: updatedTask.whyNote,
    }

    // Send real-time update event with optimistic update
    if (isConnected && currentUser) {
      sendEvent('task:update', {
        taskId: updatedTask.id,
        changes,
        userId: currentUser.id,
      }, { optimistic: true })
    }

    store.updateTask(updatedTask.id, changes)
  }

  const handleTaskDelete = (taskId: string) => {
    const store = useKanbanStore.getState()
    store.removeTask(taskId)
  }

  // Loading state
  if (boardQuery.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (boardQuery.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">Failed to load board</h3>
          <p className="text-muted-foreground mb-4">
            {boardQuery.error.message || 'An error occurred while loading the board'}
          </p>
          <Button onClick={() => boardQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  // No board selected
  if (!activeBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">No board selected</h3>
          <p className="text-muted-foreground">
            Select a board to start managing your tasks
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Connection Status Bar */}
      <ConnectionStatusBar
        status={{
          connected: isConnected,
          connecting: isConnecting,
          reconnecting: isReconnecting,
          error: connectionError,
          lastConnected: new Date(), // Would track actual last connected time
          reconnectAttempts: 0, // Would track actual attempts
          maxReconnectAttempts: 5,
          latency: undefined, // Would measure actual latency
        }}
        onReconnect={() => {
          // Trigger reconnection logic
          window.location.reload()
        }}
        onDismissError={() => {
          // Clear error state
        }}
        showDetails={true}
        position="top"
      />

      <div className="h-full p-6 pt-20">
        <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold">{activeBoard.name}</h2>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnecting ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Connecting...</span>
                </div>
              ) : isReconnecting ? (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs">Reconnecting...</span>
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-3 w-3" />
                  <span className="text-xs">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-3 w-3" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>

          {activeBoard.description && (
            <p className="text-muted-foreground mb-1">{activeBoard.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Drag and drop tasks to update their status</span>
            {isConnected && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Real-time collaboration active
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Presence Indicators */}
          {activeBoard.id && (
            <PresenceIndicators
              boardId={activeBoard.id}
              showDetails={true}
              maxVisible={3}
            />
          )}

          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Conflict Resolution Queue */}
      {conflictQueue.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">
              Conflict Detected
            </h4>
          </div>
          <p className="text-xs text-yellow-700 mb-2">
            Another user made changes to the same task. Which version would you like to keep?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolveConflict(conflictQueue[0].id, 'local')}
            >
              Keep My Changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolveConflict(conflictQueue[0].id, 'remote')}
            >
              Use Their Changes
            </Button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={boardContainerRef}
          className="relative flex gap-6 h-full overflow-x-auto pb-4"
        >
          {activeColumns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskViewProject={onTaskViewProject}
            />
          ))}

          {/* Collaboration Cursors Overlay */}
          {isConnected && (
            <CollaborationCursors
              containerRef={boardContainerRef}
              showUsernames={true}
            />
          )}
        </div>
      </DndContext>
    </div>
    </>
  )
}
