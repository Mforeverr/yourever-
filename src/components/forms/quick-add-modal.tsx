'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Plus, 
  Calendar as CalendarIcon, 
  User, 
  Flag, 
  Hash, 
  FileText, 
  Video,
  X,
  Check
} from "lucide-react"
import { format } from "date-fns"
import { AssigneeSelector } from "@/components/ui/assignee-selector"

// Form validation schemas
const quickAddSchema = z.object({
  type: z.enum(["task", "project", "doc", "channel", "event"], {
    required_error: "Please select a type",
  }),
  context: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
})

type QuickAddValues = z.infer<typeof quickAddSchema>

interface QuickAddModalProps {
  children?: React.ReactNode
  defaultType?: "task" | "project" | "doc" | "channel" | "event"
  defaultContext?: string
  onSuccess?: (data: QuickAddValues) => void
}

const typeOptions = [
  { value: "task", label: "Task", icon: Check },
  { value: "project", label: "Project", icon: Hash },
  { value: "doc", label: "Document", icon: FileText },
  { value: "channel", label: "Channel", icon: Hash },
  { value: "event", label: "Event", icon: Video },
]

const priorityOptions = [
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

export function QuickAddModal({ 
  children, 
  defaultType = "task",
  defaultContext,
  onSuccess 
}: QuickAddModalProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<"task" | "project" | "doc" | "channel" | "event">(defaultType)

  const form = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type: defaultType,
      context: defaultContext,
      title: "",
      assignee: "",
      priority: "medium",
    },
  })

  const watchedType = form.watch("type")

  React.useEffect(() => {
    setSelectedType(watchedType)
  }, [watchedType])

  const onSubmit = (data: QuickAddValues) => {
    console.log("Quick add data:", data)
    onSuccess?.(data)
    setOpen(false)
    form.reset()
  }

  const getContextOptions = () => {
    switch (selectedType) {
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
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <div className="grid grid-cols-5 gap-2">
                    {typeOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <FormField
                          key={option.value}
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant={field.value === option.value ? "default" : "outline"}
                                  className="h-auto p-3 flex flex-col gap-1"
                                  onClick={() => field.onChange(option.value)}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="text-xs">{option.label}</span>
                                </Button>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Context Selection */}
            {(selectedType === "task" || selectedType === "doc" || selectedType === "event") && (
              <FormField
                control={form.control}
                name="context"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={`Enter ${selectedType} title...`}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <FormField
                control={form.control}
                name="assignee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <FormControl>
                      <AssigneeSelector
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Assign to..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date */}
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
                            {field.value ? (
                              format(field.value, "PPP")
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

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <div className="flex gap-2">
                    {priorityOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={field.value === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(option.value)}
                        className="flex items-center gap-2"
                      >
                        <div className={cn("w-2 h-2 rounded-full", option.color)} />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}