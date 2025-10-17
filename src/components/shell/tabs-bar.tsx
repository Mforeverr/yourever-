'use client'

import * as React from "react"
import { X, Plus, Split, RefreshCcw, Copy, Pin, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { UITab } from "@/state/ui.store"

interface TabsBarProps {
  tabs: UITab[]
  activeTabId?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onTabReload?: (tabId: string) => void
  onTabDuplicate?: (tabId: string) => void
  onTabPinToggle?: (tabId: string) => void
  onCloseAllTabs?: () => void
  onNewTab?: () => void
  onSplitView?: (tabId: string) => void
  className?: string
}

function TabsBar({ 
  tabs, 
  activeTabId, 
  onTabChange, 
  onTabClose, 
  onNewTab,
  onTabReload,
  onTabDuplicate,
  onTabPinToggle,
  onCloseAllTabs,
  onSplitView,
  className
}: TabsBarProps) {

  const getTabIcon = (type: UITab['type']) => {
    switch (type) {
      case 'task': return '📋'
      case 'project': return '📁'
      case 'doc': return '📄'
      case 'channel': return '#'
      case 'calendar': return '📅'
      case 'timeline': return '📊'
      default: return '📄'
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex items-center gap-1 h-12 bg-surface-panel border-b border-border px-2 overflow-x-auto",
        className
      )}>
        {tabs.map((tab) => (
          <ContextMenu key={tab.id}>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all min-w-0 max-w-48 border border-transparent",
                  tab.isActive
                    ? "bg-surface-elevated shadow-sm border-border"
                    : "hover:bg-accent/50"
                )}
                onClick={() => onTabChange?.(tab.id)}
              >
                <span className="text-sm">{getTabIcon(tab.type)}</span>
                <span className="text-sm font-medium truncate">{tab.title}</span>
                {tab.isPinned && (
                  <Pin className="size-3 text-muted-foreground" />
                )}
                {tab.isDirty && (
                  <div className="size-2 rounded-full bg-brand"></div>
                )}
                {tab.isSplit && (
                  <div className="size-2 rounded-sm bg-primary"></div>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSplitView?.(tab.id)
                        }}
                      >
                        <Split className={cn("size-3 transition-colors", tab.isSplit ? "text-primary" : undefined)} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tab.isSplit ? "Exit Split View" : "Split View"}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTabClose?.(tab.id)
                        }}
                      >
                        <X className="size-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close Tab</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onTabReload?.(tab.id)
                }}
              >
                <RefreshCcw className="mr-2 size-4" /> Reload
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onTabDuplicate?.(tab.id)
                }}
              >
                <Copy className="mr-2 size-4" /> Duplicate
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onTabPinToggle?.(tab.id)
                }}
              >
                {tab.isPinned ? (
                  <PinOff className="mr-2 size-4" />
                ) : (
                  <Pin className="mr-2 size-4" />
                )}
                {tab.isPinned ? "Unpin Tab" : "Pin Tab"}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onTabClose?.(tab.id)
                }}
              >
                <X className="mr-2 size-4" /> Close Tab
              </ContextMenuItem>
              <ContextMenuItem
                className="text-destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onCloseAllTabs?.()
                }}
              >
                <X className="mr-2 size-4" /> Close All Tabs
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={onNewTab}
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New Tab</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export { TabsBar }
