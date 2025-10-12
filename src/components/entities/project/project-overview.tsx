'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PROJECT_I18N_KEYS } from "@/modules/projects"
import type { ProjectDetailResponse } from "@/modules/projects"
import { enMessages } from "@/locales/en"

const messages = enMessages

interface ProjectOverviewProps {
  project: ProjectDetailResponse["project"]
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {messages[PROJECT_I18N_KEYS.overview.goalsTitle]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {project.overview.goals.length === 0 ? (
            <p>{messages[PROJECT_I18N_KEYS.overview.emptyState]}</p>
          ) : (
            project.overview.goals.map((goal, index) => (
              <div key={goal} className="flex items-start gap-2">
                <Badge variant="outline">{index + 1}</Badge>
                <p className="leading-relaxed text-foreground">{goal}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {messages[PROJECT_I18N_KEYS.overview.outcomesTitle]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {project.overview.outcomes.length === 0 ? (
            <p>{messages[PROJECT_I18N_KEYS.overview.emptyState]}</p>
          ) : (
            project.overview.outcomes.map((outcome, index) => (
              <div key={outcome} className="flex items-start gap-2">
                <Badge variant="secondary">{index + 1}</Badge>
                <p className="leading-relaxed text-foreground">{outcome}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {messages[PROJECT_I18N_KEYS.overview.metricsTitle]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="rounded-md border border-border/70 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {messages[PROJECT_I18N_KEYS.overview.healthLabel]}
              </p>
              <p className="text-sm font-semibold capitalize text-foreground">{project.metrics?.health ?? "unknown"}</p>
            </div>
            {typeof project.metrics?.budgetUsedPercent === "number" && (
            <div className="rounded-md border border-border/70 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {messages[PROJECT_I18N_KEYS.overview.budgetUsedLabel]}
              </p>
                <p className="text-sm font-semibold text-foreground">{project.metrics.budgetUsedPercent}%</p>
              </div>
            )}
          </div>

          {project.metrics?.riskNotes && (
            <>
              <Separator />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {messages[PROJECT_I18N_KEYS.overview.riskNotesLabel]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{project.metrics.riskNotes}</p>
              </div>
            </>
          )}

          {project.metrics?.scorecards && project.metrics.scorecards.length > 0 && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {project.metrics.scorecards.map((scorecard) => (
                  <div
                    key={scorecard.id}
                    className="rounded-md border border-border/70 bg-muted/40 px-4 py-3 shadow-sm"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{scorecard.label}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {scorecard.value}
                      {scorecard.unit ? <span className="ml-1 text-sm text-muted-foreground">{scorecard.unit}</span> : null}
                    </p>
                    {typeof scorecard.target === "number" && (
                      <p className="text-xs text-muted-foreground">Target: {scorecard.target}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
