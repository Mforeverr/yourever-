/**
 * Real-time Notification System with Toast and Push Notifications
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Comprehensive notification system with real-time toast notifications,
 * browser push notifications, notification center, and configurable preferences.
 */

"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import type { KanbanUser } from "@/types/kanban"
import type { NotificationPreferences } from "@/lib/collaboration-utils"
import {
  shouldSendNotification,
  createDefaultNotificationPreferences
} from "@/lib/collaboration-utils"
import {
  Bell,
  BellOff,
  Settings,
  Check,
  X,
  Trash2,
  Archive,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Filter,
  Search,
  MoreHorizontal,
  ExternalLink
} from "lucide-react"

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'task_assigned' | 'task_moved' | 'task_commented' | 'task_completed' | 'mention_received' | 'board_invitation' | 'due_date_reminder'
  title: string
  message: string
  userId: string
  boardId?: string
  taskId?: string
  commentId?: string
  read: boolean
  timestamp: string
  expiresAt?: string
  actions?: NotificationAction[]
  metadata?: Record<string, any>
}

export interface NotificationAction {
  id: string
  label: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  action: () => void | Promise<void>
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  recent: number
}

interface NotificationSystemProps {
  currentUser: KanbanUser
  notifications: Notification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onClearAllNotifications: () => void
  onArchiveNotification: (notificationId: string) => void
  onUpdatePreferences: (preferences: NotificationPreferences) => void
  onRequestPermission: () => Promise<boolean>
  className?: string
}

const NOTIFICATION_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  task_assigned: User,
  task_moved: ExternalLink,
  task_commented: MessageSquare,
  task_completed: CheckCircle,
  mention_received: Bell,
  board_invitation: User,
  due_date_reminder: Clock
}

const NOTIFICATION_COLORS = {
  info: "text-blue-600",
  success: "text-green-600",
  warning: "text-yellow-600",
  error: "text-red-600",
  task_assigned: "text-purple-600",
  task_moved: "text-blue-600",
  task_commented: "text-green-600",
  task_completed: "text-emerald-600",
  mention_received: "text-indigo-600",
  board_invitation: "text-orange-600",
  due_date_reminder: "text-amber-600"
}

