import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Progress } from "./progress"
import { cn } from "@/lib/utils"
import { 
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  MoreHorizontal,
  Star,
  Settings,
  ChevronRight
} from "lucide-react"

interface OrgCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  name: string
  description?: string
  logo?: string
  industry?: string
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  location?: string
  website?: string
  email?: string
  phone?: string
  memberCount?: number
  projectCount?: number
  completionRate?: number
  tags?: string[]
  starred?: boolean
  isOwner?: boolean
  onStar?: (starred: boolean) => void
  onSettings?: () => void
  onClick?: () => void
  compact?: boolean
  showActions?: boolean
}

function OrgCard({
  id,
  name,
  description,
  logo,
  industry,
  size,
  location,
  website,
  email,
  phone,
  memberCount,
  projectCount,
  completionRate,
  tags,
  starred = false,
  isOwner = false,
  onStar,
  onSettings,
  onClick,
  compact = false,
  showActions = true,
  className,
  ...props
}: OrgCardProps) {
  const [isStarred, setIsStarred] = React.useState(starred)

  const handleStar = () => {
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onStar?.(newStarred)
  }

  const getSizeLabel = (size?: string) => {
    switch (size) {
      case 'startup': return '1-10 employees'
      case 'small': return '11-50 employees'
      case 'medium': return '51-200 employees'
      case 'large': return '201-1000 employees'
      case 'enterprise': return '1000+ employees'
      default: return 'Unknown size'
    }
  }

  const getSizeColor = (size?: string) => {
    switch (size) {
      case 'startup': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'small': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'large': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'enterprise': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-brand/50",
        compact && "border-l-4 border-l-transparent",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-surface-elevated border border-border">
              {logo ? (
                <img src={logo} alt={name} className="w-8 h-8 rounded" />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                "text-lg truncate",
                compact && "text-base"
              )}>
                {name}
              </CardTitle>
              
              {industry && (
                <Badge variant="outline" className="text-xs mt-1">
                  {industry}
                </Badge>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStar()
                }}
              >
                <Star 
                  className={cn(
                    "h-4 w-4",
                    isStarred && "fill-yellow-400 text-yellow-400"
                  )}
                />
              </Button>
              
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSettings?.()
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn(compact && "pt-0")}>
        {description && (
          <p className={cn(
            "text-muted-foreground mb-4",
            compact ? "text-sm line-clamp-2" : "text-sm line-clamp-3"
          )}>
            {description}
          </p>
        )}
        
        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Organization Info */}
        <div className="space-y-3">
          {/* Size */}
          {size && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{getSizeLabel(size)}</span>
            </div>
          )}
          
          {/* Location */}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{location}</span>
            </div>
          )}
          
          {/* Website */}
          {website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a 
                href={website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-brand hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          
          {/* Email */}
          {email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${email}`}
                className="text-sm text-brand hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {email}
              </a>
            </div>
          )}
          
          {/* Phone */}
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${phone}`}
                className="text-sm text-brand hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {phone}
              </a>
            </div>
          )}
        </div>
        
        {/* Stats */}
        {!compact && (memberCount || projectCount || completionRate !== undefined) && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              {memberCount && (
                <div>
                  <div className="text-lg font-semibold">{memberCount}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
              )}
              
              {projectCount && (
                <div>
                  <div className="text-lg font-semibold">{projectCount}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
              )}
              
              {completionRate !== undefined && (
                <div>
                  <div className="text-lg font-semibold">{completionRate}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              )}
            </div>
            
            {completionRate !== undefined && (
              <div className="mt-3">
                <Progress value={completionRate} className="h-2" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { OrgCard }