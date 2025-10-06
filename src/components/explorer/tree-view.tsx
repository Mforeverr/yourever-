'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Folder, FolderOpen, File, FolderKanban, CheckSquare, FileText, Users, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExplorerItem, getUserById, getUsersByIds } from '@/lib/explorer-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Progress } from '@/components/ui/progress'
import { PresenceAvatarGroup } from '@/components/ui/presence-avatar-group'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { ExplorerDropdownMenu } from '@/components/explorer/explorer-dropdown'

interface TreeNodeProps {
  item: ExplorerItem
  level: number
  isExpanded: boolean
  isSelected: boolean
  onToggle: (id: string) => void
  onSelect: (item: ExplorerItem) => void
  searchTerm: string
}

export function TreeNode({ item, level, isExpanded, isSelected, onToggle, onSelect, searchTerm }: TreeNodeProps) {
  const hasChildren = item.children && item.children.length > 0
  const isHighlighted = searchTerm && item.name.toLowerCase().includes(searchTerm.toLowerCase())

  const getItemIcon = (type: string, isExpanded: boolean) => {
    switch (type) {
      case 'folder':
        return isExpanded ? <FolderOpen className="size-4" /> : <Folder className="size-4" />
      case 'project':
        return <FolderKanban className="size-4" />
      case 'task':
        return <CheckSquare className="size-4" />
      case 'document':
        return <FileText className="size-4" />
      case 'user':
        return <Users className="size-4" />
      default:
        return <File className="size-4" />
    }
  }

  const getItemMetadata = (item: ExplorerItem) => {
    const { metadata } = item
    
    if (item.type === 'project') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={metadata.progress} className="w-12 h-1" />
          <span>{metadata.progress}%</span>
          {metadata.assigneeIds && (
            <PresenceAvatarGroup 
              users={getUsersByIds(metadata.assigneeIds)} 
              max={3}
            />
          )}
        </div>
      )
    }
    
    if (item.type === 'task') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={metadata.status} />
          <PriorityBadge priority={metadata.priority} />
          {metadata.assigneeId && (
            <span>{getUserById(metadata.assigneeId)?.name}</span>
          )}
        </div>
      )
    }
    
    if (item.type === 'document') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{metadata.fileType?.toUpperCase()}</span>
          <span>{metadata.size}</span>
        </div>
      )
    }
    
    if (item.type === 'folder') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata.memberCount && (
            <>
              <Users className="size-3" />
              <span>{metadata.memberCount}</span>
            </>
          )}
          {metadata.count && (
            <span>{metadata.count} items</span>
          )}
        </div>
      )
    }
    
    return null
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggle(item.id)
    }
  }

  const handleSelect = () => {
    onSelect(item)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1 rounded-sm cursor-pointer hover:bg-accent/50 transition-colors",
            isSelected && "bg-accent",
            isHighlighted && "bg-yellow-100/50 dark:bg-yellow-900/20"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={handleSelect}
        >
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleToggle}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />
            ) : (
              <div className="size-3" />
            )}
          </Button>

          {/* Item Icon */}
          <div className="flex items-center justify-center w-4 h-4 text-muted-foreground">
            {getItemIcon(item.type, isExpanded)}
          </div>

          {/* Item Name */}
          <span className="flex-1 text-sm truncate">{item.name}</span>

          {/* Metadata */}
          <div className="flex items-center gap-1">
            {getItemMetadata(item)}
          </div>

          {/* Actions */}
          <ExplorerDropdownMenu 
            item={item}
            onAction={(action, item) => {
              console.log('Action:', action, 'Item:', item)
            }}
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem>Open</ContextMenuItem>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuItem>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

interface TreeViewProps {
  data: ExplorerItem[]
  expandedItems: Set<string>
  selectedItem: ExplorerItem | null
  onToggle: (id: string) => void
  onSelect: (item: ExplorerItem) => void
  searchTerm: string
  level?: number
}

export function TreeView({ 
  data, 
  expandedItems, 
  selectedItem, 
  onToggle, 
  onSelect, 
  searchTerm,
  level = 0 
}: TreeViewProps) {
  const renderTree = (items: ExplorerItem[], currentLevel: number) => {
    return items.map((item) => {
      const isExpanded = expandedItems.has(item.id)
      const isSelected = selectedItem?.id === item.id
      const hasChildren = item.children && item.children.length > 0

      return (
        <div key={item.id}>
          <TreeNode
            item={item}
            level={currentLevel}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggle={onToggle}
            onSelect={onSelect}
            searchTerm={searchTerm}
          />
          {hasChildren && isExpanded && (
            <div>
              {renderTree(item.children!, currentLevel + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="py-1">
      {renderTree(data, level)}
    </div>
  )
}