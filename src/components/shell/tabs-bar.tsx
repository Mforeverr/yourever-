'use client'

import * as React from "react"
import { PanelBottom, PanelLeft, PanelRight, PanelTop, X, Plus, Split, RefreshCcw, Copy, Pin, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import type { TabPaneId, TabSplitDirection, UITab } from "@/state/ui.store"

interface TabsBarProps {
  tabs: UITab[]
  activeTabId?: string
  paneId: TabPaneId
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onTabReload?: (tabId: string) => void
  onTabDuplicate?: (tabId: string) => void
  onTabPinToggle?: (tabId: string) => void
  onCloseAllTabs?: () => void
  onNewTab?: (paneId: TabPaneId) => void
  onSplitView?: (tabId: string, direction?: TabSplitDirection) => void
  className?: string
}

function TabsBar({
  tabs,
  activeTabId,
  paneId,
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

  const formatSplitTooltip = (tab: UITab) => {
    if (tab.paneId === "secondary") {
      return "Close Split View"
    }

    if (!tab.isSplit) {
      return "Split View"
    }

    if (!tab.splitDirection) {
      return "Exit Split View"
    }

    const directionLabel = tab.splitDirection.charAt(0).toUpperCase() + tab.splitDirection.slice(1)
    return `Exit Split (${directionLabel})`
  }

  const handleSplitSelect = (
    event: Event,
    tabId: string,
    direction: TabSplitDirection
  ) => {
    event.preventDefault()
    event.stopPropagation()
    onSplitView?.(tabId, direction)
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
                      <p>{formatSplitTooltip(tab)}</p>
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
                <ContextMenuSub>
                  <ContextMenuSubTrigger disabled={tab.paneId === "secondary"}>
                    <Split className="mr-2 size-4" /> Split
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem
                      disabled={tab.paneId === "secondary"}
                      onSelect={(event) => handleSplitSelect(event, tab.id, "up")}
                    >
                      <PanelTop className="mr-2 size-4" /> Split Up
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={tab.paneId === "secondary"}
                      onSelect={(event) => handleSplitSelect(event, tab.id, "down")}
                    >
                      <PanelBottom className="mr-2 size-4" /> Split Down
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={tab.paneId === "secondary"}
                      onSelect={(event) => handleSplitSelect(event, tab.id, "left")}
                    >
                      <PanelLeft className="mr-2 size-4" /> Split Left
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={tab.paneId === "secondary"}
                      onSelect={(event) => handleSplitSelect(event, tab.id, "right")}
                    >
                      <PanelRight className="mr-2 size-4" /> Split Right
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              <ContextMenuSeparator />
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
              onClick={() => onNewTab?.(paneId)}
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
