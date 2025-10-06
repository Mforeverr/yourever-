"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { PriorityBadge } from "@/components/ui/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  Plus,
  Calendar,
  User as UserIcon,
  GripVertical,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Clock
} from "lucide-react"

interface TimelineTask {
  id: string
  title: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    name: string
    avatar?: string
  }
  startDate: Date
  endDate: Date
  progress?: number
  color?: string
  dependencies?: string[]
}

interface TimelineLane {
  id: string
  title: string
  tasks: TimelineTask[]
  color?: string
}

const mockTasks: TimelineTask[] = [
  {
    id: "1",
    title: "Setup authentication system",
    status: "in-progress",
    priority: "high",
    assignee: { name: "Alex Chen", avatar: "/avatars/alex.jpg" },
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    progress: 65,
    color: "#3b82f6"
  },
  {
    id: "2",
    title: "Design new landing page",
    status: "todo",
    priority: "medium",
    assignee: { name: "Sarah Miller", avatar: "/avatars/sarah.jpg" },
    startDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    progress: 0,
    color: "#8b5cf6"
  },
  {
    id: "3",
    title: "Fix navigation bug on mobile",
    status: "review",
    priority: "urgent",
    assignee: { name: "Mike Johnson", avatar: "/avatars/mike.jpg" },
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
    progress: 90,
    color: "#ef4444"
  },
  {
    id: "4",
    title: "Database optimization",
    status: "done",
    priority: "low",
    assignee: { name: "Alex Chen", avatar: "/avatars/alex.jpg" },
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    progress: 100,
    color: "#10b981"
  },
  {
    id: "5",
    title: "Implement real-time notifications",
    status: "in-progress",
    priority: "medium",
    assignee: { name: "Emma Davis" },
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    progress: 40,
    color: "#f59e0b"
  }
]

const mockLanes: TimelineLane[] = [
  {
    id: "backend",
    title: "Backend Development",
    tasks: mockTasks.filter(t => t.id === "1" || t.id === "4" || t.id === "5"),
    color: "#3b82f6"
  },
  {
    id: "frontend",
    title: "Frontend Development", 
    tasks: mockTasks.filter(t => t.id === "2" || t.id === "3"),
    color: "#8b5cf6"
  }
]

function TimelineBar({ task, onResize, onMove }: {
  task: TimelineTask
  onResize: (taskId: string, newStartDate: Date, newEndDate: Date) => void
  onMove: (taskId: string, newStartDate: Date, newEndDate: Date) => void
}) {
  const [isResizing, setIsResizing] = React.useState<'start' | 'end' | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const barRef = React.useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent, resizeType: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(resizeType)
  }

  const handleBarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Calculate position and width based on dates
  const calculatePosition = () => {
    // This is a simplified calculation - in a real implementation,
    // you'd calculate based on the timeline's date range and pixel width
    const timelineStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 7 days ago
    const timelineEnd = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) // 14 days from now
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime()
    
    const startOffset = ((task.startDate.getTime() - timelineStart.getTime()) / totalDuration) * 100
    const duration = ((task.endDate.getTime() - task.startDate.getTime()) / totalDuration) * 100
    
    return { left: `${startOffset}%`, width: `${duration}%` }
  }

  const position = calculatePosition()

  return (
    <div
      ref={barRef}
      className={cn(
        "absolute h-8 rounded-md border cursor-move transition-all hover:shadow-md",
        isDragging && "shadow-lg z-50",
        task.status === 'done' && "opacity-75"
      )}
      style={{
        ...position,
        backgroundColor: task.color || "#3b82f6",
        borderColor: task.color ? `${task.color}cc` : "#3b82f6cc"
      }}
      onMouseDown={handleBarMouseDown}
    >
      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
        onMouseDown={(e) => handleMouseDown(e, 'start')}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
        onMouseDown={(e) => handleMouseDown(e, 'end')}
      />

      {/* Task content */}
      <div className="flex items-center h-full px-2 overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.assignee && (
              <Avatar className="h-4 w-4">
                <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                <AvatarFallback className="text-[6px]">
                  {task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <PriorityBadge priority={task.priority} className="scale-75" />
          </div>
        </div>
        
        {/* Progress indicator */}
        {task.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div 
              className="h-full bg-white/60 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-0 mb-2 p-2 bg-background border border-border rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-48">
        <div className="text-sm font-medium mb-1">{task.title}</div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Start: {task.startDate.toLocaleDateString()}</div>
          <div>End: {task.endDate.toLocaleDateString()}</div>
          <div>Progress: {task.progress || 0}%</div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineLane({ lane }: { lane: TimelineLane }) {
  return (
    <div className="flex border-b border-border">
      <div className="w-48 p-4 bg-surface-elevated border-r border-border">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: lane.color }}
          />
          <h3 className="font-medium text-sm">{lane.title}</h3>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {lane.tasks.length} task{lane.tasks.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 relative h-16 bg-surface">
        {/* Timeline grid lines */}
        <div className="absolute inset-0 flex">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="flex-1 border-r border-border/30" />
          ))}
        </div>
        
        {/* Tasks */}
        {lane.tasks.map((task) => (
          <TimelineBar
            key={task.id}
            task={task}
            onResize={(taskId, newStart, newEnd) => {
              console.log("Resize task:", taskId, newStart, newEnd)
            }}
            onMove={(taskId, newStart, newEnd) => {
              console.log("Move task:", taskId, newStart, newEnd)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TimelineHeader() {
  const today = new Date()
  const dates = []
  
  // Generate 14 days (7 days before to 7 days after today)
  for (let i = -7; i <= 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }

  return (
    <div className="flex border-b border-border">
      <div className="w-48 p-4 bg-surface-elevated border-r border-border">
        <h3 className="font-medium text-sm">Timeline</h3>
      </div>
      
      <div className="flex-1 flex">
        {dates.map((date, index) => (
          <div key={index} className="flex-1 min-w-0 p-2 text-center border-r border-border/30">
            <div className={cn(
              "text-xs font-medium",
              date.toDateString() === today.toDateString() && "text-brand"
            )}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={cn(
              "text-xs text-muted-foreground",
              date.toDateString() === today.toDateString() && "text-brand"
            )}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimelineView() {
  const [lanes, setLanes] = React.useState<TimelineLane[]>(mockLanes)
  const [zoomLevel, setZoomLevel] = React.useState(1)

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Timeline View</h2>
          <p className="text-muted-foreground">
            Visualize project timeline with resizable task bars (UI only)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomOut}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs px-2 font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomIn}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleResetZoom}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left' }}>
            <TimelineHeader />
            <div>
              {lanes.map((lane) => (
                <TimelineLane key={lane.id} lane={lane} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-surface-elevated rounded-lg">
        <h3 className="text-sm font-medium mb-3">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand" />
            <span>Task Duration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-brand opacity-50" />
            <span>Completed Task</span>
          </div>
          <div className="flex items-center gap-2">
            <GripVertical className="h-3 w-3" />
            <span>Drag to Move</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-border rounded" />
            <span>Resize Handles</span>
          </div>
        </div>
      </div>
    </div>
  )
}