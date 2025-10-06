import * as React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Progress } from "./progress"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { PresenceAvatarGroup } from "./presence-avatar-group"
import { cn } from "@/lib/utils"
import { 
  Calendar,
  Users,
  Target,
  TrendingUp,
  MoreHorizontal,
  Star,
  Archive,
  Settings,
  Play,
  Pause
} from "lucide-react"

interface ProjectHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  name: string
  description?: string
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'archived'
  progress: number
  startDate?: Date | string
  endDate?: Date | string
  team?: Array<{
    id: string
    name: string
    avatar?: string
    status?: 'online' | 'away' | 'offline'
  }>
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  starred?: boolean
  isOwner?: boolean
  onStar?: (starred: boolean) => void
  onStatusChange?: (status: string) => void
  onSettings?: () => void
  compact?: boolean
  showActions?: boolean
}

function ProjectHeader({
  id,
  name,
  description,
  status,
  progress,
  startDate,
  endDate,
  team,
  tags,
  priority,
  starred = false,
  isOwner = false,
  onStar,
  onStatusChange,
  onSettings,
  compact = false,
  showActions = true,
  className,
  ...props
}: ProjectHeaderProps) {
  const [isStarred, setIsStarred] = React.useState(starred)

  const handleStar = () => {
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onStar?.(newStarred)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'on-hold': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'archived': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <Target className="h-3 w-3" />
      case 'active': return <Play className="h-3 w-3" />
      case 'on-hold': return <Pause className="h-3 w-3" />
      case 'completed': return <TrendingUp className="h-3 w-3" />
      case 'archived': return <Archive className="h-3 w-3" />
      default: return null
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className={cn("", className)} {...props}>
      <CardContent className={cn("p-6", compact && "p-4")}>
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className={cn(
                "font-bold text-foreground truncate",
                compact ? "text-xl" : "text-2xl"
              )}>
                {name}
              </h1>
              
              {/* Status Badge */}
              <Badge 
                variant="outline" 
                className={cn("flex items-center gap-1", getStatusColor(status))}
              >
                {getStatusIcon(status)}
                {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              
              {/* Priority Badge */}
              {priority && (
                <Badge variant="outline" className={
                  priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-green-500/10 text-green-400 border-green-500/20'
                }>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Badge>
              )}
            </div>

            {description && (
              <p className={cn(
                "text-muted-foreground mb-4",
                compact ? "text-sm line-clamp-2" : "text-base"
              )}>
                {description}
              </p>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={getProgressColor(progress)}
              />
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {startDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Start: {formatDate(startDate)}</span>
                </div>
              )}
              
              {endDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>End: {formatDate(endDate)}</span>
                </div>
              )}
              
              {team && team.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{team.length} members</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStar}
              >
                <Star 
                  className={cn(
                    "h-5 w-5",
                    isStarred && "fill-yellow-400 text-yellow-400"
                  )}
                />
              </Button>
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettings}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}
              
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Team */}
        {team && team.length > 0 && !compact && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium mb-2">Team Members</h3>
                <PresenceAvatarGroup users={team} max={8} />
              </div>
              
              {isOwner && (
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Team
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { ProjectHeader }