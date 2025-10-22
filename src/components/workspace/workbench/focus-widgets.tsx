'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useScope } from '@/contexts/scope-context'
import { useMockWorkspaceStore, filterTasksByScope } from '@/mocks/data/workspace'
import { AlertCircle, Flag, Zap } from 'lucide-react'

const focusIcons = {
  due: <AlertCircle className="h-4 w-4 text-amber-500" />,
  blocked: <Flag className="h-4 w-4 text-red-500" />,
  velocity: <Zap className="h-4 w-4 text-brand" />,
}

export function FocusWidgetsModule() {
  const { currentOrgId, currentDivisionId } = useScope()
  const tasks = useMockWorkspaceStore((state) => state.tasks)

  const scopedTasks = React.useMemo(
    () => filterTasksByScope(tasks, currentOrgId, currentDivisionId),
    [tasks, currentOrgId, currentDivisionId]
  )

  const totals = React.useMemo(() => {
    const total = scopedTasks.length
    const highPriority = scopedTasks.filter((task) => task.priority === 'Urgent' || task.priority === 'High').length
    const mediumOrLess = total - highPriority
    return { total, highPriority, mediumOrLess }
  }, [scopedTasks])

  const focusCards = [
    {
      id: 'due',
      title: 'High-priority tasks',
      description: 'Items to resolve first',
      value: totals.highPriority,
      total: totals.total || 1,
    },
    {
      id: 'blocked',
      title: 'Remaining workload',
      description: 'Medium & low priority tasks',
      value: totals.mediumOrLess,
      total: totals.total || 1,
    },
    {
      id: 'velocity',
      title: 'Focus score',
      description: 'Completed tasks this week',
      value: Math.min(100, totals.highPriority * 12 + 24),
      total: 100,
    },
  ]

  return (
    <Card className="border-border/80 bg-surface-panel/60 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Focus Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {focusCards.map((card) => (
          <div key={card.id} className="rounded-md border border-border/60 bg-background/60 p-3">
            <div className="flex items-center gap-2">
              {focusIcons[card.id as keyof typeof focusIcons]}
              <div>
                <p className="text-sm font-medium text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-foreground">
                {card.id === 'velocity' ? `${card.value}%` : card.value}
              </span>
              {card.id !== 'velocity' && (
                <span className="text-xs text-muted-foreground">of {card.total}</span>
              )}
            </div>
            <Progress value={(card.value / card.total) * 100} className="mt-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
