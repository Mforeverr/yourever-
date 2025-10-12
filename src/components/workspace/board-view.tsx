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
import { AssigneeSelector, type User } from "@/components/ui/assignee-selector"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { useScope } from "@/contexts/scope-context"
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
  Filter
} from "lucide-react"

interface Task {
  id: string
  projectId?: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: User
  dueDate?: Date
  startDate?: Date
  whyNote?: string
  tags?: string[]
  comments?: number
  attachments?: number
  createdAt: Date
  updatedAt: Date
}

interface Column {
  id: string
  title: string
  status: Task['status']
  tasks: Task[]
  color: string
}

const mockUsers: User[] = [
  { id: "1", name: "Alex Chen", avatar: "/avatars/alex.jpg", status: "online" },
  { id: "2", name: "Sarah Miller", avatar: "/avatars/sarah.jpg", status: "online" },
  { id: "3", name: "Mike Johnson", avatar: "/avatars/mike.jpg", status: "away" },
  { id: "4", name: "Emma Davis", status: "offline" }
]

const initialTasks: Task[] = [
  {
    id: "1",
    projectId: "website-revamp",
    title: "Setup authentication system",
    description: "Implement OAuth2 with Google and GitHub providers",
    status: "in-progress",
    priority: "high",
    assignee: mockUsers[0],
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    whyNote: "Critical for user onboarding and security compliance",
    tags: ["backend", "security"],
    comments: 5,
    attachments: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
  },
  {
    id: "2", 
    projectId: "platform-infra",
    title: "Design new landing page",
    description: "Create mockups and prototypes for the marketing landing page",
    status: "todo",
    priority: "medium",
    assignee: mockUsers[1],
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    tags: ["design", "marketing"],
    comments: 3,
    attachments: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
  },
  {
    id: "3",
    projectId: "website-revamp",
    title: "Fix navigation bug on mobile",
    description: "Menu doesn't close properly on iOS devices",
    status: "review",
    priority: "urgent",
    assignee: mockUsers[2],
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    whyNote: "Affecting 15% of mobile users, high priority fix needed",
    tags: ["bug", "mobile"],
    comments: 8,
    attachments: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: "4",
    projectId: "platform-infra",
    title: "Database optimization",
    description: "Improve query performance for user dashboard",
    status: "done",
    priority: "low",
    assignee: mockUsers[0],
    tags: ["backend", "performance"],
    comments: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
  }
]

function TaskCard({ task, onEdit, onDelete, onViewProject }: { 
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onViewProject?: (task: Task) => void
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(task.title)
  const [expanded, setExpanded] = React.useState(false)

  const handleSave = () => {
    onEdit({ ...task, title: editTitle })
    setIsEditing(false)
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
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
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
                  <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                  <AvatarFallback className="text-[8px]">
                    {task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{task.assignee.name}</span>
              </div>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">
                {formatDate(task.dueDate)}
              </span>
            </div>
          )}

          {/* Comments and Attachments */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.comments && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments}</span>
              </div>
            )}
            {task.attachments && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments}</span>
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
  column: Column
  onTaskEdit: (task: Task) => void
  onTaskDelete: (taskId: string) => void
  onTaskViewProject?: (task: Task) => void
}) {
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [newTaskTitle, setNewTaskTitle] = React.useState("")

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      // TODO: Add task logic
      console.log("Adding task:", newTaskTitle)
      setNewTaskTitle("")
      setIsAddingTask(false)
    }
  }

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
                {column.title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {column.tasks.length}
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
            
            <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {column.tasks.map((task) => (
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

export function BoardView() {
  const router = useRouter()
  const { currentOrgId, currentDivisionId } = useScope()
  const canOpenProject = isFeatureEnabled("projects.detail", process.env.NODE_ENV !== "production")
  const workspaceBasePath = React.useMemo(() => {
    if (!currentOrgId || !currentDivisionId) {
      return null
    }
    return `/${currentOrgId}/${currentDivisionId}`
  }, [currentDivisionId, currentOrgId])

  const [tasks, setTasks] = React.useState<Task[]>(initialTasks)
  const [columns, setColumns] = React.useState<Column[]>([
    {
      id: "todo",
      title: "To Do",
      status: "todo",
      tasks: tasks.filter(t => t.status === "todo"),
      color: "#94a3b8"
    },
    {
      id: "in-progress",
      title: "In Progress", 
      status: "in-progress",
      tasks: tasks.filter(t => t.status === "in-progress"),
      color: "#3b82f6"
    },
    {
      id: "review",
      title: "Review",
      status: "review", 
      tasks: tasks.filter(t => t.status === "review"),
      color: "#f59e0b"
    },
    {
      id: "done",
      title: "Done",
      status: "done",
      tasks: tasks.filter(t => t.status === "done"),
      color: "#10b981"
    }
  ])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const onTaskViewProject = React.useCallback(
    (task: Task) => {
      if (!task.projectId || !workspaceBasePath || !canOpenProject) {
        return
      }
      router.push(`${workspaceBasePath}/projects/${task.projectId}`)
    },
    [canOpenProject, router, workspaceBasePath]
  )

  const handleDragStart = (event: DragStartEvent) => {
    // Optional: Add visual feedback
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Add visual feedback
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as Task['status']

    if (newStatus === taskId) return // Not dragging over a column

    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updatedAt: new Date() }
          : task
      )
    )

    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus, updatedAt: new Date() }
          : task
      )

      return updatedTasks
    })
  }

  const handleTaskEdit = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    )
  }

  const handleTaskDelete = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
  }

  // Update columns when tasks change
  React.useEffect(() => {
    setColumns(prevColumns =>
      prevColumns.map(column => ({
        ...column,
        tasks: tasks.filter(task => task.status === column.status)
      }))
    )
  }, [tasks])

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Board View</h2>
          <p className="text-muted-foreground">Drag and drop tasks to update their status</p>
        </div>
        <div className="flex items-center gap-2">
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onTaskViewProject={onTaskViewProject}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}
