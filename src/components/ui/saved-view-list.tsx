import * as React from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { 
  Bookmark,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Share,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Calendar,
  BarChart3
} from "lucide-react"

interface SavedView {
  id: string
  name: string
  description?: string
  type: 'table' | 'kanban' | 'calendar' | 'dashboard' | 'list' | 'custom'
  filters?: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  isPublic?: boolean
  isDefault?: boolean
  owner?: string
  createdAt?: Date | string
  lastUsed?: Date | string
  useCount?: number
  tags?: string[]
}

interface SavedViewListProps extends React.HTMLAttributes<HTMLDivElement> {
  views: SavedView[]
  selectedView?: string
  onViewSelect?: (viewId: string) => void
  onViewEdit?: (viewId: string) => void
  onViewDelete?: (viewId: string) => void
  onViewDuplicate?: (viewId: string) => void
  onViewShare?: (viewId: string) => void
  onViewSetDefault?: (viewId: string) => void
  searchable?: boolean
  showType?: boolean
  showOwner?: boolean
  showUsage?: boolean
  compact?: boolean
  disabled?: boolean
}

function SavedViewList({
  views,
  selectedView,
  onViewSelect,
  onViewEdit,
  onViewDelete,
  onViewDuplicate,
  onViewShare,
  onViewSetDefault,
  searchable = true,
  showType = true,
  showOwner = true,
  showUsage = true,
  compact = false,
  disabled = false,
  className,
  ...props
}: SavedViewListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredViews = React.useMemo(() => {
    if (!searchQuery) return views
    
    const query = searchQuery.toLowerCase()
    return views.filter(view => 
      view.name.toLowerCase().includes(query) ||
      view.description?.toLowerCase().includes(query) ||
      view.owner?.toLowerCase().includes(query) ||
      view.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }, [views, searchQuery])

  const getViewIcon = (type: string) => {
    switch (type) {
      case 'table': return <List className="h-4 w-4" />
      case 'kanban': return <LayoutGrid className="h-4 w-4" />
      case 'calendar': return <Calendar className="h-4 w-4" />
      case 'dashboard': return <BarChart3 className="h-4 w-4" />
      case 'list': return <List className="h-4 w-4" />
      default: return <Bookmark className="h-4 w-4" />
    }
  }

  const getViewTypeColor = (type: string) => {
    switch (type) {
      case 'table': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'kanban': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'calendar': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'dashboard': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'list': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
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
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return formatDate(date)
  }

  const renderView = (view: SavedView) => {
    const isSelected = selectedView === view.id

    return (
      <div
        key={view.id}
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer transition-colors",
          "hover:bg-accent/50 hover:border-brand/50",
          isSelected && "bg-accent border-brand/50",
          disabled && "opacity-50 cursor-not-allowed",
          compact && "p-2"
        )}
        onClick={() => !disabled && onViewSelect?.(view.id)}
      >
        {/* View Icon */}
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg border",
          getViewTypeColor(view.type)
        )}>
          {getViewIcon(view.type)}
        </div>
        
        {/* View Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "font-medium truncate",
              compact && "text-sm"
            )}>
              {view.name}
            </span>
            
            {view.isDefault && (
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            )}
            
            {view.isPublic && (
              <Badge variant="secondary" className="text-xs">
                Public
              </Badge>
            )}
          </div>
          
          {view.description && !compact && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {view.description}
            </p>
          )}
          
          {/* Tags */}
          {view.tags && view.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {view.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {view.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{view.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {showType && (
              <div className="flex items-center gap-1">
                {getViewIcon(view.type)}
                <span className="capitalize">{view.type}</span>
              </div>
            )}
            
            {showOwner && view.owner && (
              <span>by {view.owner}</span>
            )}
            
            {showUsage && view.useCount !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{view.useCount} uses</span>
              </div>
            )}
            
            {view.lastUsed && (
              <span>Last used {getRelativeTime(view.lastUsed)}</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onViewDuplicate?.(view.id)
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onViewShare?.(view.id)
            }}
          >
            <Share className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onViewEdit?.(view.id)
            }}
          >
            <Edit className="h-3 w-3" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onViewDelete?.(view.id)
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  // Sort views: default first, then by last used
  const sortedViews = React.useMemo(() => {
    return [...filteredViews].sort((a, b) => {
      // Default views first
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      
      // Then by last used (most recent first)
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0
      
      return bTime - aTime
    })
  }, [filteredViews])

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Search */}
      {searchable && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search saved views..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>
      )}
      
      {/* View List */}
      <div className="space-y-2">
        {sortedViews.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-muted-foreground text-sm">
              {searchQuery ? 'No saved views found' : 'No saved views yet'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Create and save custom views to quickly access your preferred layouts
            </p>
          </div>
        ) : (
          sortedViews.map(renderView)
        )}
      </div>
      
      {/* Create New View */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New View
        </Button>
      </div>
    </div>
  )
}

export { SavedViewList, type SavedView }