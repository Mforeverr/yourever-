'use client'

import * as React from "react"
import { ExplorerView } from "@/components/explorer/explorer-view"
import { Button } from "@/components/ui/button"
import { Plus, FolderPlus, FilePlus, Upload } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuickActionsDropdown } from "@/components/explorer/explorer-dropdown"

export default function ExplorerPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Explorer Header */}
      <div className="p-4 border-b border-border bg-surface-panel">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">File Explorer</h1>
            <p className="text-sm text-muted-foreground">Browse and manage your files</p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FolderPlus className="size-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FilePlus className="size-4 mr-2" />
                  New Document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Upload className="size-4 mr-2" />
                  Upload Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <QuickActionsDropdown />
          </div>
        </div>
      </div>

      {/* Explorer Content */}
      <div className="flex-1 overflow-hidden">
        <ExplorerView />
      </div>
    </div>
  )
}