'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Video, Users, AlarmClock } from 'lucide-react'

interface PlanItem {
  id: string
  title: string
  time: string
  location?: string
  type: 'meeting' | 'deadline' | 'focus'
}

const todayItems: PlanItem[] = [
  {
    id: 'standup',
    title: 'Division stand-up',
    time: '09:00 – 09:20',
    location: 'Huddle Room A',
    type: 'meeting',
  },
  {
    id: 'handoff',
    title: 'Growth experiment handoff',
    time: '11:00 – 11:45',
    location: 'Zoom',
    type: 'meeting',
  },
  {
    id: 'campaign',
    title: 'Review: Q4 campaign copy',
    time: '14:00',
    type: 'deadline',
  },
  {
    id: 'focus-deep',
    title: 'Focus block — OKR planning',
    time: '15:00 – 16:30',
    type: 'focus',
  },
]

const iconForType: Record<PlanItem['type'], React.ReactNode> = {
  meeting: <Users className="h-4 w-4 text-brand" />,
  deadline: <AlarmClock className="h-4 w-4 text-amber-500" />,
  focus: <Video className="h-4 w-4 text-violet-500" />,
}

const labelForType: Record<PlanItem['type'], string> = {
  meeting: 'Meeting',
  deadline: 'Deadline',
  focus: 'Focus',
}

export function TodayPlanModule() {
  return (
    <Card className="border-border/80 bg-surface-panel/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-semibold">Today&apos;s Plan</CardTitle>
          <p className="text-xs text-muted-foreground">Stay on top of today&apos;s commitments.</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <CalendarIcon className="mr-1 h-3 w-3" />
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayItems.map((item) => (
          <div key={item.id} className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {iconForType[item.type]}
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[11px] uppercase tracking-wide">
                {labelForType[item.type]}
              </Badge>
            </div>
            {item.location && (
              <div className="mt-2 text-xs text-muted-foreground">Location: {item.location}</div>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="w-full text-xs">
          Open calendar
        </Button>
      </CardContent>
    </Card>
  )
}
