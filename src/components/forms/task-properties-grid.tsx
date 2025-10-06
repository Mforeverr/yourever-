'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { AssigneeSelector } from "@/components/ui/assignee-selector"
import { 
  Calendar as CalendarIcon, 
  Flag, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  Plus,
  X
} from "lucide-react"
import { format } from "date-fns"

// Form validation schema
const taskPropertiesSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["on_track", "stuck", "untouched"]).optional(),
  tags: z.array(z.string()).optional(),
  whyNote: z.string().optional(),
})

type TaskPropertiesValues = z.infer<typeof taskPropertiesSchema>

interface TaskPropertiesGridProps {
  initialData?: Partial<TaskPropertiesValues>
  onSave?: (data: TaskPropertiesValues) => void
  onCancel?: () => void
  readOnly?: boolean
}

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-gray-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
]

const statusOptions = [
  { value: "on_track", label: "On Track", icon: CheckCircle, color: "text-green-600" },
  { value: "stuck", label: "Stuck", icon: AlertCircle, color: "text-red-600" },
  { value: "untouched", label: "Untouched", icon: HelpCircle, color: "text-gray-600" },
]

const commonTags = [
  "bug", "feature", "enhancement", "documentation", "ui", "backend", 
  "frontend", "testing", "deployment", "research", "design", "review"
]

export function TaskPropertiesGrid({ 
  initialData,
  onSave,
  onCancel,
  readOnly = false
}: TaskPropertiesGridProps) {
  const [newTag, setNewTag] = React.useState("")
  const [tags, setTags] = React.useState<string[]>(initialData?.tags || [])

  const form = useForm<TaskPropertiesValues>({
    resolver: zodResolver(taskPropertiesSchema),
    defaultValues: {
      title: "",
      description: "",
      assignee: "",
      priority: "medium",
      status: "untouched",
      tags: [],
      whyNote: "",
      ...initialData,
    },
  })

  const watchedValues = form.watch()

  const onSubmit = (data: TaskPropertiesValues) => {
    const finalData = { ...data, tags }
    console.log("Task properties:", finalData)
    onSave?.(finalData)
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag]
      setTags(newTags)
      form.setValue("tags", newTags)
    }
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove)
    setTags(newTags)
    form.setValue("tags", newTags)
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag(newTag)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Title - Inline Edit */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Task title..."
                    className="text-lg font-medium border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description - Rich Text */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Add a more detailed description..."
                    readOnly={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Properties Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee */}
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assignee
                  </FormLabel>
                  <FormControl>
                    <AssigneeSelector
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Assign to..."
                      disabled={readOnly}
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
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Due Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={readOnly}
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

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Priority
                  </FormLabel>
                  <div className="flex gap-2">
                    {priorityOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={field.value === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => !readOnly && field.onChange(option.value)}
                        disabled={readOnly}
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

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </FormLabel>
                  <div className="flex gap-2">
                    {statusOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => !readOnly && field.onChange(option.value)}
                          disabled={readOnly}
                          className="flex items-center gap-2"
                        >
                          <Icon className={cn("h-4 w-4", option.color)} />
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tags */}
          <div>
            <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tags
            </FormLabel>
            <div className="space-y-2">
              {/* Existing Tags */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    {!readOnly && (
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      />
                    )}
                  </Badge>
                ))}
              </div>

              {/* Add New Tag */}
              {!readOnly && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addTag(newTag)}
                    disabled={!newTag || tags.includes(newTag)}
                  >
                    Add
                  </Button>
                </div>
              )}

              {/* Common Tags */}
              {!readOnly && (
                <div className="flex flex-wrap gap-1">
                  {commonTags.slice(0, 8).map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addTag(tag)}
                      disabled={tags.includes(tag)}
                      className="h-6 px-2 text-xs"
                    >
                      +{tag}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Why Note - Short Rich Text */}
          <FormField
            control={form.control}
            name="whyNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Why Note
                </FormLabel>
                <FormControl>
                  <RichTextEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Why is this task important? What's the context?"
                    readOnly={readOnly}
                    minimal={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Actions */}
          {!readOnly && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}