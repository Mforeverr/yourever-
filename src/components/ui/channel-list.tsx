import * as React from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { 
  Hash,
  Volume2,
  Lock,
  Users,
  Pin,
  Search,
  Plus,
  MoreHorizontal,
  ChevronDown
} from "lucide-react"

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'private'
  description?: string
  memberCount?: number
  unreadCount?: number
  isPinned?: boolean
  isJoined?: boolean
  lastActivity?: Date | string
  category?: string
}

interface ChannelListProps extends React.HTMLAttributes<HTMLDivElement> {
  channels: Channel[]
  selectedChannel?: string
  onChannelSelect?: (channelId: string) => void
  onChannelJoin?: (channelId: string) => void
  onChannelLeave?: (channelId: string) => void
  onChannelPin?: (channelId: string, pinned: boolean) => void
  searchable?: boolean
  showCategories?: boolean
  showMemberCount?: boolean
  showUnreadCount?: boolean
  compact?: boolean
  disabled?: boolean
}

function ChannelList({
  channels,
  selectedChannel,
  onChannelSelect,
  onChannelJoin,
  onChannelLeave,
  onChannelPin,
  searchable = true,
  showCategories = true,
  showMemberCount = true,
  showUnreadCount = true,
  compact = false,
  disabled = false,
  className,
  ...props
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set())

  const filteredChannels = React.useMemo(() => {
    if (!searchQuery) return channels
    
    const query = searchQuery.toLowerCase()
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(query) ||
      channel.description?.toLowerCase().includes(query) ||
      channel.category?.toLowerCase().includes(query)
    )
  }, [channels, searchQuery])

  const groupedChannels = React.useMemo(() => {
    if (!showCategories) return { '': filteredChannels }
    
    return filteredChannels.reduce((groups, channel) => {
      const category = channel.category || 'Uncategorized'
      if (!groups[category]) groups[category] = []
      groups[category].push(channel)
      return groups
    }, {} as Record<string, Channel[]>)
  }, [filteredChannels, showCategories])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'text': return <Hash className="h-4 w-4" />
      case 'voice': return <Volume2 className="h-4 w-4" />
      case 'private': return <Lock className="h-4 w-4" />
      default: return <Hash className="h-4 w-4" />
    }
  }

  const formatLastActivity = (date: Date | string) => {
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
    
    return d.toLocaleDateString()
  }

  const renderChannel = (channel: Channel) => {
    const isSelected = selectedChannel === channel.id
    const hasUnread = showUnreadCount && channel.unreadCount && channel.unreadCount > 0

    return (
      <div
        key={channel.id}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          compact && "p-1.5"
        )}
        onClick={() => !disabled && onChannelSelect?.(channel.id)}
      >
        {/* Channel Icon */}
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-elevated">
          {getChannelIcon(channel.type)}
        </div>
        
        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              compact && "text-sm"
            )}>
              {channel.name}
            </span>
            
            {channel.isPinned && (
              <Pin className="h-3 w-3 text-muted-foreground" />
            )}
            
            {hasUnread && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4">
                {channel.unreadCount}
              </Badge>
            )}
          </div>
          
          {channel.description && !compact && (
            <p className="text-xs text-muted-foreground truncate">
              {channel.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {showMemberCount && channel.memberCount && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{channel.memberCount}</span>
              </div>
            )}
            
            {channel.lastActivity && (
              <span>{formatLastActivity(channel.lastActivity)}</span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {!channel.isJoined ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onChannelJoin?.(channel.id)
              }}
            >
              Join
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onChannelPin?.(channel.id, !channel.isPinned)
              }}
            >
              <Pin 
                className={cn(
                  "h-3 w-3",
                  channel.isPinned && "fill-current text-brand"
                )}
              />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Search */}
      {searchable && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>
      )}
      
      {/* Channel List */}
      <div className="space-y-4">
        {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
          <div key={category}>
            {showCategories && category && (
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-0"
                  onClick={() => toggleCategory(category)}
                >
                  <ChevronDown 
                    className={cn(
                      "h-3 w-3 transition-transform",
                      !expandedCategories.has(category) && "-rotate-90"
                    )}
                  />
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  {category}
                </span>
                <Badge variant="outline" className="text-xs">
                  {categoryChannels.length}
                </Badge>
              </div>
            )}
            
            <div className={cn(
              "space-y-1",
              showCategories && category && !expandedCategories.has(category) && "hidden"
            )}>
              {categoryChannels.map(renderChannel)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Create Channel */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Channel
        </Button>
      </div>
    </div>
  )
}

export { ChannelList, type Channel }