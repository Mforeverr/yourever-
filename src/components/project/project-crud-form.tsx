'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  LayoutGrid,
  List,
  GitBranch,
  Plus,
  Trash2,
  Loader2,
  CalendarIcon,
  Tag,
  Target,
  Eye,
  Users,
  Lock,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useScope } from '@/contexts/scope-context'
import { useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation } from '@/hooks/api/use-project-mutations'
import type { ProjectSummary, ProjectDetails } from '@/modules/projects/contracts'

// Enhanced form schema with all project fields
const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  visibility: z.enum(['private', 'division', 'organization']),
  tags: z.array(z.string()).optional(),
  targetDate: z.string().optional(),
  defaultView: z.enum(['board', 'list', 'timeline']),
  // Include organizationId for compatibility with CreateProjectRequest
  organizationId: z.string().optional(),
  divisionId: z.string().nullable().optional(),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectCrudFormProps {
  children?: React.ReactNode
  project?: ProjectSummary | ProjectDetails
  onSuccess?: (project: ProjectDetails) => void
  triggerClassName?: string
}

// Status options with colors
const statusOptions = [
  { value: 'planning', label: 'Planning', color: 'text-blue-500' },
  { value: 'active', label: 'Active', color: 'text-green-500' },
  { value: 'on_hold', label: 'On Hold', color: 'text-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'text-emerald-500' },
  { value: 'archived', label: 'Archived', color: 'text-gray-500' },
]

// Priority options with indicators
const priorityOptions = [
  { value: 'low', label: 'Low', color: 'text-gray-500' },
  { value: 'medium', label: 'Medium', color: 'text-blue-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
]

// Visibility options with icons
const visibilityOptions = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only visible to you',
    icon: Lock
  },
  {
    value: 'division',
    label: 'Division',
    description: 'Visible to your division',
    icon: Users
  },
  {
    value: 'organization',
    label: 'Organization',
    description: 'Visible to entire organization',
    icon: Eye
  },
]

// Default view options with icons
const viewOptions = [
  { value: 'board', label: 'Board', icon: LayoutGrid, description: 'Kanban-style board' },
  { value: 'list', label: 'List', icon: List, description: 'Detailed task list' },
  { value: 'timeline', label: 'Timeline', icon: GitBranch, description: 'Gantt chart view' },
]

export function ProjectCrudForm({
  children,
  project,
  onSuccess,
  triggerClassName
}: ProjectCrudFormProps) {
  const [open, setOpen] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [currentTag, setCurrentTag] = React.useState('')

  const { currentOrgId, currentDivisionId } = useScope()

  const createProjectMutation = useCreateProjectMutation({
    onSuccess: (data) => {
      toast({
        title: 'Project created successfully',
        description: `${data.project.name} has been added to your workspace.`,
      })
      onSuccess?.(data.project)
      setOpen(false)
    },
    onError: (error) => {
      toast({
        title: 'Failed to create project',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  })

  const updateProjectMutation = useUpdateProjectMutation({
    onSuccess: (data) => {
      toast({
        title: 'Project updated successfully',
        description: `${data.project.name} has been updated.`,
      })
      onSuccess?.(data.project)
      setOpen(false)
    },
    onError: (error) => {
      toast({
        title: 'Failed to update project',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  })

  const deleteProjectMutation = useDeleteProjectMutation({
    onSuccess: () => {
      toast({
        title: 'Project deleted successfully',
        description: 'The project has been removed from your workspace.',
      })
      setOpen(false)
      setShowDeleteDialog(false)
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete project',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
      setShowDeleteDialog(false)
    }
  })

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'medium',
      visibility: project?.visibility || 'division',
      tags: project?.tags || [],
      targetDate: project?.targetDate || '',
      defaultView: (project && 'defaultView' in project) ? project.defaultView : 'board',
    },
  })

  const mode = project ? 'edit' : 'create'
  const isPending = createProjectMutation.isPending || updateProjectMutation.isPending

  React.useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority || 'medium',
        visibility: project.visibility,
        tags: project.tags,
        targetDate: project.targetDate || '',
        defaultView: ('defaultView' in project) ? project.defaultView : 'board',
      })
    } else {
      form.reset({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        visibility: 'division',
        tags: [],
        targetDate: '',
        defaultView: 'board',
      })
    }
  }, [project, form])

  const handleSubmit = async (values: ProjectFormValues) => {
    if (!currentOrgId) {
      toast({
        title: 'Organization required',
        description: 'Please select an organization before creating a project.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (mode === 'create') {
        const { organizationId, divisionId, ...projectData } = values
        const createData = {
          orgId: currentOrgId,
          divisionId: currentDivisionId,
          organizationId: currentOrgId,
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          priority: projectData.priority,
          visibility: projectData.visibility,
          tags: projectData.tags || [],
          targetDate: projectData.targetDate,
          defaultView: projectData.defaultView,
        }
        await createProjectMutation.mutateAsync(createData)
      } else if (project) {
        await updateProjectMutation.mutateAsync({
          projectId: project.id,
          updates: values,
        })
      }
    } catch (error) {
      // Error handling is done in mutation hooks
      console.error('Project operation failed:', error)
    }
  }

  const handleDelete = async () => {
    if (!project) return
    await deleteProjectMutation.mutateAsync({ projectId: project.id })
  }

  const addTag = () => {
    if (currentTag.trim() && !(form.watch('tags') || []).includes(currentTag.trim())) {
      const currentTags = form.getValues('tags') || []
      form.setValue('tags', [...currentTags, currentTag.trim()])
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || []
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className={triggerClassName}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Project' : 'Edit Project'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter project name"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What is this project about?"
                        rows={3}
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Brief description of the project goals and objectives.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Project Settings</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn('w-2 h-2 rounded-full', option.color)} />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Target className={cn('h-3 w-3', option.color)} />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {visibilityOptions.map((option) => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Control who can see and access this project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultView"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default View</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {viewOptions.map((option) => {
                          const Icon = option.icon
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {option.description}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Default view when opening this project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={isPending}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date?.toISOString() || '')
                          }}
                          disabled={(date) => date < new Date() || isPending}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Expected completion date for this project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          value={currentTag}
                          onChange={(e) => setCurrentTag(e.target.value)}
                          onKeyDown={handleKeyPress}
                          disabled={isPending}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addTag}
                          disabled={!currentTag.trim() || isPending}
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                      </div>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                                disabled={isPending}
                              >
                                <span className="text-xs">×</span>
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Add tags to help categorize and find your project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex gap-2">
              {mode === 'edit' && (
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={deleteProjectMutation.isPending || isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{project?.name || 'this project'}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteProjectMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteProjectMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Project'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  mode === 'create' ? 'Create Project' : 'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}