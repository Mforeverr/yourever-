'use client'

import * as React from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ActivityFeed, type ActivityItem } from '@/components/ui/activity-feed'
import { KpiCard } from '@/components/ui/kpi-card'
import { PresenceAvatarGroup } from '@/components/ui/presence-avatar-group'
import { Skeleton } from '@/components/ui/skeleton'
import { useScope } from '@/contexts/scope-context'
import { useWorkspaceDashboardQuery } from '@/hooks/api/use-workspace-dashboard-query'
import { buildMockDashboardSummary } from '@/mocks/data/dashboard'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { cn } from '@/lib/utils'
import type { DashboardKpi, DashboardSummary } from '@/modules/workspace/types'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  MoreHorizontal,
  Pin,
  Plus,
  TrendingUp,
} from 'lucide-react'

const KPI_ICONS: Record<DashboardKpi['id'], React.ReactNode> = {
  onTrack: <CheckCircle className="h-5 w-5 text-green-500" />,
  stuck: <AlertCircle className="h-5 w-5 text-amber-500" />,
  overdue: <Clock className="h-5 w-5 text-red-500" />,
}

const mapKpiTrend = (direction: DashboardKpi['deltaDirection']) => {
  switch (direction) {
    case 'up':
      return 'up'
    case 'down':
      return 'down'
    default:
      return 'neutral'
  }
}

const buildActivityItems = (summary: DashboardSummary): ActivityItem[] =>
  summary.activity.map((item) => ({
    id: item.id,
    type: item.activityType,
    author: {
      name: item.author.name,
      avatar: item.author.avatar ?? undefined,
      role: item.author.role ?? undefined,
    },
    content: item.content,
    timestamp: item.occurredAt,
    tags: Array.isArray(item.metadata?.tags)
      ? (item.metadata?.tags as string[])
      : undefined,
    likes: undefined,
    comments: undefined,
    isLiked: false,
  }))

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const {
    currentOrgId,
    currentDivisionId,
    isReady: scopeReady,
  } = useScope()
  const dashboardApiEnabled = isFeatureEnabled('workspace.dashboard.api', true)
  const shouldFetch = dashboardApiEnabled && scopeReady && Boolean(currentOrgId)

  const {
    data,
    status,
    error,
    refetch,
    isFetching,
  } = useWorkspaceDashboardQuery(currentOrgId, currentDivisionId ?? null, {
    includeTemplates: true,
    enabled: shouldFetch,
  })

  const usingMockData = !dashboardApiEnabled || status === 'error'
  const summary = React.useMemo(
    () =>
      data ??
      buildMockDashboardSummary(currentOrgId ?? 'demo-org', currentDivisionId ?? null),
    [data, currentOrgId, currentDivisionId],
  )

  const activityItems = React.useMemo(() => buildActivityItems(summary), [summary])
  const showError = status === 'error' && dashboardApiEnabled
  const showSkeleton = status === 'pending' && shouldFetch
  const handleQuickAction = React.useCallback((kind: 'task' | 'project' | 'huddle') => {
    console.info('[dashboard] quick action selected', kind)
  }, [])

  if (!currentOrgId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Select an organization to view its dashboard insights.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl space-y-8 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor priorities, teammates, and workspace activity in one place.
            </p>
          </div>
          {usingMockData && (
            <Badge variant="outline" className="ml-auto">
              Sample data
            </Badge>
          )}
        </div>

        {showError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load live dashboard data</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                {error instanceof Error
                  ? error.message
                  : 'The dashboard service is temporarily unavailable. Showing starter content instead.'}
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {summary.hasTemplates && (
          <Alert className="border-dashed">
            <Pin className="h-4 w-4" />
            <AlertTitle>Replace the starter examples</AlertTitle>
            <AlertDescription>
              This workspace includes editable sample projects, docs, and activities. Update or delete them to make the dashboard
              yours.
            </AlertDescription>
          </Alert>
        )}

        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <React.Fragment>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {summary.kpis.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  title={kpi.label}
                  value={kpi.count}
                  icon={KPI_ICONS[kpi.id]}
                  change={
                    typeof kpi.delta === 'number'
                      ? {
                          value: `${kpi.delta > 0 ? '+' : ''}${kpi.delta}%`,
                          trend: mapKpiTrend(kpi.deltaDirection),
                        }
                      : undefined
                  }
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader className="flex items-center justify-between gap-4">
                    <CardTitle className="text-xl font-semibold">Quick actions</CardTitle>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <QuickActionButton
                      label="New task"
                      description="Capture a to-do"
                      onClick={() => handleQuickAction('task')}
                    />
                    <QuickActionButton
                      label="New project"
                      description="Plan milestones"
                      onClick={() => handleQuickAction('project')}
                    />
                    <QuickActionButton
                      label="Schedule huddle"
                      description="Align the team"
                      onClick={() => handleQuickAction('huddle')}
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl font-semibold">Recent activity</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Updates from projects, docs, and channels in this workspace.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isFetching && dashboardApiEnabled}
                      onClick={() => refetch()}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {activityItems.length === 0 ? (
                      <EmptyState message="No activity yet. Start collaborating to see updates here." />
                    ) : (
                      <ActivityFeed
                        activities={activityItems}
                        showActions={false}
                        loading={isFetching && dashboardApiEnabled && Boolean(data)}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Active teammates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {summary.presence.length === 0 ? (
                      <EmptyState message="Invite teammates to collaborate here." />
                    ) : (
                      <React.Fragment>
                        <PresenceAvatarGroup users={summary.presence} max={6} />
                        <ul className="space-y-2 text-sm">
                          {summary.presence.slice(0, 6).map((member) => (
                            <li key={member.id} className="flex items-center justify-between text-muted-foreground">
                              <span>{member.name}</span>
                              <span className="text-xs uppercase tracking-wide">
                                {member.status ?? 'offline'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </React.Fragment>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex items-center justify-between gap-4">
                    <CardTitle className="text-lg font-semibold">Pinned docs</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.docs.length === 0 ? (
                      <EmptyState message="Add docs to keep your team aligned." />
                    ) : (
                      summary.docs.slice(0, 5).map((doc) => (
                        <div key={doc.id} className="rounded-lg border border-border/70 p-3">
                          <p className="font-medium text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.summary ?? 'No description yet.'}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Recent projects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.projects.length === 0 ? (
                      <EmptyState message="Create a project to track milestones." />
                    ) : (
                      summary.projects.slice(0, 5).map((project) => (
                        <div key={project.id} className="rounded-lg border border-border/70 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {project.badgeCount} open
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function QuickActionButton({
  label,
  description,
  onClick,
}: {
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-2 rounded-lg border border-border/60 p-4 text-left transition-colors hover:border-primary hover:bg-muted'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{label}</span>
        <Plus className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}
