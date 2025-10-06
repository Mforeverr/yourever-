import * as React from "react"
import { Card, CardContent } from "./card"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { 
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2
} from "lucide-react"

interface ActivityItem {
  id: string
  type: 'post' | 'comment' | 'like' | 'share' | 'file' | 'link' | 'status'
  author: {
    name: string
    avatar?: string
    role?: string
  }
  content: string
  timestamp: Date | string
  attachments?: Array<{
    type: 'image' | 'file'
    url: string
    name: string
    size?: string
  }>
  mentions?: Array<{
    id: string
    name: string
  }>
  tags?: string[]
  likes?: number
  comments?: number
  shares?: number
  isLiked?: boolean
  isBookmarked?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

interface ActivityFeedProps extends React.HTMLAttributes<HTMLDivElement> {
  activities: ActivityItem[]
  onLike?: (activityId: string) => void
  onComment?: (activityId: string) => void
  onShare?: (activityId: string) => void
  onBookmark?: (activityId: string) => void
  onEdit?: (activityId: string) => void
  onDelete?: (activityId: string) => void
  onLoadMore?: () => void
  showActions?: boolean
  showTimestamp?: boolean
  compact?: boolean
  loading?: boolean
  hasMore?: boolean
}

function ActivityFeed({
  activities,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onEdit,
  onDelete,
  onLoadMore,
  showActions = true,
  showTimestamp = true,
  compact = false,
  loading = false,
  hasMore = false,
  className,
  ...props
}: ActivityFeedProps) {
  const [likedActivities, setLikedActivities] = React.useState<Set<string>>(new Set())
  const [bookmarkedActivities, setBookmarkedActivities] = React.useState<Set<string>>(new Set())

  const handleLike = (activityId: string) => {
    const newLiked = new Set(likedActivities)
    if (newLiked.has(activityId)) {
      newLiked.delete(activityId)
    } else {
      newLiked.add(activityId)
    }
    setLikedActivities(newLiked)
    onLike?.(activityId)
  }

  const handleBookmark = (activityId: string) => {
    const newBookmarked = new Set(bookmarkedActivities)
    if (newBookmarked.has(activityId)) {
      newBookmarked.delete(activityId)
    } else {
      newBookmarked.add(activityId)
    }
    setBookmarkedActivities(newBookmarked)
    onBookmark?.(activityId)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post': return <Edit className="h-4 w-4" />
      case 'comment': return <MessageSquare className="h-4 w-4" />
      case 'like': return <Heart className="h-4 w-4" />
      case 'share': return <Share2 className="h-4 w-4" />
      case 'file': return <FileText className="h-4 w-4" />
      case 'link': return <LinkIcon className="h-4 w-4" />
      case 'status': return <Calendar className="h-4 w-4" />
      default: return <Edit className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'comment': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'like': return 'bg-red-500/10 text-red-400 border-red-500/20'
      case 'share': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'file': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'link': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'status': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const renderActivity = (activity: ActivityItem) => {
    const isLiked = likedActivities.has(activity.id) || activity.isLiked
    const isBookmarked = bookmarkedActivities.has(activity.id) || activity.isBookmarked

    return (
      <Card key={activity.id} className="shadow-sm">
        <CardContent className={cn("p-4", compact && "p-3")}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.author.avatar} alt={activity.author.name} />
                <AvatarFallback className="text-sm">
                  {activity.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{activity.author.name}</span>
                  {activity.author.role && (
                    <Badge variant="outline" className="text-xs">
                      {activity.author.role}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getActivityColor(activity.type))}
                  >
                    {getActivityIcon(activity.type)}
                    <span className="ml-1">{activity.type}</span>
                  </Badge>
                </div>
                
                {showTimestamp && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimestamp(activity.timestamp)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              {activity.canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEdit?.(activity.id)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              
              {activity.canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete?.(activity.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleBookmark(activity.id)}
              >
                <Bookmark 
                  className={cn(
                    "h-3 w-3",
                    isBookmarked && "fill-current text-brand"
                  )}
                />
              </Button>
              
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="mb-3">
            <p className="text-sm leading-relaxed">{activity.content}</p>
            
            {/* Mentions */}
            {activity.mentions && activity.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activity.mentions.map((mention) => (
                  <Badge key={mention.id} variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {mention.name}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Tags */}
            {activity.tags && activity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activity.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Attachments */}
          {activity.attachments && activity.attachments.length > 0 && (
            <div className="mb-3">
              <div className="grid gap-2">
                {activity.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-surface-elevated rounded-lg"
                  >
                    {attachment.type === 'image' ? (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      {attachment.size && (
                        <p className="text-xs text-muted-foreground">{attachment.size}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Engagement */}
          {showActions && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 gap-1",
                    isLiked && "text-red-500 hover:text-red-600"
                  )}
                  onClick={() => handleLike(activity.id)}
                >
                  <Heart 
                    className={cn(
                      "h-4 w-4",
                      isLiked && "fill-current"
                    )}
                  />
                  {activity.likes && (
                    <span className="text-xs">{activity.likes}</span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  onClick={() => onComment?.(activity.id)}
                >
                  <MessageSquare className="h-4 w-4" />
                  {activity.comments && (
                    <span className="text-xs">{activity.comments}</span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  onClick={() => onShare?.(activity.id)}
                >
                  <Share2 className="h-4 w-4" />
                  {activity.shares && (
                    <span className="text-xs">{activity.shares}</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {activities.length === 0 && !loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No activities yet
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Start engaging with your team to see activities here
          </p>
        </div>
      ) : (
        <>
          {activities.map(renderActivity)}
          
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand mx-auto" />
            </div>
          )}
          
          {hasMore && !loading && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export { ActivityFeed, type ActivityItem }