const DEFAULT_NOTIFICATION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export function NotificationSystem({
  currentUser,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
  onArchiveNotification,
  onUpdatePreferences,
  onRequestPermission,
  className
}: NotificationSystemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    createDefaultNotificationPreferences()
  )
  const [showSettings, setShowSettings] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }

    // Create notification sound
    notificationSoundRef.current = new Audio('/sounds/notification.mp3')
    notificationSoundRef.current.volume = 0.3
  }, [])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Notifications not supported",
        description: "Your browser does not support desktop notifications.",
        variant: "destructive"
      })
      return false
    }

    const granted = await onRequestPermission()
    setPermissionStatus(granted ? 'granted' : 'denied')

    if (granted) {
      toast({
        title: "Notifications enabled",
        description: "You'll receive desktop notifications for important updates."
      })
    } else {
      toast({
        title: "Notifications blocked",
        description: "You can enable notifications in your browser settings.",
        variant: "destructive"
      })
    }

    return granted
  }

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (permissionStatus !== 'granted' || !preferences.pushEnabled) return

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: currentUser.avatar || '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type === 'error' || notification.type === 'warning',
      silent: !preferences.taskAssigned // Example preference
    })

    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
      // Handle navigation to related content
      if (notification.taskId) {
        // Navigate to task
      } else if (notification.boardId) {
        // Navigate to board
      }
    }

    // Auto-close after 5 seconds unless requireInteraction is true
    setTimeout(() => {
      if (!browserNotification.requireInteraction) {
        browserNotification.close()
      }
    }, 5000)
  }, [permissionStatus, preferences.pushEnabled, currentUser.avatar])

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationSoundRef.current && preferences.taskAssigned) {
      notificationSoundRef.current.play().catch(() => {
        // Audio playback failed (likely due to browser policy)
      })
    }
  }, [preferences.taskAssigned])

  // Handle new notification
  const handleNewNotification = useCallback((notification: Notification) => {
    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      action: notification.actions && notification.actions.length > 0 ? (
        <div className="flex gap-1">
          {notification.actions.slice(0, 2).map(action => (
            <Button
              key={action.id}
              size="sm"
              variant={action.variant || 'default'}
              onClick={action.action}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : undefined
    })

    // Show browser notification
    showBrowserNotification(notification)

    // Play sound
    playNotificationSound()
  }, [showBrowserNotification, playNotificationSound])

  // Process new notifications
  useEffect(() => {
    const newNotifications = notifications.filter(n => !n.read)
    newNotifications.forEach(handleNewNotification)
  }, [notifications, handleNewNotification])

  // Clean up expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      notifications.forEach(notification => {
        if (notification.expiresAt && new Date(notification.expiresAt) < now) {
          onArchiveNotification(notification.id)
        }
      })
    }, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, [notifications, onArchiveNotification])

  // Filter notifications
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by type
    if (filterType) {
      filtered = filtered.filter(n => n.type === filterType)
    }

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return filtered
  }, [notifications, searchQuery, filterType, activeTab])

  // Calculate stats
  const stats: NotificationStats = React.useMemo(() => {
    const unread = notifications.filter(n => !n.read).length
    const recent = notifications.filter(n =>
      new Date(n.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length

    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: notifications.length,
      unread,
      byType,
      recent
    }
  }, [notifications])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / 60000)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return "just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    onUpdatePreferences(newPreferences)
  }

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const Icon = NOTIFICATION_ICONS[notification.type]
    const colorClass = NOTIFICATION_COLORS[notification.type]

    return (
      <div
        className={`p-4 border-b last:border-b-0 hover:bg-accent/50 transition-colors ${
          !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
        }`}
      >
        <div className="flex gap-3">
          <div className={`mt-0.5 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium truncate ${!notification.read ? 'font-semibold' : ''}`}>
                  {notification.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {!notification.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
              </div>
            </div>

            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.map(action => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.variant || 'outline'}
                    onClick={action.action}
                    className="h-7 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(notification.timestamp)}
              </span>

              <div className="flex items-center gap-1">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDeleteNotification(notification.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          {permissionStatus === 'granted' ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          {stats.unread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {stats.unread > 99 ? '99+' : stats.unread}
            </div>
          )}
        </Button>
      </div>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-popover border border-border rounded-lg shadow-lg z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <div className="flex items-center gap-1">
                  {stats.unread > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onMarkAllAsRead}
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setFilterType(filterType ? null : 'info')}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 m-3">
                  <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                  <TabsTrigger value="unread">Unread ({stats.unread})</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-0">
                  <ScrollArea className="h-96">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Bell className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      <div>
                        {filteredNotifications.map(notification => (
                          <NotificationItem key={notification.id} notification={notification} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="unread" className="mt-0">
                  <ScrollArea className="h-96">
                    {filteredNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <CheckCircle className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">All caught up!</p>
                      </div>
                    ) : (
                      <div>
                        {filteredNotifications.map(notification => (
                          <NotificationItem key={notification.id} notification={notification} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <div className="p-4 space-y-4">
                    {/* Notification Permission */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Desktop Notifications</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {permissionStatus === 'granted'
                            ? 'Desktop notifications enabled'
                            : 'Enable desktop notifications'
                          }
                        </span>
                        <Button
                          size="sm"
                          onClick={requestNotificationPermission}
                          disabled={permissionStatus === 'granted'}
                        >
                          {permissionStatus === 'granted' ? 'Enabled' : 'Enable'}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Preferences */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Notification Types</Label>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="task-assigned" className="text-sm">Task assigned</Label>
                        <Switch
                          id="task-assigned"
                          checked={preferences.taskAssigned}
                          onCheckedChange={(checked) => handlePreferenceChange('taskAssigned', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="task-moved" className="text-sm">Task moved</Label>
                        <Switch
                          id="task-moved"
                          checked={preferences.taskMoved}
                          onCheckedChange={(checked) => handlePreferenceChange('taskMoved', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="task-commented" className="text-sm">Task commented</Label>
                        <Switch
                          id="task-commented"
                          checked={preferences.taskCommented}
                          onCheckedChange={(checked) => handlePreferenceChange('taskCommented', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="task-completed" className="text-sm">Task completed</Label>
                        <Switch
                          id="task-completed"
                          checked={preferences.taskCompleted}
                          onCheckedChange={(checked) => handlePreferenceChange('taskCompleted', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="mention-received" className="text-sm">@mentions</Label>
                        <Switch
                          id="mention-received"
                          checked={preferences.mentionReceived}
                          onCheckedChange={(checked) => handlePreferenceChange('mentionReceived', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="board-invitation" className="text-sm">Board invitations</Label>
                        <Switch
                          id="board-invitation"
                          checked={preferences.boardInvitation}
                          onCheckedChange={(checked) => handlePreferenceChange('boardInvitation', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="due-date-reminder" className="text-sm">Due date reminders</Label>
                        <Switch
                          id="due-date-reminder"
                          checked={preferences.dueDateReminder}
                          onCheckedChange={(checked) => handlePreferenceChange('dueDateReminder', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Methods */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Notification Methods</Label>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4" />
                          <Label htmlFor="sound-notifications" className="text-sm">Sound</Label>
                        </div>
                        <Switch
                          id="sound-notifications"
                          checked={preferences.taskAssigned}
                          onCheckedChange={(checked) => handlePreferenceChange('taskAssigned', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          <Label htmlFor="push-notifications" className="text-sm">Push notifications</Label>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={preferences.pushEnabled}
                          onCheckedChange={(checked) => handlePreferenceChange('pushEnabled', checked)}
                          disabled={permissionStatus !== 'granted'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          <Label htmlFor="email-notifications" className="text-sm">Email notifications</Label>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={preferences.emailEnabled}
                          onCheckedChange={(checked) => handlePreferenceChange('emailEnabled', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Clear Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={onClearAllNotifications}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear all notifications
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Hook for managing notifications
export function useNotificationSystem(
  currentUser: KanbanUser,
  onRequestPermission?: () => Promise<boolean>
) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    createDefaultNotificationPreferences()
  )

  // Load notifications and preferences from storage
  useEffect(() => {
    const storedNotifications = localStorage.getItem(`notifications_${currentUser.id}`)
    const storedPreferences = localStorage.getItem(`notification_preferences_${currentUser.id}`)

    if (storedNotifications) {
      try {
        setNotifications(JSON.parse(storedNotifications))
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }

    if (storedPreferences) {
      try {
        setPreferences(JSON.parse(storedPreferences))
      } catch (error) {
        console.error('Failed to load notification preferences:', error)
      }
    }
  }, [currentUser.id])

  // Save notifications to storage
  useEffect(() => {
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications))
  }, [notifications, currentUser.id])

  // Save preferences to storage
  useEffect(() => {
    localStorage.setItem(`notification_preferences_${currentUser.id}`, JSON.stringify(preferences))
  }, [preferences, currentUser.id])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'userId' | 'read' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: currentUser.id,
      read: false,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_NOTIFICATION_TTL).toISOString()
    }

    setNotifications(prev => [newNotification, ...prev])
    return newNotification
  }, [currentUser.id])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const archiveNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  const updatePreferences = useCallback((newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences)
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  return {
    notifications,
    preferences,
    stats: {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      recent: notifications.filter(n =>
        new Date(n.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    },
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    archiveNotification,
    updatePreferences,
    requestPermission: onRequestPermission || requestPermission
  }
}