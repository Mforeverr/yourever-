'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { 
  Calendar, 
  User, 
  Users, 
  Clock, 
  Tag, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Paperclip,
  Edit,
  Share,
  Star,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExplorerItem, getUserById, getUsersByIds } from '@/lib/explorer-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PresenceAvatarGroup } from '@/components/ui/presence-avatar-group'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ContentPanelProps {
  selectedItem: ExplorerItem | null
}

export function ContentPanel({ selectedItem }: ContentPanelProps) {
  if (!selectedItem) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="size-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="size-6" />
          </div>
          <p className="text-sm">Select an item to view details</p>
        </div>
      </div>
    )
  }

  const renderProjectDetails = (item: ExplorerItem) => {
    const { metadata } = item
    
    return (
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground mt-1">Project</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Star className="size-4 mr-2" />
              Follow
            </Button>
            <Button variant="outline" size="sm">
              <Share className="size-4 mr-2" />
              Share
            </Button>
            <Button size="sm">
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Project Status */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress value={metadata.progress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{metadata.progress}% Complete</span>
                  <span>Due {metadata.dueDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <StatusBadge status={metadata.status} />
                <PriorityBadge priority={metadata.priority} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PresenceAvatarGroup users={getUsersByIds(metadata.assigneeIds || [])} max={8} />
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="size-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Avatar className="size-6">
                  <AvatarImage src="" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">John Doe</p>
                  <p className="text-muted-foreground">Updated project status</p>
                </div>
                <span className="text-xs text-muted-foreground">2h ago</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-sm">
                <Avatar className="size-6">
                  <AvatarImage src="" />
                  <AvatarFallback>AS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">Alice Smith</p>
                  <p className="text-muted-foreground">Added new task</p>
                </div>
                <span className="text-xs text-muted-foreground">5h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTaskDetails = (item: ExplorerItem) => {
    const { metadata } = item
    
    return (
      <div className="space-y-6">
        {/* Task Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground mt-1">Task</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Star className="size-4 mr-2" />
              Follow
            </Button>
            <Button size="sm">
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Task Status */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={metadata.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <PriorityBadge priority={metadata.priority} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{metadata.storyPoints}</span>
            </CardContent>
          </Card>
        </div>

        {/* Assignee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="size-4" />
              Assignee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="" />
                <AvatarFallback>{getUserById(metadata.assigneeId)?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{getUserById(metadata.assigneeId)?.name}</p>
                <p className="text-sm text-muted-foreground">Working on it</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDocumentDetails = (item: ExplorerItem) => {
    const { metadata } = item
    
    return (
      <div className="space-y-6">
        {/* Document Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground mt-1">Document</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="size-4 mr-2" />
              Share
            </Button>
            <Button size="sm">
              <FileText className="size-4 mr-2" />
              Open
            </Button>
          </div>
        </div>

        {/* Document Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">File Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span>{metadata.fileType?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Size</span>
                <span>{metadata.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>{metadata.version}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Author</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="" />
                  <AvatarFallback>{getUserById(metadata.authorId)?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getUserById(metadata.authorId)?.name}</p>
                  <p className="text-sm text-muted-foreground">Last modified {format(item.updatedAt, 'MMM d, yyyy')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const renderFolderDetails = (item: ExplorerItem) => {
    const { metadata } = item
    const childCount = item.children?.length || 0
    
    return (
      <div className="space-y-6">
        {/* Folder Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{item.name}</h2>
            <p className="text-muted-foreground mt-1">Folder</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share className="size-4 mr-2" />
              Share
            </Button>
            <Button size="sm">
              <Edit className="size-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Folder Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{childCount}</span>
                </div>
                {metadata.memberCount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span>{metadata.memberCount}</span>
                  </div>
                )}
                {metadata.head && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lead</span>
                    <span>{metadata.head}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(item.createdAt, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Modified</span>
                  <span>{format(item.updatedAt, 'MMM d, yyyy')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contents */}
        {item.children && item.children.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {item.children.map((child) => (
                  <div key={child.id} className="flex items-center justify-between p-2 rounded-sm hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <div className="size-4 text-muted-foreground">
                        {child.type === 'folder' ? <FileText className="size-4" /> : <FileText className="size-4" />}
                      </div>
                      <span className="text-sm">{child.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {child.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (selectedItem.type) {
      case 'project':
        return renderProjectDetails(selectedItem)
      case 'task':
        return renderTaskDetails(selectedItem)
      case 'document':
        return renderDocumentDetails(selectedItem)
      case 'folder':
        return renderFolderDetails(selectedItem)
      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">{selectedItem.name}</h2>
              <p className="text-muted-foreground mt-1">{selectedItem.type}</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">No additional details available for this item type.</p>
              </CardContent>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>
    </div>
  )
}
