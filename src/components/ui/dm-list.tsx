import * as React from "react"
import { Button } from "./button"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { 
  Search,
  Plus,
  MoreHorizontal,
  Pin,
  Archive,
  BellOff
} from "lucide-react"

interface DMUser {
  id: string
  name: string
  avatar?: string
  status?: 'online' | 'away' | 'offline' | 'busy'
  lastMessage?: string
  lastMessageTime?: Date | string
  unreadCount?: number
  isPinned?: boolean
  isMuted?: boolean
  isTyping?: boolean
  customStatus?: string
}

interface DMGroup {
  id: string
  name: string
  avatar?: string
  members: Array<{
    id: string
    name: string
    avatar?: string
    status?: 'online' | 'away' | 'offline' | 'busy'
  }>
  lastMessage?: string
  lastMessageTime?: Date | string
  unreadCount?: number
  isPinned?: boolean
  isMuted?: boolean
  memberCount?: number
}

type DMItem = DMUser | DMGroup

interface DMListProps extends React.HTMLAttributes<HTMLDivElement> {
  conversations: DMItem[]
  selectedConversation?: string
  onConversationSelect?: (conversationId: string) => void
  onConversationPin?: (conversationId: string, pinned: boolean) => void
  onConversationMute?: (conversationId: string, muted: boolean) => void
  onConversationArchive?: (conversationId: string) => void
  searchable?: boolean
  showStatus?: boolean
  showUnreadCount?: boolean
  showTypingIndicator?: boolean
  compact?: boolean
  disabled?: boolean
}

function DMList({
  conversations,
  selectedConversation,
  onConversationSelect,
  onConversationPin,
  onConversationMute,
  onConversationArchive,
  searchable = true,
  showStatus = true,
  showUnreadCount = true,
  showTypingIndicator = true,
  compact = false,
  disabled = false,
  className,
  ...props
}: DMListProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery) return conversations
    
    const query = searchQuery.toLowerCase()
    return conversations.filter(conv => {
      if ('members' in conv) {
        // Group conversation
        return conv.name.toLowerCase().includes(query) ||
               conv.members.some(member => member.name.toLowerCase().includes(query))
      } else {
        // Direct message
        return conv.name.toLowerCase().includes(query) ||
               conv.customStatus?.toLowerCase().includes(query)
      }
    })
  }, [conversations, searchQuery])

  const formatLastMessageTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return ''
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

  const isGroup = (conv: DMItem): conv is DMGroup => {
    return 'members' in conv
  }

  const renderConversation = (conv: DMItem) => {
    const isSelected = selectedConversation === conv.id
    const hasUnread = showUnreadCount && (conv.unreadCount ?? 0) > 0
    const isTyping = showTypingIndicator && 'isTyping' in conv && conv.isTyping

    return (
      <div
        key={conv.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-accent text-accent-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          compact && "p-2"
        )}
        onClick={() => !disabled && onConversationSelect?.(conv.id)}
      >
        {/* Avatar */}
        {isGroup(conv) ? (
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conv.avatar} alt={conv.name} />
              <AvatarFallback className="text-sm">
                {conv.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {conv.memberCount && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full border border-border px-1">
                <span className="text-[10px] font-medium">{conv.memberCount}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conv.avatar} alt={conv.name} />
              <AvatarFallback className="text-sm">
                {conv.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {showStatus && conv.status && (
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                  conv.status === 'online' && "bg-green-500",
                  conv.status === 'away' && "bg-yellow-500",
                  conv.status === 'busy' && "bg-red-500",
                  conv.status === 'offline' && "bg-gray-500"
                )}
              />
            )}
          </div>
        )}
        
        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-medium truncate",
                compact && "text-sm"
              )}>
                {conv.name}
              </span>
              
              {conv.isPinned && (
                <Pin className="h-3 w-3 text-muted-foreground" />
              )}
              
              {conv.isMuted && (
                <BellOff className="h-3 w-3 text-muted-foreground" />
              )}
              
              {hasUnread && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4">
                  {conv.unreadCount}
                </Badge>
              )}
            </div>
            
            {conv.lastMessageTime && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatLastMessageTime(conv.lastMessageTime)}
              </span>
            )}
          </div>
          
          {/* Last Message or Typing Indicator */}
          <div className="flex items-center gap-1">
            {isTyping ? (
              <div className="flex items-center gap-1 text-xs text-brand">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-brand rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-1 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>typing...</span>
              </div>
            ) : (
              <>
                {conv.lastMessage && (
                  <p className={cn(
                    "text-muted-foreground truncate",
                    compact && "text-xs"
                  )}>
                    {conv.lastMessage}
                  </p>
                )}
                
                {!isGroup(conv) && conv.customStatus && !conv.lastMessage && (
                  <p className="text-xs text-muted-foreground italic truncate">
                    {conv.customStatus}
                  </p>
                )}
              </>
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
              onConversationPin?.(conv.id, !conv.isPinned)
            }}
            aria-label={conv.isPinned ? 'Unpin conversation' : 'Pin conversation'}
          >
            <Pin 
              className={cn(
                "h-3 w-3",
                conv.isPinned && "fill-current text-brand"
              )}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onConversationMute?.(conv.id, !conv.isMuted)
            }}
            aria-label={conv.isMuted ? 'Unmute conversation' : 'Mute conversation'}
          >
            <BellOff className="h-3 w-3" />
          </Button>

          {onConversationArchive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onConversationArchive(conv.id)
              }}
              aria-label="Archive conversation"
            >
              <Archive className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
            }}
            aria-label="Conversation actions"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  // Sort conversations: pinned first, then by last message time
  const sortedConversations = React.useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      // Pinned conversations first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      
      // Then by last message time (most recent first)
      const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
      const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
      
      return bTime - aTime
    })
  }, [filteredConversations])

  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Search */}
      {searchable && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>
      )}
      
      {/* Conversation List */}
      <div className="space-y-1">
        {sortedConversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          </div>
        ) : (
          sortedConversations.map(renderConversation)
        )}
      </div>
      
      {/* Start New Conversation */}
      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start Conversation
        </Button>
      </div>
    </div>
  )
}

export { DMList, type DMUser, type DMGroup, type DMItem }
