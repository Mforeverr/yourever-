'use client'

import * as React from 'react'
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Edit, 
  Share, 
  Star, 
  Download, 
  Upload,
  FolderPlus,
  FilePlus,
  Link,
  Archive,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Move,
  Tag,
  Clock,
  User,
  Users,
  GitBranch,
  History,
  Settings,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ExplorerItem } from '@/lib/explorer-data'
import { MessageSquare } from 'lucide-react'

interface ExplorerDropdownMenuProps {
  item: ExplorerItem
  onAction?: (action: string, item: ExplorerItem) => void
  trigger?: React.ReactNode
}

export function ExplorerDropdownMenu({ item, onAction, trigger }: ExplorerDropdownMenuProps) {
  const handleAction = (action: string) => {
    onAction?.(action, item)
  }

  const getBasicActions = () => (
    <>
      <DropdownMenuItem onClick={() => handleAction('open')}>
        <Eye className="mr-2 h-4 w-4" />
        Open
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction('edit')}>
        <Edit className="mr-2 h-4 w-4" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleAction('duplicate')}>
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </DropdownMenuItem>
    </>
  )

  const getShareActions = () => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Share className="mr-2 h-4 w-4" />
        Share
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => handleAction('share-link')}>
          <Link className="mr-2 h-4 w-4" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('share-email')}>
          <User className="mr-2 h-4 w-4" />
          Invite by Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('share-team')}>
          <Users className="mr-2 h-4 w-4" />
          Share with Team
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )

  const getActions = () => {
    switch (item.type) {
      case 'folder':
        return (
          <>
            {getBasicActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('new-folder')}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('new-file')}>
              <FilePlus className="mr-2 h-4 w-4" />
              New File
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {getShareActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('download')}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('archive')}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )
      
      case 'project':
        return (
          <>
            {getBasicActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('add-task')}>
              <FilePlus className="mr-2 h-4 w-4" />
              Add Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('assign-team')}>
              <Users className="mr-2 h-4 w-4" />
              Assign Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {getShareActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('view-history')}>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('export')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('archive')}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )
      
      case 'task':
        return (
          <>
            {getBasicActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('assign')}>
              <User className="mr-2 h-4 w-4" />
              Assign
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('set-priority')}>
              <Tag className="mr-2 h-4 w-4" />
              Set Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('set-status')}>
              <Clock className="mr-2 h-4 w-4" />
              Set Status
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('add-comment')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Comment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('view-history')}>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )
      
      case 'document':
        return (
          <>
            {getBasicActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('download')}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('duplicate')}>
              <Copy className="mr-2 h-4 w-4" />
              Make a Copy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {getShareActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('view-history')}>
              <History className="mr-2 h-4 w-4" />
              Version History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('lock')}>
              <Lock className="mr-2 h-4 w-4" />
              Lock
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )
      
      default:
        return (
          <>
            {getBasicActions()}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('download')}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('share')}>
              <Share className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('delete')} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {getActions()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Quick actions dropdown for toolbar
interface QuickActionsDropdownProps {
  onAction?: (action: string) => void
}

export function QuickActionsDropdown({ onAction }: QuickActionsDropdownProps) {
  const handleAction = (action: string) => {
    onAction?.(action)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal className="size-4 mr-2" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleAction('new-folder')}>
          <FolderPlus className="mr-2 h-4 w-4" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('new-file')}>
          <FilePlus className="mr-2 h-4 w-4" />
          New File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('upload')}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('import')}>
          <Download className="mr-2 h-4 w-4" />
          Import
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('export')}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleAction('refresh')}>
          <History className="mr-2 h-4 w-4" />
          Refresh
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}