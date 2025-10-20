import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { PriorityBadge } from "./priority-badge"
import { StatusBadge } from "./status-badge"
import { formatDate } from '@/lib/date-utils'
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { useUpdateTaskMutation } from "@/hooks/api/use-task-queries"
import { toast } from "@/hooks/use-toast"
import { useSelectedTask } from "@/state/kanban.store"
import type { KanbanTask, KanbanUser, TaskPriority } from "@/types/kanban"
import type { UserPresence, CollaborationState } from "@/lib/collaboration-utils"
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  Tag,
  MessageSquare,
  Paperclip,
  Edit2,
  Save,
  X
} from "lucide-react"

interface TaskProperty {
  key: string
  label: string
  value: any
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'avatar' | 'badge' | 'status' | 'priority'
  options?: string[]
  editable?: boolean
  icon?: React.ReactNode
}

interface TaskPropertiesGridProps extends React.HTMLAttributes<HTMLDivElement> {
  taskId?: string
  task?: KanbanTask
  properties?: TaskProperty[]
  onPropertyChange?: (key: string, value: any) => void
  editable?: boolean
  columns?: number
  compact?: boolean
  collaborationState?: CollaborationState
  currentUser?: KanbanUser
  onUserStartEdit?: (propertyKey: string, userId: string) => void
  onUserEndEdit?: (propertyKey: string, userId: string) => void
  showRealTimeIndicators?: boolean
}

