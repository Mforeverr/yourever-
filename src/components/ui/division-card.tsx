import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Progress } from "./progress"
import { cn } from "@/lib/utils"
import { 
  Building,
  Users,
  Target,
  TrendingUp,
  MoreHorizontal,
  Star,
  Settings,
  ChevronRight,
  FolderOpen
} from "lucide-react"

interface DivisionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  name: string
  description?: string
  organization?: string
  lead?: {
    name: string
    avatar?: string
    email?: string
  }
  memberCount?: number
  teamCount?: number
  projectCount?: number
  budget?: number
  budgetUsed?: number
  performance?: number
  status: 'active' | 'inactive' | 'pending'
  tags?: string[]
  starred?: boolean
  isLead?: boolean
  onStar?: (starred: boolean) => void
  onSettings?: () => void
  onClick?: () => void
  compact?: boolean
  showActions?: boolean
}

function DivisionCard({
  id,
  name,
  description,
  organization,
  lead,
  memberCount,
  teamCount,
  projectCount,
  budget,
  budgetUsed,
  performance,
  status,
  tags,
  starred = false,
  isLead = false,
  onStar,
  onSettings,
  onClick,
  compact = false,
  showActions = true,
  className,
  ...props
}: DivisionCardProps) {
  const [isStarred, setIsStarred] = React.useState(starred)

  const handleStar = () => {
    const newStarred = !isStarred
    setIsStarred(newStarred)
    onStar?.(newStarred)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'inactive': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const budgetPercentage = budget && budgetUsed ? (budgetUsed / budget) * 100 : 0

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
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-surface-elevated border border-border">
              <Building className="w-6 h-6 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className={cn(
                  "text-lg truncate",
                  compact && "text-base"
                )}>
                  {name}
                </CardTitle>
                
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getStatusColor(status))}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              
              {organization && (
                <p className="text-sm text-muted-foreground truncate">
                  {organization}
                </p>
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
              
              {isLead && (
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
        
        {/* Lead */}
        {lead && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-surface-elevated rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={lead.avatar} alt={lead.name} />
              <AvatarFallback className="text-xs">
                {lead.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{lead.name}</div>
              <div className="text-xs text-muted-foreground">Division Lead</div>
            </div>
          </div>
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
        
        {/* Stats */}
        <div className="space-y-3">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            {memberCount && (
              <div>
                <div className="text-lg font-semibold">{memberCount}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
            )}
            
            {teamCount && (
              <div>
                <div className="text-lg font-semibold">{teamCount}</div>
                <div className="text-xs text-muted-foreground">Teams</div>
              </div>
            )}
            
            {projectCount && (
              <div>
                <div className="text-lg font-semibold">{projectCount}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
            )}
          </div>
          
          {/* Budget */}
          {budget && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget Used</span>
                <span className="font-medium">
                  {formatCurrency(budgetUsed || 0)} / {formatCurrency(budget)}
                </span>
              </div>
              <Progress 
                value={budgetPercentage} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={
                  budgetPercentage > 90 ? 'bg-red-500' :
                  budgetPercentage > 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }
              />
            </div>
          )}
          
          {/* Performance */}
          {performance !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Performance</span>
                <span className="font-medium">{performance}%</span>
              </div>
              <Progress 
                value={performance} 
                className="h-2"
                // @ts-ignore
                indicatorClassName={
                  performance >= 80 ? 'bg-green-500' :
                  performance >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { DivisionCard }