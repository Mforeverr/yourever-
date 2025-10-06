'use client'

import * as React from 'react'
import { Grid3X3, List, Folder, FolderKanban, CheckSquare, FileText, Users, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExplorerItem, getUserById, getUsersByIds } from '@/lib/explorer-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PresenceAvatarGroup } from '@/components/ui/presence-avatar-group'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { ExplorerDropdownMenu } from '@/components/explorer/explorer-dropdown'

interface GridViewProps {
  items: ExplorerItem[]
  selectedItem: ExplorerItem | null
  onSelect: (item: ExplorerItem) => void
  searchTerm: string
}

export function GridView({ items, selectedItem, onSelect, searchTerm }: GridViewProps) {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <Folder className="size-8" />
      case 'project':
        return <FolderKanban className="size-8" />
      case 'task':
        return <CheckSquare className="size-8" />
      case 'document':
        return <FileText className="size-8" />
      case 'user':
        return <Users className="size-8" />
      default:
        return <FileText className="size-8" />
    }
  }

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'folder':
        return 'text-blue-500'
      case 'project':
        return 'text-purple-500'
      case 'task':
        return 'text-green-500'
      case 'document':
        return 'text-orange-500'
      case 'user':
        return 'text-pink-500'
      default:
        return 'text-gray-500'
    }
  }

  const getItemMetadata = (item: ExplorerItem) => {
    const { metadata } = item
    
    if (item.type === 'project') {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span>{metadata.progress}%</span>
          </div>
          <Progress value={metadata.progress} className="h-1" />
          <div className="flex items-center gap-2">
            <StatusBadge status={metadata.status} />
            <PriorityBadge priority={metadata.priority} />
          </div>
          {metadata.assigneeIds && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Team:</span>
              <PresenceAvatarGroup 
                users={getUsersByIds(metadata.assigneeIds)} 
                max={3}
              />
            </div>
          )}
        </div>
      )
    }
    
    if (item.type === 'task') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={metadata.status} />
            <PriorityBadge priority={metadata.priority} />
          </div>
          {metadata.assigneeId && (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs">
                  {getUserById(metadata.assigneeId)?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{getUserById(metadata.assigneeId)?.name}</span>
            </div>
          )}
          {metadata.storyPoints && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Story points:</span>
              <Badge variant="secondary" className="text-xs">{metadata.storyPoints}</Badge>
            </div>
          )}
        </div>
      )
    }
    
    if (item.type === 'document') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{metadata.fileType?.toUpperCase()}</span>
            <span>•</span>
            <span>{metadata.size}</span>
          </div>
          {metadata.authorId && (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs">
                  {getUserById(metadata.authorId)?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{getUserById(metadata.authorId)?.name}</span>
            </div>
          )}
        </div>
      )
    }
    
    if (item.type === 'folder') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {metadata.memberCount && (
              <>
                <Users className="size-3" />
                <span>{metadata.memberCount} members</span>
              </>
            )}
            {metadata.count && (
              <>
                <span>•</span>
                <span>{metadata.count} items</span>
              </>
            )}
          </div>
          {metadata.head && (
            <div className="text-xs text-muted-foreground">
              Lead: {metadata.head}
            </div>
          )}
        </div>
      )
    }
    
    return null
  }

  const isHighlighted = (item: ExplorerItem) => {
    return searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase())
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <ContextMenu key={item.id}>
            <ContextMenuTrigger>
              <Card 
                className={cn(
                  "cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]",
                  selectedItem?.id === item.id && "ring-2 ring-primary",
                  isHighlighted(item) && "ring-2 ring-yellow-400"
                )}
                onClick={() => onSelect(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg bg-muted", getItemTypeColor(item.type))}>
                      {getItemIcon(item.type)}
                    </div>
                    <ExplorerDropdownMenu 
                      item={item}
                      onAction={(action, item) => {
                        console.log('Action:', action, 'Item:', item)
                      }}
                    />
                  </div>
                  <CardTitle className="text-sm font-medium truncate">{item.name}</CardTitle>
                  <CardDescription className="text-xs capitalize">{item.type}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {getItemMetadata(item)}
                </CardContent>
              </Card>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Open</ContextMenuItem>
              <ContextMenuItem>Rename</ContextMenuItem>
              <ContextMenuItem>Duplicate</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>
    </div>
  )
}

interface ListViewProps {
  items: ExplorerItem[]
  selectedItem: ExplorerItem | null
  onSelect: (item: ExplorerItem) => void
  searchTerm: string
}

export function ListView({ items, selectedItem, onSelect, searchTerm }: ListViewProps) {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <Folder className="size-4" />
      case 'project':
        return <FolderKanban className="size-4" />
      case 'task':
        return <CheckSquare className="size-4" />
      case 'document':
        return <FileText className="size-4" />
      case 'user':
        return <Users className="size-4" />
      default:
        return <FileText className="size-4" />
    }
  }

  const getItemMetadata = (item: ExplorerItem) => {
    const { metadata } = item
    
    if (item.type === 'project') {
      return (
        <div className="flex items-center gap-4">
          <Progress value={metadata.progress} className="w-16 h-1" />
          <span className="text-xs text-muted-foreground">{metadata.progress}%</span>
          <StatusBadge status={metadata.status} />
          <PriorityBadge priority={metadata.priority} />
          {metadata.assigneeIds && (
            <PresenceAvatarGroup 
              users={getUsersByIds(metadata.assigneeIds)} 
              max={2}
            />
          )}
        </div>
      )
    }
    
    if (item.type === 'task') {
      return (
        <div className="flex items-center gap-4">
          <StatusBadge status={metadata.status} />
          <PriorityBadge priority={metadata.priority} />
          {metadata.assigneeId && (
            <span className="text-xs text-muted-foreground">{getUserById(metadata.assigneeId)?.name}</span>
          )}
          {metadata.storyPoints && (
            <Badge variant="secondary" className="text-xs">{metadata.storyPoints}sp</Badge>
          )}
        </div>
      )
    }
    
    if (item.type === 'document') {
      return (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{metadata.fileType?.toUpperCase()}</span>
          <span>{metadata.size}</span>
          {metadata.authorId && <span>{getUserById(metadata.authorId)?.name}</span>}
        </div>
      )
    }
    
    if (item.type === 'folder') {
      return (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {metadata.memberCount && <span>{metadata.memberCount} members</span>}
          {metadata.count && <span>{metadata.count} items</span>}
          {metadata.head && <span>Lead: {metadata.head}</span>}
        </div>
      )
    }
    
    return null
  }

  const isHighlighted = (item: ExplorerItem) => {
    return searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase())
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left">
            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Details</th>
            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Modified</th>
            <th className="px-4 py-3 text-sm font-medium text-muted-foreground w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr 
              key={item.id}
              className={cn(
                "border-b border-border hover:bg-accent/50 cursor-pointer transition-colors",
                selectedItem?.id === item.id && "bg-accent",
                isHighlighted(item) && "bg-yellow-100/50 dark:bg-yellow-900/20"
              )}
              onClick={() => onSelect(item)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {getItemIcon(item.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.path}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="text-xs capitalize">
                  {item.type}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {getItemMetadata(item)}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {item.updatedAt.toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <ExplorerDropdownMenu 
                  item={item}
                  onAction={(action, item) => {
                    console.log('Action:', action, 'Item:', item)
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}