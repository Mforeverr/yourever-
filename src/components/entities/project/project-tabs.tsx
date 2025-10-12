'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { LayoutGrid, CheckSquare, Calendar, FileText, Settings } from "lucide-react"
import { PROJECT_I18N_KEYS } from "@/modules/projects"
import { enMessages } from "@/locales/en"
import { type ReactNode } from "react"

const messages = enMessages

export type ProjectTabKey = "overview" | "tasks" | "timeline" | "docs" | "settings"

const tabConfig: Record<
  ProjectTabKey,
  {
    label: string
    icon: typeof LayoutGrid
    badge?: number
  }
> = {
  overview: { label: messages[PROJECT_I18N_KEYS.tabs.overview], icon: LayoutGrid },
  tasks: { label: messages[PROJECT_I18N_KEYS.tabs.tasks], icon: CheckSquare },
  timeline: { label: messages[PROJECT_I18N_KEYS.tabs.timeline], icon: Calendar },
  docs: { label: messages[PROJECT_I18N_KEYS.tabs.docs], icon: FileText },
  settings: { label: messages[PROJECT_I18N_KEYS.tabs.settings], icon: Settings },
}

interface ProjectTabsProps {
  activeTab: ProjectTabKey
  onChange: (tab: ProjectTabKey) => void
  counts?: Partial<Record<ProjectTabKey, number>>
  rightSlot?: ReactNode
}

export function ProjectTabs({ activeTab, onChange, counts, rightSlot }: ProjectTabsProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 px-6">
      <Tabs value={activeTab} onValueChange={(value) => onChange(value as ProjectTabKey)} className="w-full">
        <TabsList className="h-10 bg-transparent">
          {(Object.keys(tabConfig) as ProjectTabKey[]).map((key) => {
            const { label, icon: Icon } = tabConfig[key]
            const count = counts?.[key]
            return (
              <TabsTrigger
                key={key}
                value={key}
                className={cn(
                  "data-[state=active]:bg-brand data-[state=active]:text-brand-foreground",
                  "px-4 py-2 text-sm font-medium"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
                {typeof count === "number" && (
                  <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>
      {rightSlot}
    </div>
  )
}
