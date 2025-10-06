"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LayoutGrid,
  List,
  GanttChart,
  Calendar,
  GitBranch,
  FileText
} from "lucide-react"

// Import workspace views
import { BoardView } from "@/components/workspace/board-view"
import { ListView } from "@/components/workspace/list-view"
import { TimelineView } from "@/components/workspace/timeline-view"
import { CalendarView } from "@/components/workspace/calendar-view"
import { MindMapView } from "@/components/workspace/mindmap-view"
import { DocsView } from "@/components/workspace/docs-view"

type ViewType = "board" | "list" | "timeline" | "calendar" | "mindmap" | "docs"

const views = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "mindmap", label: "Mindmap", icon: GitBranch },
  { id: "docs", label: "Docs", icon: FileText },
] as const

export default function WorkspacePage() {
  const [activeView, setActiveView] = React.useState<ViewType>("board")

  const renderActiveView = () => {
    switch (activeView) {
      case "board":
        return <BoardView />
      case "list":
        return <ListView />
      case "timeline":
        return <TimelineView />
      case "calendar":
        return <CalendarView />
      case "mindmap":
        return <MindMapView />
      case "docs":
        return <DocsView />
      default:
        return <BoardView />
    }
  }

  const currentView = views.find(view => view.id === activeView)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Workspace</h1>
            <p className="text-muted-foreground">Manage your projects and tasks</p>
          </div>
        </div>

        {/* View Menu */}
        <div className="flex items-center gap-2">
          {views.map((view) => {
            const Icon = view.icon
            return (
              <Button
                key={view.id}
                variant={activeView === view.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "justify-start gap-2 h-auto p-3",
                  activeView === view.id && "bg-brand text-brand-foreground"
                )}
                onClick={() => setActiveView(view.id as ViewType)}
              >
                <Icon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{view.label}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {renderActiveView()}
      </div>
    </div>
  )
}