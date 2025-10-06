'use client'

import * as React from "react"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { KpiCard } from "@/components/ui/kpi-card"
import { PresenceAvatarGroup } from "@/components/ui/presence-avatar-group"
import { CommandPalette } from "@/components/ui/command-palette"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  BarChart3, 
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

// Mock data
const mockTasks = [
  {
    id: 'task-1',
    title: 'Design new landing page',
    description: 'Create mockups and wireframes for the new marketing landing page',
    assignee: { id: '1', name: 'Sarah Chen', avatar: '' },
    priority: 'high',
    status: 'in-progress',
    dueDate: '2024-11-15',
    commentCount: 5,
    attachmentCount: 2,
    tags: ['design', 'marketing']
  },
  {
    id: 'task-2',
    title: 'Implement user authentication',
    description: 'Add OAuth and email authentication to the application',
    assignee: { id: '2', name: 'Mike Johnson', avatar: '' },
    priority: 'urgent',
    status: 'stuck',
    dueDate: '2024-11-10',
    commentCount: 12,
    attachmentCount: 1,
    tags: ['backend', 'security']
  },
  {
    id: 'task-3',
    title: 'Write API documentation',
    description: 'Document all REST API endpoints with examples',
    assignee: { id: '3', name: 'Emma Davis', avatar: '' },
    priority: 'medium',
    status: 'on-track',
    dueDate: '2024-11-20',
    commentCount: 3,
    tags: ['documentation']
  }
]

const mockUsers = [
  { id: '1', name: 'Sarah Chen', avatar: '', status: 'online' as const },
  { id: '2', name: 'Mike Johnson', avatar: '', status: 'away' as const },
  { id: '3', name: 'Emma Davis', avatar: '', status: 'online' as const },
  { id: '4', name: 'Alex Kim', avatar: '', status: 'offline' as const },
  { id: '5', name: 'Lisa Wang', avatar: '', status: 'online' as const },
]

export default function DemoPage() {
  const [activeView, setActiveView] = React.useState('dashboard')
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="On Track"
                value="12"
                change={{ value: "+2 from last week", trend: "up" }}
                icon={<CheckCircle className="h-4 w-4 text-green-500" />}
              />
              <KpiCard
                title="Stuck"
                value="3"
                change={{ value: "-1 from last week", trend: "down" }}
                icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              />
              <KpiCard
                title="Overdue"
                value="2"
                change={{ value: "Same as last week", trend: "neutral" }}
                icon={<TrendingUp className="h-4 w-4 text-yellow-500" />}
              />
              <KpiCard
                title="Team Members"
                value="12"
                change={{ value: "+2 new this month", trend: "up" }}
                icon={<div className="h-4 w-4 text-blue-500">👥</div>}
              />
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Recent Activity
                      <Button variant="outline" size="sm">View All</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { user: 'Sarah Chen', action: 'completed task', item: 'Design new landing page', time: '2 hours ago' },
                      { user: 'Mike Johnson', action: 'commented on', item: 'Implement user authentication', time: '4 hours ago' },
                      { user: 'Emma Davis', action: 'started', item: 'Write API documentation', time: '6 hours ago' },
                      { user: 'Alex Kim', action: 'uploaded file to', item: 'Setup CI/CD pipeline', time: '1 day ago' }
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated">
                        <div>
                          <div className="font-medium">{activity.user}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.action} <span className="font-medium">{activity.item}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{activity.time}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PresenceAvatarGroup users={mockUsers} />
                    <div className="mt-4 text-sm text-muted-foreground">
                      5 members online now
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      New Task
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tasks Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer">
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Assigned to {task.assignee.name} • Due {task.dueDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{task.priority}</Badge>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'board':
        return (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['To Do', 'In Progress', 'Review', 'Done'].map((column, index) => (
                <Card key={column} className="h-fit">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{column}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mockTasks.slice(0, 2).map((task) => (
                      <Card key={task.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="text-sm font-medium mb-1">{task.title}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          {task.assignee.name}
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                          <Badge variant="outline" className="text-xs">{task.status}</Badge>
                        </div>
                      </Card>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      + Add task
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 'list':
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50">
                      <Checkbox />
                      <div className="flex-1">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.assignee.name} • {task.dueDate}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{task.priority}</Badge>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'timeline':
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Timeline View</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTasks.map((task) => (
                    <div key={task.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-brand"></div>
                        <div className="w-0.5 h-16 bg-border"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {task.assignee.name} • {task.dueDate}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{task.priority}</Badge>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'calendar':
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-2 text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 2
                    const isCurrentMonth = day >= 1 && day <= 30
                    const isToday = day === 14
                    return (
                      <div
                        key={i}
                        className={`p-2 text-sm border border-border rounded cursor-pointer hover:bg-accent/50 ${
                          !isCurrentMonth ? 'text-muted-foreground' : ''
                        } ${isToday ? 'bg-brand text-white' : ''}`}
                      >
                        {isCurrentMonth ? day : ''}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return <div className="p-6">Select a view to get started</div>
    }
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* View Selector */}
        <div className="p-4 border-b border-border">
          <SegmentedControl
            options={[
              { value: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="size-4" /> },
              { value: 'board', label: 'Board', icon: <div className="size-4">📋</div> },
              { value: 'list', label: 'List', icon: <div className="size-4">📝</div> },
              { value: 'timeline', label: 'Timeline', icon: <div className="size-4">📊</div> },
              { value: 'calendar', label: 'Calendar', icon: <div className="size-4">📅</div> },
            ]}
            value={activeView}
            onValueChange={setActiveView}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
      
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
    </>
  )
}