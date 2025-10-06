import * as React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Checkbox } from "./checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { PriorityBadge } from "./priority-badge"
import { StatusBadge } from "./status-badge"
import { cn } from "@/lib/utils"
import { 
  MoreHorizontal,
  Calendar,
  MessageSquare,
  Paperclip,
  Star,
  Clock
} from "lucide-react"

interface TaskRowProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  title: string
  description?: string
  status?: 'on-track' | 'stuck' | 'untouched' | 'in-progress' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    name: string
    avatar?: string
    email?: string
  }
  dueDate?: Date | string
  tags?: string[]
  comments?: number
  attachments?: number
  completed?: boolean
  starred?: boolean
  estimatedHours?: number
  actualHours?: number
  onClick?: () => void
  onToggleComplete?: (completed: boolean) => void
  onStar?: (starred: boolean) => void
  compact?: boolean
  showDetails?: boolean
}

function TaskRow({
  id,
  title,
  description,
  status,
  priority,
  assignee,
  dueDate,
  tags,
  comments,
  attachments,
  completed = false,
  starred = false,
  estimatedHours,
  actualHours,
  onClick,
  onToggleComplete,
  onStar,
  compact = false,
  showDetails = true,
  className,
  ...props
}: TaskRowProps) {
  const [isCompleted, setIsCompleted] = React.useState(completed)
  const [isStarred, setIsStarred] = React.useState(starred)

  const handleToggleComplete = (checked: boolean) => {
    setIsCompleted(checked)
    onToggleComplete?.(checked)
  }

  const handleStar = () => {
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onStar?.(newStarred)
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const today = new Date()
    const diffTime = d.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isCompleted && "opacity-60",
        compact && "border-l-4 border-l-transparent",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggleComplete}
            className="mt-1"
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-medium truncate",
                  isCompleted && "line-through text-muted-foreground",
                  compact ? "text-sm" : "text-base"
                )}>
                  {title}
                </h3>
                {description && !compact && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStar()
                  }}
                >
                  <Star 
                    className={cn(
                      "h-4 w-4",
                      isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    )}
                  />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status and Priority */}
            <div className="flex items-center gap-2 mb-2">
              {status && <StatusBadge status={status} />}
              {priority && <PriorityBadge priority={priority} />}
              {tags && tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Details */}
            {showDetails && !compact && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {assignee && (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={assignee.avatar} alt={assignee.name} />
                      <AvatarFallback className="text-[10px]">
                        {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{assignee.name}</span>
                  </div>
                )}
                
                {dueDate && (
                  <div className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-destructive"
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(dueDate)}</span>
                  </div>
                )}

                {estimatedHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{estimatedHours}h</span>
                    {actualHours && (
                      <span className="text-muted-foreground">/ {actualHours}h</span>
                    )}
                  </div>
                )}

                {comments !== undefined && comments > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{comments}</span>
                  </div>
                )}

                {attachments !== undefined && attachments > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <span>{attachments}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { TaskRow }