function TaskPropertiesGrid({
  taskId: taskIdProp,
  task: taskProp,
  properties: propertiesProp,
  onPropertyChange,
  editable = false,
  columns = 2,
  compact = false,
  collaborationState,
  currentUser,
  onUserStartEdit,
  onUserEndEdit,
  showRealTimeIndicators = true,
  className,
  ...props
}: TaskPropertiesGridProps) {
  // Get task from props or from store
  const selectedTask = useSelectedTask()
  const task = taskProp || selectedTask
  const taskId = taskIdProp || task?.id

  const updateTaskMutation = useUpdateTaskMutation()
  const [editingProperty, setEditingProperty] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState<Record<string, any>>({})

  // Real-time collaboration state
  const [activeEditors, setActiveEditors] = React.useState<Record<string, string>>({})

  // Check who is currently editing each property
  const getPropertyEditors = React.useCallback((propertyKey: string) => {
    if (!collaborationState || !currentUser) return []

    return Object.entries(collaborationState.users)
      .filter(([userId, presence]) => {
        // Check if user is currently editing this property
        return presence.currentTaskId === taskId &&
               activeEditors[propertyKey] === userId &&
               userId !== currentUser.id
      })
      .map(([userId, presence]) => ({
        userId,
        userName: collaborationState.users[userId]?.userName || `User ${userId}`,
        userAvatar: collaborationState.users[userId]?.userAvatar,
        status: presence.status
      }))
  }, [collaborationState, currentUser, taskId, activeEditors])

  // Check if a property is being edited by someone else
  const isPropertyBeingEdited = React.useCallback((propertyKey: string) => {
    return getPropertyEditors(propertyKey).length > 0
  }, [getPropertyEditors])

  // Get users viewing this task
  const getViewingUsers = React.useCallback(() => {
    if (!collaborationState || !currentUser) return []

    return Object.values(collaborationState.users)
      .filter(presence =>
        presence.currentTaskId === taskId &&
        presence.userId !== currentUser.id
      )
  }, [collaborationState, currentUser, taskId])

  // Generate properties from task if not provided
  const properties = React.useMemo(() => {
    if (propertiesProp) return propertiesProp

    if (!task) return []

    return [
      {
        key: 'title',
        label: 'Title',
        value: task.title,
        type: 'text' as const,
        editable: true,
        icon: <Edit2 className="h-4 w-4" />,
      },
      {
        key: 'description',
        label: 'Description',
        value: task.description,
        type: 'textarea' as const,
        editable: true,
        icon: <Edit2 className="h-4 w-4" />,
      },
      {
        key: 'priority',
        label: 'Priority',
        value: task.priority,
        type: 'priority' as const,
        editable: true,
        options: ['low', 'medium', 'high', 'urgent'],
        icon: <Clock className="h-4 w-4" />,
      },
      {
        key: 'status',
        label: 'Status',
        value: task.status,
        type: 'status' as const,
        editable: false, // Status changes happen via drag and drop
        icon: <Clock className="h-4 w-4" />,
      },
      {
        key: 'assignedTo',
        label: 'Assigned To',
        value: task.assignee,
        type: 'avatar' as const,
        editable: true,
        icon: <User className="h-4 w-4" />,
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        value: task.dueDate,
        type: 'date' as const,
        editable: true,
        icon: <CalendarIcon className="h-4 w-4" />,
      },
      {
        key: 'labels',
        label: 'Labels',
        value: task.labels,
        type: 'badge' as const,
        editable: true,
        icon: <Tag className="h-4 w-4" />,
      },
      {
        key: 'whyNote',
        label: 'Why Note',
        value: task.whyNote,
        type: 'textarea' as const,
        editable: true,
        icon: <Edit2 className="h-4 w-4" />,
      },
    ]
  }, [task, propertiesProp])

  const startEditing = (key: string, currentValue: any) => {
    // Check if someone else is already editing
    if (isPropertyBeingEdited(key)) {
      toast({
        title: "Property being edited",
        description: `${getPropertyEditors(key)[0].userName} is currently editing this property.`,
        variant: "destructive"
      })
      return
    }

    setEditingProperty(key)
    setEditValues({ ...editValues, [key]: currentValue })

    // Track that current user is editing this property
    if (currentUser) {
      setActiveEditors(prev => ({ ...prev, [key]: currentUser.id }))
      onUserStartEdit?.(key, currentUser.id)
    }
  }

  const saveEdit = async (key: string) => {
    const newValue = editValues[key]

    // Call local callback if provided
    onPropertyChange?.(key, newValue)

    // Update task via API if we have a task ID
    if (taskId && task) {
      try {
        const updateData: Record<string, any> = { [key]: newValue }

        // Handle special cases
        if (key === 'dueDate' && newValue) {
          updateData[key] = new Date(newValue).toISOString()
        }

        if (key === 'assignedTo') {
          updateData[key] = newValue?.id || null
        }

        await updateTaskMutation.mutateAsync({
          taskId,
          payload: updateData,
        })

        toast({
          title: 'Task updated',
          description: `${key} has been updated successfully`,
        })
      } catch (error) {
        toast({
          title: 'Failed to update task',
          description: error.message || 'An error occurred while updating the task',
          variant: 'destructive',
        })
      }
    }

    // Clear editing state
    setEditingProperty(null)

    // Remove from active editors
    if (currentUser) {
      setActiveEditors(prev => {
        const newEditors = { ...prev }
        delete newEditors[key]
        return newEditors
      })
      onUserEndEdit?.(key, currentUser.id)
    }
  }

  const cancelEdit = (key: string) => {
    setEditingProperty(null)
    const newEditValues = { ...editValues }
    delete newEditValues[key]
    setEditValues(newEditValues)

    // Remove from active editors
    if (currentUser) {
      setActiveEditors(prev => {
        const newEditors = { ...prev }
        delete newEditors[key]
        return newEditors
      })
      onUserEndEdit?.(key, currentUser.id)
    }
  }

  const renderPropertyValue = (property: TaskProperty) => {
    const isEditing = editingProperty === property.key
    const currentValue = property.value

    if (isEditing && editable) {
      switch (property.type) {
        case 'text':
          return (
            <Input
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
        
        case 'textarea':
          return (
            <Textarea
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="min-h-20 resize-none"
              autoFocus
            />
          )
        
        case 'select':
          return (
            <Select
              value={editValues[property.key] || ''}
              onValueChange={(value) => setEditValues({ ...editValues, [property.key]: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {property.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )

        case 'priority':
          return (
            <Select
              value={editValues[property.key] || ''}
              onValueChange={(value: TaskPriority) => setEditValues({ ...editValues, [property.key]: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          )
        
        case 'date':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editValues[property.key] ? formatDate(editValues[property.key]) : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={editValues[property.key] ? new Date(editValues[property.key]) : undefined}
                  onSelect={(date) => setEditValues({ ...editValues, [property.key]: date?.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )
        
        case 'number':
          return (
            <Input
              type="number"
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
        
        default:
          return (
            <Input
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
      }
    }

    // Display mode
    switch (property.type) {
      case 'status':
        return currentValue ? <StatusBadge status={currentValue} /> : <span className="text-muted-foreground">Not set</span>
      
      case 'priority':
        return currentValue ? <PriorityBadge priority={currentValue} /> : <span className="text-muted-foreground">Not set</span>
      
      case 'avatar':
        if (!currentValue) return <span className="text-muted-foreground">Not assigned</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentValue.avatar} alt={currentValue.name} />
              <AvatarFallback className="text-xs">
                {currentValue.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{currentValue.name}</span>
          </div>
        )
      
      case 'badge':
        if (!currentValue || !Array.isArray(currentValue)) return <span className="text-muted-foreground">None</span>
        return (
          <div className="flex flex-wrap gap-1">
            {currentValue.map((badge: string) => (
              <Badge key={badge} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        )
      
      case 'date':
        if (!currentValue) return <span className="text-muted-foreground">No date set</span>
        return <span>{formatDate(currentValue)}</span>
      
      case 'textarea':
        return currentValue ? (
          <p className="text-sm line-clamp-3">{currentValue}</p>
        ) : (
          <span className="text-muted-foreground">No description</span>
        )
      
      default:
        return currentValue ? (
          <span className="text-sm">{String(currentValue)}</span>
        ) : (
          <span className="text-muted-foreground">Not set</span>
        )
    }
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  // Loading state
  if (updateTaskMutation.isPending) {
    return (
      <Card className={cn("", className)} {...props}>
        <CardHeader className={cn(compact && "pb-3")}>
          <CardTitle className={cn("text-lg", compact && "text-base")}>
            Updating...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!task) {
    return (
      <Card className={cn("", className)} {...props}>
        <CardHeader className={cn(compact && "pb-3")}>
          <CardTitle className={cn("text-lg", compact && "text-base")}>
            Task Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Select a task to view and edit its properties
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)} {...props}>
      <CardHeader className={cn(compact && "pb-3")}>
        <CardTitle className={cn("text-lg", compact && "text-base")}>
          {task ? `Task: ${task.title}` : 'Task Properties'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-4", gridCols[columns as keyof typeof gridCols])}>
          {properties.map((property) => {
            const editors = getPropertyEditors(property.key)
            const isBeingEdited = editors.length > 0
            const isCurrentlyEditing = editingProperty === property.key

            return (
            <div key={property.key} className={`space-y-2 ${isBeingEdited ? 'ring-2 ring-yellow-200 rounded-lg p-2' : ''}`}>
              <div className="flex items-center gap-2">
                {property.icon}
                <label className="text-sm font-medium text-muted-foreground">
                  {property.label}
                </label>

                {/* Real-time editing indicators */}
                {showRealTimeIndicators && isBeingEdited && (
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="flex -space-x-1">
                      {editors.slice(0, 2).map(editor => (
                        <div key={editor.userId} className="relative">
                          <Avatar className="h-4 w-4 border border-background">
                            <AvatarImage src={editor.userAvatar} alt={editor.userName} />
                            <AvatarFallback className="text-[6px]">
                              {editor.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0 -right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-yellow-600">
                      {editors[0].userName} editing...
                    </span>
                  </div>
                )}

                {editable && property.editable !== false && (
                  <div className="ml-auto">
                    {editingProperty === property.key ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => saveEdit(property.key)}
                          disabled={updateTaskMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cancelEdit(property.key)}
                          disabled={updateTaskMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEditing(property.key, property.value)}
                        disabled={updateTaskMutation.isPending}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="min-h-8">
                {renderPropertyValue(property)}
              </div>
            </div>
            )
          })}
        </div>

        {/* Real-time presence indicator */}
        {showRealTimeIndicators && getViewingUsers().length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Currently viewing:</span>
              <div className="flex -space-x-2">
                {getViewingUsers().slice(0, 4).map(user => (
                  <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={user.userAvatar} alt={user.userName} />
                    <AvatarFallback className="text-[8px]">
                      {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {getViewingUsers().length > 4 && (
                  <div className="w-6 h-6 bg-muted border-2 border-background rounded-full flex items-center justify-center text-[8px]">
                    +{getViewingUsers().length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { TaskPropertiesGrid, type TaskProperty }