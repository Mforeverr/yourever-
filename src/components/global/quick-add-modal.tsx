'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Calendar as CalendarIcon,
  Check,
  FileText,
  Hash,
  MessageSquare,
  Video
} from "lucide-react"
import {
  QUICK_ADD_PRIORITIES,
  QUICK_ADD_TYPES,
  QuickAddInitialValues,
  QuickAddPriority,
  QuickAddSubmitPayload,
  QuickAddType,
} from "@/types/command-palette"

const quickAddSchema = z.object({
  type: z.enum(QUICK_ADD_TYPES),
  context: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(QUICK_ADD_PRIORITIES).optional(),
})

type QuickAddFormValues = z.infer<typeof quickAddSchema>

interface QuickAddModalProps {
  open: boolean
  type: QuickAddType
  defaultContext?: string
  initialValues?: QuickAddInitialValues
  onClose: () => void
  onCreate?: (payload: QuickAddSubmitPayload) => Promise<void>
  onSuccess?: (payload: QuickAddSubmitPayload) => void
  onError?: (error: Error) => void
}

const typeOptions: Array<{
  value: QuickAddType
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: "task", label: "Task", icon: Check },
  { value: "project", label: "Project", icon: Hash },
  { value: "doc", label: "Document", icon: FileText },
  { value: "channel", label: "Channel", icon: MessageSquare },
  { value: "event", label: "Event", icon: Video },
]

const priorityOptions: Array<{
  value: QuickAddPriority
  label: string
  color: string
}> = [
  { value: "low", label: "Low", color: "bg-gray-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
]

const mockProjects = [
  { id: "website-revamp", name: "Website Revamp" },
  { id: "pricing-experiments", name: "Pricing Experiments" },
  { id: "mobile-app", name: "Mobile App" },
]

const mockChannels = [
  { id: "general", name: "#general" },
  { id: "development", name: "#development" },
  { id: "design", name: "#design" },
]

const mockAssignees = [
  { id: "sarah", name: "Sarah Chen" },
  { id: "mike", name: "Mike Johnson" },
  { id: "emily", name: "Emily Davis" },
  { id: "tom", name: "Tom Wilson" },
]

export function QuickAddModal({
  open,
  type,
  defaultContext,
  initialValues,
  onClose,
  onCreate,
  onSuccess,
  onError,
}: QuickAddModalProps) {
  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type,
      context: initialValues?.context ?? defaultContext ?? "",
      title: initialValues?.title ?? "",
      assignee: initialValues?.assignee ?? "",
      dueDate: initialValues?.dueDate,
      priority: initialValues?.priority ?? "medium",
    },
  })

  const watchedType = form.watch("type")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const resetForm = React.useCallback(() => {
    form.reset({
      type,
      context: initialValues?.context ?? defaultContext ?? "",
      title: initialValues?.title ?? "",
      assignee: initialValues?.assignee ?? "",
      dueDate: initialValues?.dueDate,
      priority: initialValues?.priority ?? "medium",
    })
  }, [defaultContext, form, initialValues, type])

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const getContextOptions = React.useCallback(() => {
    switch (watchedType) {
      case "task":
        return [...mockProjects, ...mockChannels]
      case "project":
        return mockProjects
      case "doc":
        return [...mockProjects, ...mockChannels]
      case "channel":
        return mockProjects
      case "event":
        return [...mockProjects, ...mockChannels]
      default:
        return []
    }
  }, [watchedType])

  const handleSubmit = async (values: QuickAddFormValues) => {
    const payload: QuickAddSubmitPayload = {
      ...values,
      context: values.context || undefined,
      assignee: values.assignee || undefined,
      dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      priority: values.priority ?? "medium",
    }

    setIsSubmitting(true)
    try {
      if (onCreate) {
        await onCreate(payload)
      }
      onSuccess?.(payload)
      onClose()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        onError?.(error)
      } else {
        onError?.(new Error("Unable to create item"))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose()
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {typeOptions.map((option) => {
                      const Icon = option.icon
                      const isSelected = field.value === option.value

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-auto p-3 flex flex-col gap-1"
                          onClick={() => field.onChange(option.value)}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs">{option.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(watchedType === "task" || watchedType === "doc" || watchedType === "event") && (
              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project or channel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getContextOptions().map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`Enter ${watchedType} title...`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockAssignees.map((assignee) => (
                          <SelectItem key={assignee.id} value={assignee.id}>
                            {assignee.name}
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {priorityOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={field.value === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(option.value)}
                        className="flex items-center gap-2"
                      >
                        <span className={cn("w-2 h-2 rounded-full", option.color)} />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose()
                  resetForm()
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : `Create ${watchedType.charAt(0).toUpperCase() + watchedType.slice(1)}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
