'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ChevronDown, ChevronRight, Hash, Lock, Users, Star, Bell, BellOff } from "lucide-react"

interface SideBarProps {
  activePanel: string
  className?: string
  children?: React.ReactNode
}

interface ExplorerContentProps {
  className?: string
}

interface ChannelsContentProps {
  className?: string
}

interface CalendarContentProps {
  className?: string
}

function ExplorerContent({ className }: ExplorerContentProps) {
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['divisions', 'projects'])
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search workspace..." 
            className="pl-9 h-8 bg-surface-elevated border-border"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {/* Divisions */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('divisions')}
            >
              {expandedSections.includes('divisions') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Divisions
            </Button>
            {expandedSections.includes('divisions') && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Marketing</span>
                  <Badge variant="secondary" className="text-xs">3</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Product</span>
                  <Badge variant="secondary" className="text-xs">2</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Engineering</span>
                  <Badge variant="secondary" className="text-xs">5</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Projects */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('projects')}
            >
              {expandedSections.includes('projects') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Projects
            </Button>
            {expandedSections.includes('projects') && (
              <div className="ml-4 space-y-1">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Website Revamp</span>
                  <Badge variant="outline" className="text-xs">12</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Pricing Experiments</span>
                  <Badge variant="outline" className="text-xs">8</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Mobile App</span>
                  <Badge variant="outline" className="text-xs">15</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Docs */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('docs')}
            >
              {expandedSections.includes('docs') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              Documentation
            </Button>
            {expandedSections.includes('docs') && (
              <div className="ml-4 space-y-1">
                <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Getting Started</span>
                </div>
                <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">API Reference</span>
                </div>
                <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                  <span className="text-sm">Design System</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          New Project
        </Button>
      </div>
    </div>
  )
}

interface Channel {
  id: string
  name: string
  type: 'public' | 'private'
  isMuted: boolean
  isFavorite: boolean
  unreadCount: number
  memberCount?: number
}

interface User {
  id: string
  name: string
  status: 'online' | 'away' | 'offline'
  unreadCount?: number
}

function ChannelsContent({ className }: ChannelsContentProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['channels', 'dms'])

  // Mock data
  const channels: Channel[] = [
    { id: '1', name: 'general', type: 'public', isMuted: false, isFavorite: true, unreadCount: 5, memberCount: 24 },
    { id: '2', name: 'development', type: 'public', isMuted: false, isFavorite: true, unreadCount: 12, memberCount: 18 },
    { id: '3', name: 'design', type: 'public', isMuted: true, isFavorite: false, unreadCount: 0, memberCount: 8 },
    { id: '4', name: 'marketing', type: 'private', isMuted: false, isFavorite: false, unreadCount: 3, memberCount: 6 },
    { id: '5', name: 'random', type: 'public', isMuted: false, isFavorite: false, unreadCount: 28, memberCount: 32 },
  ]

  const users: User[] = [
    { id: '1', name: 'Sarah Chen', status: 'online', unreadCount: 2 },
    { id: '2', name: 'Mike Johnson', status: 'online', unreadCount: 0 },
    { id: '3', name: 'Emily Davis', status: 'away', unreadCount: 0 },
    { id: '4', name: 'Tom Wilson', status: 'offline', unreadCount: 1 },
  ]

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const toggleFavorite = (channelId: string) => {
    // This would update the channel in state
    console.log('Toggle favorite:', channelId)
  }

  const toggleMute = (channelId: string) => {
    // This would update the channel in state
    console.log('Toggle mute:', channelId)
  }

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFavorites = !showFavoritesOnly || channel.isFavorite
    return matchesSearch && matchesFavorites
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search channels..." 
            className="pl-9 h-8 bg-surface-elevated border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant={showFavoritesOnly ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={cn("size-3 mr-1", showFavoritesOnly && "fill-current")} />
            Favorites
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          {/* Channels */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('channels')}
            >
              {expandedSections.includes('channels') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              CHANNELS
            </Button>
            {expandedSections.includes('channels') && (
              <div className="space-y-1">
                {filteredChannels.map(channel => {
                  const Icon = channel.type === 'private' ? Lock : Hash
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer group"
                      onClick={() => router.push(`/c/${channel.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-muted-foreground" />
                        <span className="text-sm">{channel.name}</span>
                        {channel.isFavorite && <Star className="size-3 fill-current text-yellow-500" />}
                        {channel.isMuted && <BellOff className="size-3 text-muted-foreground" />}
                      </div>
                      <div className="flex items-center gap-1">
                        {channel.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {channel.unreadCount}
                          </Badge>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(channel.id)
                            }}
                          >
                            <Star className={cn("size-3", channel.isFavorite && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMute(channel.id)
                            }}
                          >
                            {channel.isMuted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 px-2"
              onClick={() => toggleSection('dms')}
            >
              {expandedSections.includes('dms') ? (
                <ChevronDown className="size-4 mr-1" />
              ) : (
                <ChevronRight className="size-4 mr-1" />
              )}
              DIRECT MESSAGES
            </Button>
            {expandedSections.includes('dms') && (
              <div className="space-y-1">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                    onClick={() => router.push(`/dm/${user.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", getStatusColor(user.status))} />
                      <span className="text-sm">{user.name}</span>
                    </div>
                    {user.unreadCount && user.unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {user.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-2 border-t border-border space-y-2">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="size-4 mr-2" />
          Add Channel
        </Button>
        <Button variant="ghost" size="sm" className="w-full">
          <Users className="size-4 mr-2" />
          Invite People
        </Button>
      </div>
    </div>
  )
}

function CalendarContent({ className }: CalendarContentProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium">Calendar</h3>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-3">
          <div className="text-center p-3 bg-surface-elevated rounded-lg">
            <div className="text-lg font-bold">November 2024</div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">TODAY</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-brand/10 border border-brand/20">
                <div className="text-sm font-medium">Weekly Standup</div>
                <div className="text-xs text-muted-foreground">10:00 AM - 10:30 AM</div>
              </div>
              <div className="p-2 rounded-lg bg-surface-elevated">
                <div className="text-sm font-medium">Design Review</div>
                <div className="text-xs text-muted-foreground">2:00 PM - 3:00 PM</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground px-2 py-1">UPCOMING</div>
            <div className="space-y-2">
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <div className="text-sm font-medium">Sprint Planning</div>
                <div className="text-xs text-muted-foreground">Tomorrow, 9:00 AM</div>
              </div>
              <div className="p-2 rounded-lg hover:bg-accent/50 cursor-pointer">
                <div className="text-sm font-medium">Client Presentation</div>
                <div className="text-xs text-muted-foreground">Nov 15, 3:00 PM</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function SideBar({ activePanel, className }: SideBarProps) {
  const renderContent = () => {
    switch (activePanel) {
      case 'explorer':
        return <ExplorerContent />
      case 'channels':
        return <ChannelsContent />
      case 'calendar':
        return <CalendarContent />
      default:
        return <ExplorerContent />
    }
  }

  return (
    <div className={cn(
      "w-64 h-full bg-surface-panel border-r border-border flex flex-col",
      className
    )}>
      {renderContent()}
    </div>
  )
}

export { SideBar, ExplorerContent, ChannelsContent, CalendarContent }