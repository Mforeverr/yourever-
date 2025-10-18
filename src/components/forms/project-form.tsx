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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { LayoutGrid, List, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from '@/hooks/api/use-workspace-mutations'
import type { WorkspaceProject } from '@/modules/workspace/types'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().max(500).optional(),
  defaultView: z.enum(['board', 'list']),
})

export type ProjectValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  children?: React.ReactNode
  orgId?: string | null
  divisionId?: string | null
  project?: WorkspaceProject
  onSuccess?: (project: WorkspaceProject) => void
}

const viewOptions = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
]

const mockMembers = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@company.com' },
  { id: '2', name: 'Mike Johnson', email: 'mike@company.com' },
  { id: '3', name: 'Emily Davis', email: 'emily@company.com' },
]

export function ProjectForm({ children, orgId, divisionId, project, onSuccess }: ProjectFormProps) {
  const [open, setOpen] = React.useState(false)
  const createProject = useCreateProjectMutation()
  const updateProject = useUpdateProjectMutation()
  const deleteProject = useDeleteProjectMutation()

  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      defaultView: project?.defaultView === 'list' ? 'list' : 'board',
    },
  })

  React.useEffect(() => {
    form.reset({
      name: project?.name ?? '',
      description: project?.description ?? '',
      defaultView: project?.defaultView === 'list' ? 'list' : 'board',
    })
  }, [project, form])

  const mode = project ? 'edit' : 'create'

  const handleSubmit = async (values: ProjectValues) => {
    if (!orgId) {
      toast({
        title: 'Select an organization',
        description: 'Choose an organization before creating workspace projects.',
        variant: 'destructive',
      })
      return
    }

    try {
      const payload = {
        name: values.name,
        description: values.description ?? '',
        badgeCount: project?.badgeCount ?? 0,
        dotColor: project?.dotColor ?? 'bg-indigo-500',
        divisionId: divisionId ?? project?.divisionId ?? null,
      }

      const response = project
        ? await updateProject.mutateAsync({ projectId: project.id, orgId, payload })
        : await createProject.mutateAsync({ orgId, payload })

      toast({
        title: project ? 'Project updated' : 'Project created',
        description: project
          ? 'Template project customised successfully.'
          : 'Project added to your workspace overview.',
      })

      onSuccess?.(response)
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Unable to save project',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!project || !orgId) return
    try {
      await deleteProject.mutateAsync({ projectId: project.id, orgId })
      toast({ title: 'Project deleted', description: `${project.name} removed from workspace.` })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Unable to delete project',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create project' : 'Edit project'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input placeholder="Website redesign" {...field} />
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
                    <Textarea rows={3} placeholder="What outcomes should this project achieve?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultView"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default view</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {viewOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
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

            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Sample collaborators</FormLabel>
              <div className="flex flex-wrap gap-2">
                {mockMembers.map((member) => (
                  <Badge key={member.id} variant="secondary" className="text-xs">
                    {member.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Invite teammates after saving to replace these example members.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              {mode === 'edit' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteProject.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
                {mode === 'create' ? 'Create project' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
