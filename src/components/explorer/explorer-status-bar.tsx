'use client'

import * as React from 'react'
import { useExplorer } from '@/contexts/explorer-context'
import { mockExplorerData } from '@/lib/explorer-data'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Folder, File, FolderKanban, CheckSquare, FileText, Users } from 'lucide-react'

export function ExplorerStatusBar() {
  const { selectedItem, searchTerm, filterType } = useExplorer()

  const getItemCount = () => {
    // Count items from the mock data
    let total = 0
    let folders = 0
    let projects = 0
    let tasks = 0
    let documents = 0

    const countItems = (items: any[]) => {
      for (const item of items) {
        total++
        switch (item.type) {
          case 'folder':
            folders++
            break
          case 'project':
            projects++
            break
          case 'task':
            tasks++
            break
          case 'document':
            documents++
            break
        }
        if (item.children) {
          countItems(item.children)
        }
      }
    }

    countItems(mockExplorerData)
    
    return {
      total,
      folders,
      projects,
      tasks,
      documents
    }
  }

  const counts = getItemCount()

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {/* Item counts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <File className="size-3" />
            <span>{counts.total} items</span>
          </div>
          
          <Separator orientation="vertical" className="h-4" />
          
          <div className="flex items-center gap-1">
            <Folder className="size-3" />
            <span>{counts.folders}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <FolderKanban className="size-3" />
            <span>{counts.projects}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <CheckSquare className="size-3" />
            <span>{counts.tasks}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <FileText className="size-3" />
            <span>{counts.documents}</span>
          </div>
        </div>

        {/* Active filters */}
        {(searchTerm || filterType !== 'all') && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {filterType !== 'all' && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {filterType}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>

      {/* Selected item info */}
      {selectedItem && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Selected:</span>
          <Badge variant="outline" className="text-xs">
            {selectedItem.name}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {selectedItem.type}
          </Badge>
        </div>
      )}
    </div>
  )
}