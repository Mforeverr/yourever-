"use client"

import * as React from "react"
import { useScope } from "@/contexts/scope-context"
import {
  FocusWidgetsModule,
  MentionsApprovalsModule,
  MyTasksModule,
  PinnedProjectsModule,
  TodayPlanModule,
} from "@/components/workspace/workbench"
import { Badge } from "@/components/ui/badge"

export default function WorkspacePage() {
  const { currentDivision, currentOrganization } = useScope()

  const headline = currentDivision
    ? `${currentDivision.name} workbench`
    : "My workbench"

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface-panel/60 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</p>
            <h1 className="text-2xl font-bold text-foreground">{headline}</h1>
            <p className="text-sm text-muted-foreground">
              Everything assigned to you across {currentOrganization?.name ?? "your organization"}.
            </p>
          </div>
          {currentDivision && (
            <Badge variant="outline" className="self-start md:self-center">
              {currentDivision.name}
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-6">
              <MyTasksModule />
              <MentionsApprovalsModule />
              <FocusWidgetsModule />
            </div>
            <div className="flex flex-col gap-6">
              <PinnedProjectsModule />
              <TodayPlanModule />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
