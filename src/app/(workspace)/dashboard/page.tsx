"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KpiCard } from "@/components/ui/kpi-card"
import { PresenceAvatarGroup } from "@/components/ui/presence-avatar-group"
import { ActivityFeed, type ActivityItem } from "@/components/ui/activity-feed"
import { cn } from "@/lib/utils"
import { 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Pin,
  MoreHorizontal
} from "lucide-react"

// Mock data
const kpiData = [
  {
    title: "On Track",
    value: "24",
    change: { value: "+12%", trend: "up" as const },
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
  {
    title: "Stuck", 
    value: "8",
    change: { value: "-3%", trend: "down" as const },
    icon: <AlertCircle className="h-5 w-5 text-red-500" />
  },
  {
    title: "Overdue",
    value: "5", 
    change: { value: "+2", trend: "up" as const },
    icon: <Clock className="h-5 w-5 text-orange-500" />
  }
]

const teamMembers = [
  { id: "1", name: "Alex Chen", avatar: "/avatars/alex.jpg", status: "online" as const },
  { id: "2", name: "Sarah Miller", avatar: "/avatars/sarah.jpg", status: "online" as const },
  { id: "3", name: "Mike Johnson", avatar: "/avatars/mike.jpg", status: "away" as const },
  { id: "4", name: "Emma Davis", status: "offline" as const },
  { id: "5", name: "Tom Wilson", avatar: "/avatars/tom.jpg", status: "online" as const },
  { id: "6", name: "Lisa Brown", status: "away" as const }
]

const activities: ActivityItem[] = [
  {
    id: "1",
    type: "post",
    author: { name: "Alex Chen", avatar: "/avatars/alex.jpg", role: "Developer" },
    content: "Just completed the authentication module! 🎉 The new OAuth integration is working perfectly with all providers.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    tags: ["development", "authentication"],
    likes: 8,
    comments: 3,
    isLiked: false
  },
  {
    id: "2", 
    type: "file",
    author: { name: "Sarah Miller", avatar: "/avatars/sarah.jpg", role: "Designer" },
    content: "Updated the design system with new color palette and component variants. Check out the attached Figma file.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    attachments: [
      { type: "file", url: "/files/design-system.fig", name: "Design System v2.fig", size: "2.4 MB" }
    ],
    tags: ["design", "ui"],
    likes: 12,
    comments: 5,
    isLiked: true
  },
  {
    id: "3",
    type: "comment",
    author: { name: "Mike Johnson", avatar: "/avatars/mike.jpg", role: "PM" },
    content: "Great work on the Q3 planning! I've reviewed the roadmap and everything looks solid. Let's sync up tomorrow to discuss the resource allocation.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    mentions: [
      { id: "1", name: "Alex Chen" },
      { id: "2", name: "Sarah Miller" }
    ],
    likes: 4,
    comments: 2,
    isLiked: false
  }
]

const pinnedDocs = [
  {
    id: "1",
    title: "Q3 2024 Roadmap",
    type: "document" as const,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    author: "Mike Johnson"
  },
  {
    id: "2", 
    title: "Design System Guidelines",
    type: "document" as const,
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    author: "Sarah Miller"
  },
  {
    id: "3",
    title: "API Documentation",
    type: "document" as const, 
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    author: "Alex Chen"
  }
]

export default function DashboardPage() {
  const handleQuickAdd = (type: 'task' | 'project' | 'event') => {
    console.log(`Quick add ${type}`)
    // TODO: Open modal/form for quick add
  }

  const handleActivityLike = (activityId: string) => {
    console.log(`Like activity ${activityId}`)
    // TODO: Handle like
  }

  const handleActivityComment = (activityId: string) => {
    console.log(`Comment on activity ${activityId}`)
    // TODO: Handle comment
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening in your workspace today.
          </p>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {kpiData.map((kpi, index) => (
            <KpiCard key={index} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Add
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleQuickAdd('task')}
                  >
                    <CheckCircle className="h-6 w-6" />
                    <span>Task</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleQuickAdd('project')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span>Project</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex-col gap-2"
                    onClick={() => handleQuickAdd('event')}
                  >
                    <Calendar className="h-6 w-6" />
                    <span>Event</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Activity Feed</CardTitle>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityFeed
                  activities={activities}
                  onLike={handleActivityLike}
                  onComment={handleActivityComment}
                  compact={false}
                  showActions={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Presence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Presence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PresenceAvatarGroup users={teamMembers} max={8} />
                <div className="mt-4 text-sm text-muted-foreground">
                  {teamMembers.filter(u => u.status === 'online').length} online, 
                  {teamMembers.filter(u => u.status === 'away').length} away
                </div>
              </CardContent>
            </Card>

            {/* Pinned Documents */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pin className="h-5 w-5" />
                  Pinned Docs
                </CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pinnedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 text-brand">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.author} • {doc.lastModified.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Projects</span>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tasks This Week</span>
                    <span className="font-semibold">47</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="font-semibold text-green-500">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Team Members</span>
                    <span className="font-semibold">{teamMembers.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}