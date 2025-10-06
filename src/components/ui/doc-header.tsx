import * as React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { 
  FileText,
  Calendar,
  User,
  Edit3,
  Share2,
  Download,
  Star,
  MoreHorizontal,
  Lock,
  Unlock,
  Eye,
  MessageSquare,
  Clock
} from "lucide-react"

interface DocHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  title: string
  description?: string
  type: 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'image' | 'other'
  status: 'draft' | 'review' | 'published' | 'archived'
  author?: {
    name: string
    avatar?: string
    email?: string
  }
  lastModified?: Date | string
  createdAt?: Date | string
  version?: string
  tags?: string[]
  starred?: boolean
  isPublic?: boolean
  viewCount?: number
  commentCount?: number
  isOwner?: boolean
  onStar?: (starred: boolean) => void
  onShare?: () => void
  onDownload?: () => void
  onEdit?: () => void
  compact?: boolean
  showActions?: boolean
}

function DocHeader({
  id,
  title,
  description,
  type,
  status,
  author,
  lastModified,
  createdAt,
  version,
  tags,
  starred = false,
  isPublic = false,
  viewCount,
  commentCount,
  isOwner = false,
  onStar,
  onShare,
  onDownload,
  onEdit,
  compact = false,
  showActions = true,
  className,
  ...props
}: DocHeaderProps) {
  const [isStarred, setIsStarred] = React.useState(starred)

  const handleStar = () => {
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onStar?.(newStarred)
  }

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-5 w-5" />
      case 'spreadsheet': return <FileText className="h-5 w-5" />
      case 'presentation': return <FileText className="h-5 w-5" />
      case 'pdf': return <FileText className="h-5 w-5" />
      case 'image': return <FileText className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'review': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'published': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'archived': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return formatDate(date)
  }

  return (
    <Card className={cn("", className)} {...props}>
      <CardContent className={cn("p-6", compact && "p-4")}>
        <div className="flex items-start justify-between gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Document Icon */}
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand/10 text-brand">
                {getDocIcon(type)}
              </div>
              
              <h1 className={cn(
                "font-bold text-foreground truncate",
                compact ? "text-xl" : "text-2xl"
              )}>
                {title}
              </h1>
              
              {/* Status Badge */}
              <Badge 
                variant="outline" 
                className={getStatusColor(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
              
              {/* Version */}
              {version && (
                <Badge variant="secondary" className="text-xs">
                  v{version}
                </Badge>
              )}
              
              {/* Privacy Indicator */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isPublic ? (
                  <>
                    <Unlock className="h-3 w-3" />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>Private</span>
                  </>
                )}
              </div>
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

            {/* Metadata */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {author && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={author.avatar} alt={author.name} />
                    <AvatarFallback className="text-[10px]">
                      {author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{author.name}</span>
                </div>
              )}
              
              {lastModified && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Modified {getRelativeTime(lastModified)}</span>
                </div>
              )}
              
              {createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(createdAt)}</span>
                </div>
              )}
              
              {viewCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{viewCount} views</span>
                </div>
              )}
              
              {commentCount !== undefined && commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{commentCount} comments</span>
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
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
              >
                <Download className="h-5 w-5" />
              </Button>
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                >
                  <Edit3 className="h-5 w-5" />
                </Button>
              )}
              
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { DocHeader }