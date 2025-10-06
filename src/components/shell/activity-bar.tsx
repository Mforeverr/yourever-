'use client'

import * as React from "react"
import {
  Folder,
  MessageSquare,
  Calendar,
  Users,
  Settings,
  Search,
  Plus,
  Home,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Bot
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ActivityBarProps {
  activeItem?: string
  onItemChange?: (item: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

const activityItems = [
  { id: 'home', icon: Home, label: 'Dashboard' },
  { id: 'workspace', icon: LayoutGrid, label: 'Workspace' },
  { id: 'explorer', icon: Folder, label: 'Explorer' },
  { id: 'ai', icon: Bot, label: 'Yourever AI' },
  { id: 'channels', icon: MessageSquare, label: 'Channels & Chat' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'people', icon: Users, label: 'People' },
  { id: 'admin', icon: Settings, label: 'Admin' },
  { id: 'search', icon: Search, label: 'Search' },
]

function ActivityBar({ activeItem = 'home', onItemChange, isCollapsed = false, onToggleCollapse, className }: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex flex-col items-center gap-2 h-full bg-surface-panel border-r border-border",
        isCollapsed ? "w-12" : "w-16",
        className
      )}>
        <div className="flex flex-col items-center gap-1 p-2">
          {activityItems.map((item) => {
            const Icon = item.icon
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeItem === item.id ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "rounded-lg",
                      isCollapsed ? "h-8 w-8" : "h-10 w-10",
                      activeItem === item.id && "bg-brand"
                    )}
                    onClick={() => onItemChange?.(item.id)}
                  >
                    <Icon className={cn(isCollapsed ? "size-4" : "size-5")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        
        <div className="mt-auto flex flex-col gap-1 p-2">
          {/* Collapse Toggle */}
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-lg",
                    isCollapsed ? "h-8 w-8" : "h-10 w-10"
                  )}
                  onClick={onToggleCollapse}
                >
                  {isCollapsed ? (
                    <ChevronRight className={cn("size-4")} />
                  ) : (
                    <ChevronLeft className={cn("size-4")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-lg",
                  isCollapsed ? "h-8 w-8" : "h-10 w-10"
                )}
              >
                <Plus className={cn(isCollapsed ? "size-4" : "size-5")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Quick Add</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}

export { ActivityBar }