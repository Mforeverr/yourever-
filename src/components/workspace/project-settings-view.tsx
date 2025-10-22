'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Settings,
  Users,
  Shield,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  MoreHorizontal,
  AlertTriangle,
  Mail,
  Calendar,
  Hash,
  Tag
} from 'lucide-react'
import { useProject } from '@/contexts/project-context'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectSettingsViewProps {
  projectId?: string
}

export function ProjectSettingsView({ projectId }: ProjectSettingsViewProps) {
  const {
    project,
    members,
    isLoading,
    canEdit,
    updateProject,
    addMember,
    removeMember,
    error
  } = useProject()

  const [activeTab, setActiveTab] = React.useState('general')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleUpdateProject = React.useCallback(async (updates: Partial<any>) => {
    if (!project || !canEdit) return

    setIsSaving(true)
    try {
      await updateProject(updates)
    } catch (err) {
      console.error('Failed to update project:', err)
    } finally {
      setIsSaving(false)
    }
  }, [project, canEdit, updateProject])

  const handleAddMember = React.useCallback(async (email: string, role: 'owner' | 'editor' | 'viewer') => {
    if (!project || !canEdit) return

    try {
      // In a real implementation, you'd resolve the user ID from email
      await addMember(email, role)
    } catch (err) {
      console.error('Failed to add member:', err)
    }
  }, [project, canEdit, addMember])

  const handleRemoveMember = React.useCallback(async (userId: string) => {
    if (!project || !canEdit) return

    try {
      await removeMember(userId)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }, [project, canEdit, removeMember])

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load project settings. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 max-w-4xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Project not found or you don't have permission to view its settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Project Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your project details, team members, and permissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic information about your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={project.name}
                    onChange={(e) => handleUpdateProject({ name: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectStatus">Status</Label>
                  <Select
                    value={project.status}
                    onValueChange={(value) => handleUpdateProject({ status: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Description</Label>
                <Textarea
                  id="projectDescription"
                  value={project.description || ''}
                  onChange={(e) => handleUpdateProject({ description: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectPriority">Priority</Label>
                  <Select
                    value={project.priority}
                    onValueChange={(value) => handleUpdateProject({ priority: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectVisibility">Visibility</Label>
                  <Select
                    value={project.visibility}
                    onValueChange={(value) => handleUpdateProject({ visibility: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="division">Division</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end pt-4">
                  <Button disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage who has access to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>
                          {member.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
                      {canEdit && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {canEdit && (
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Settings</CardTitle>
              <CardDescription>
                Configure how team members can interact with this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow member invitations</Label>
                  <p className="text-sm text-muted-foreground">
                    Team members can invite others to join this project
                  </p>
                </div>
                <Switch disabled={!canEdit} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Require approval for new tasks</Label>
                  <p className="text-sm text-muted-foreground">
                    New tasks must be approved before they appear in the board
                  </p>
                </div>
                <Switch disabled={!canEdit} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable activity logs</Label>
                  <p className="text-sm text-muted-foreground">
                    Track all changes and activities in this project
                  </p>
                </div>
                <Switch disabled={!canEdit} defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Additional configuration options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <Input value={projectId} disabled />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this project
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Created</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="pt-4">
                <Button variant="destructive" disabled={!canEdit}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This action cannot be undone. All project data will be permanently deleted.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}