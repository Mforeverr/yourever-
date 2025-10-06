"use client"

import * as React from "react"
import { DataTable, type DataTableColumn, type DataTableAction } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { PriorityBadge } from "@/components/ui/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User as UserIcon,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus
} from "lucide-react"

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    name: string
    avatar?: string
    email?: string
  }
  dueDate?: Date
  startDate?: Date
  tags?: string[]
  comments?: number
  attachments?: number
  createdAt: Date
  updatedAt: Date
  progress?: number
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Setup authentication system",
    description: "Implement OAuth2 with Google and GitHub providers for secure user authentication",
    status: "in-progress",
    priority: "high",
    assignee: { name: "Alex Chen", avatar: "/avatars/alex.jpg", email: "alex@example.com" },
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    tags: ["backend", "security", "oauth"],
    comments: 5,
    attachments: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    progress: 65
  },
  {
    id: "2", 
    title: "Design new landing page",
    description: "Create modern, responsive mockups and prototypes for the marketing landing page",
    status: "todo",
    priority: "medium",
    assignee: { name: "Sarah Miller", avatar: "/avatars/sarah.jpg", email: "sarah@example.com" },
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    tags: ["design", "marketing", "ui/ux"],
    comments: 3,
    attachments: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    progress: 0
  },
  {
    id: "3",
    title: "Fix navigation bug on mobile",
    description: "Menu doesn't close properly on iOS devices when tapping outside",
    status: "review",
    priority: "urgent",
    assignee: { name: "Mike Johnson", avatar: "/avatars/mike.jpg", email: "mike@example.com" },
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
    tags: ["bug", "mobile", "ios"],
    comments: 8,
    attachments: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    progress: 90
  },
  {
    id: "4",
    title: "Database optimization",
    description: "Improve query performance for user dashboard by adding proper indexes",
    status: "done",
    priority: "low",
    assignee: { name: "Alex Chen", avatar: "/avatars/alex.jpg", email: "alex@example.com" },
    tags: ["backend", "performance", "database"],
    comments: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    progress: 100
  },
  {
    id: "5",
    title: "Implement real-time notifications",
    description: "Add WebSocket support for real-time notifications and updates",
    status: "in-progress",
    priority: "medium",
    assignee: { name: "Emma Davis", email: "emma@example.com" },
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    tags: ["backend", "websocket", "notifications"],
    comments: 4,
    attachments: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    progress: 40
  }
]

export function ListView() {
  const [tasks, setTasks] = React.useState<Task[]>(mockTasks)
  const [filteredTasks, setFilteredTasks] = React.useState<Task[]>(mockTasks)
  const [selectedTasks, setSelectedTasks] = React.useState<Task[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all")
  const [sortColumn, setSortColumn] = React.useState<keyof Task | null>("updatedAt")
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')

  // Filter and search logic
  React.useEffect(() => {
    let filtered = tasks

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    // Sort logic
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (aValue === undefined || bValue === undefined) return 0

        let comparison = 0
        if (aValue < bValue) comparison = -1
        if (aValue > bValue) comparison = 1

        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    setFilteredTasks(filtered)
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortColumn, sortDirection])

  const handleSort = (column: keyof Task, direction: 'asc' | 'desc') => {
    setSortColumn(column)
    setSortDirection(direction)
  }

  const handleView = (task: Task) => {
    console.log("View task:", task.id)
  }

  const handleEdit = (task: Task) => {
    console.log("Edit task:", task.id)
  }

  const handleDelete = (task: Task) => {
    setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id))
  }

  const handleExport = () => {
    console.log("Export tasks")
  }

  const columns: DataTableColumn<Task>[] = [
    {
      key: "title",
      title: "Title",
      sortable: true,
      render: (value, row) => (
        <div className="max-w-64">
          <div className="font-medium text-sm truncate">{value}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground truncate mt-1">
              {row.description}
            </div>
          )}
          {row.tags && row.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {row.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {row.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{row.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
      width: "300px"
    },
    {
      key: "status",
      title: "Status",
      sortable: true,
      render: (value) => <StatusBadge status={value as string} />,
      width: "120px"
    },
    {
      key: "priority",
      title: "Priority",
      sortable: true,
      render: (value) => <PriorityBadge priority={value as string} />,
      width: "120px"
    },
    {
      key: "assignee",
      title: "Assignee",
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-muted-foreground text-sm">Unassigned</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={value.avatar} alt={value.name} />
              <AvatarFallback className="text-[8px]">
                {value.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{value.name}</span>
          </div>
        )
      },
      width: "150px"
    },
    {
      key: "dueDate",
      title: "Due Date",
      sortable: true,
      render: (value) => {
        if (!value) return <span className="text-muted-foreground text-sm">No due date</span>
        const isOverdue = new Date(value) < new Date() && new Date(value).toDateString() !== new Date().toDateString()
        return (
          <div className={cn(
            "text-sm",
            isOverdue && "text-destructive font-medium"
          )}>
            {value.toLocaleDateString()}
          </div>
        )
      },
      width: "120px"
    },
    {
      key: "progress",
      title: "Progress",
      sortable: true,
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-2 max-w-16">
            <div 
              className="bg-brand h-2 rounded-full transition-all"
              style={{ width: `${value || 0}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-8">
            {value || 0}%
          </span>
        </div>
      ),
      width: "120px"
    },
    {
      key: "comments",
      title: "Activity",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {row.comments && (
            <div className="flex items-center gap-1">
              <span>{row.comments}</span>
            </div>
          )}
          {row.attachments && (
            <div className="flex items-center gap-1">
              <span>{row.attachments}</span>
            </div>
          )}
        </div>
      ),
      width: "100px"
    }
  ]

  const actions: DataTableAction<Task>[] = [
    {
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView
    },
    {
      label: "Edit", 
      icon: <Edit className="h-4 w-4" />,
      onClick: handleEdit
    },
    {
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: handleDelete,
      variant: "destructive"
    }
  ]

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">List View</h2>
          <p className="text-muted-foreground">
            Sortable and filterable task list with advanced filtering options
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-surface-elevated rounded-lg">
        <div className="flex items-center gap-2 flex-1 min-w-64">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-background rounded-lg border border-border">
        <DataTable
          data={filteredTasks}
          columns={columns}
          actions={actions}
          selectable={true}
          onSelectionChange={setSelectedTasks}
          onSort={handleSort}
          emptyMessage="No tasks found matching your criteria"
        />
      </div>

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected
            </span>
            <Button variant="outline" size="sm">
              Bulk Edit
            </Button>
            <Button variant="outline" size="sm">
              Change Status
            </Button>
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}