'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Hash, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  useCreateChannelMutation,
  useDeleteChannelMutation,
  useUpdateChannelMutation,
} from '@/hooks/api/use-workspace-mutations'
import type { WorkspaceChannel } from '@/modules/workspace/types'

const channelSchema = z.object({
  name: z
    .string()
    .min(1, 'Channel handle is required')
    .max(21, 'Channel handle must be 21 characters or less')
    .regex(/^[a-z0-9-_]+$/, 'Use lowercase letters, numbers, hyphen, or underscore'),
  channelType: z.enum(['public', 'private']),
  description: z.string().max(250).optional(),
  topic: z.string().max(120).optional(),
})

export type ChannelValues = z.infer<typeof channelSchema>

interface ChannelFormProps {
  children?: React.ReactNode
  orgId?: string | null
  divisionId?: string | null
  channel?: WorkspaceChannel
  onSuccess?: (channel: WorkspaceChannel) => void
}

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Visible to everyone in this division' },
  { value: 'private', label: 'Private', description: 'Visible only to invited teammates' },
]

export function ChannelForm({ children, orgId, divisionId, channel, onSuccess }: ChannelFormProps) {
  const [open, setOpen] = React.useState(false)
  const createChannel = useCreateChannelMutation()
  const updateChannel = useUpdateChannelMutation()
  const deleteChannel = useDeleteChannelMutation()

  const form = useForm<ChannelValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: channel?.slug ?? '',
      channelType: channel?.channelType ?? 'public',
      description: channel?.description ?? '',
      topic: channel?.topic ?? '',
    },
  })

  React.useEffect(() => {
    form.reset({
      name: channel?.slug ?? '',
      channelType: channel?.channelType ?? 'public',
      description: channel?.description ?? '',
      topic: channel?.topic ?? '',
    })
  }, [channel, form])

  const mode = channel ? 'edit' : 'create'

  const handleSubmit = async (values: ChannelValues) => {
    if (!orgId) {
      toast({
        title: 'Select an organization',
        description: 'Choose an organization before creating channels.',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      name: values.name,
      slug: values.name,
      channelType: values.channelType,
      topic: values.topic ?? '',
      description: values.description ?? '',
      divisionId: divisionId ?? channel?.divisionId ?? null,
    }

    try {
      const response = channel
        ? await updateChannel.mutateAsync({ channelId: channel.id, orgId, payload })
        : await createChannel.mutateAsync({ orgId, payload })

      toast({
        title: channel ? 'Channel updated' : 'Channel created',
        description: channel
          ? 'Template channel customised successfully.'
          : 'Channel added to your workspace.',
      })

      onSuccess?.(response)
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Unable to save channel',
        description: error instanceof Error ? error.message : 'Unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!channel || !orgId) return
    try {
      await deleteChannel.mutateAsync({ channelId: channel.id, orgId })
      toast({ title: 'Channel deleted', description: `#${channel.slug} removed from workspace.` })
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Unable to delete channel',
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
            Add channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create channel' : 'Edit channel'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel handle</FormLabel>
                  <FormControl>
                    <div className="relative">
                      {form.watch('channelType') === 'private' ? (
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      ) : (
                        <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      )}
                      <Input
                        {...field}
                        className="pl-10"
                        placeholder="marketing-team"
                        onChange={(event) => field.onChange(event.target.value.trim().toLowerCase())}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {visibilityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
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
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel topic</FormLabel>
                  <FormControl>
                    <Input placeholder="Daily coordination and blockers" {...field} />
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
                    <Textarea rows={3} placeholder="Share context for new members" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {mode === 'edit' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleteChannel.isPending}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createChannel.isPending || updateChannel.isPending}>
                {mode === 'create' ? 'Create channel' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
