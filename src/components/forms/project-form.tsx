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
import { AssigneeSelector } from "@/components/ui/assignee-selector"
import { 
  Calendar as CalendarIcon, 
  Users, 
  User, 
  LayoutGrid, 
  List,
  Plus,
  X
} from "lucide-react"
import { format } from "date-fns"

// Form validation schema
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  lead: z.string().min(1, "Project lead is required"),
  members: z.array(z.string()).min(1, "At least one member is required"),
  defaultView: z.enum(["board", "list"], {
    required_error: "Please select a default view",
  }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["endDate"],
})

type ProjectValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  children?: React.ReactNode
  initialData?: Partial<ProjectValues>
  mode?: "create" | "edit"
  onSuccess?: (data: ProjectValues) => void
  onCancel?: () => void
}

const viewOptions = [
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
]

const mockUsers = [
  { id: "1", name: "Sarah Chen", email: "sarah@company.com", avatar: "" },
  { id: "2", name: "Mike Johnson", email: "mike@company.com", avatar: "" },
  { id: "3", name: "Emily Davis", email: "emily@company.com", avatar: "" },
  { id: "4", name: "Tom Wilson", email: "tom@company.com", avatar: "" },
  { id: "5", name: "Lisa Anderson", email: "lisa@company.com", avatar: "" },
]

export function ProjectForm({ 
  children, 
  initialData,
  mode = "create",
  onSuccess,
  onCancel
}: ProjectFormProps) {
  const [open, setOpen] = React.useState(false)
  const [members, setMembers] = React.useState<string[]>(initialData?.members || [])

  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      lead: "",
      members: [],
      defaultView: "board",
      ...initialData,
    },
  })

  const watchedLead = form.watch("lead")

  // Add lead to members if not already present
  React.useEffect(() => {
    if (watchedLead && !members.includes(watchedLead)) {
      const newMembers = [...members, watchedLead]
      setMembers(newMembers)
      form.setValue("members", newMembers)
    }
  }, [watchedLead, members, form])

  const onSubmit = (data: ProjectValues) => {
    const finalData = { ...data, members }
    console.log("Project data:", finalData)
    onSuccess?.(finalData)
    setOpen(false)
    if (mode === "create") {
      form.reset()
      setMembers([])
    }
  }

  const addMember = (userId: string) => {
    if (!members.includes(userId)) {
      const newMembers = [...members, userId]
      setMembers(newMembers)
      form.setValue("members", newMembers)
    }
  }

  const removeMember = (userId: string) => {
    // Don't remove the lead
    if (userId === watchedLead) return
    
    const newMembers = members.filter(id => id !== userId)
    setMembers(newMembers)
    form.setValue("members", newMembers)
  }

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user?.name || userId
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Project" : "Edit Project"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter project name..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the project goals and scope..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Lead */}
            <FormField
              control={form.control}
              name="lead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Lead *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project lead" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Members */}
            <div>
              <FormLabel>Team Members *</FormLabel>
              <div className="space-y-3">
                {/* Current Members */}
                <div className="flex flex-wrap gap-2">
                  {members.map((memberId) => (
                    <Badge
                      key={memberId}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs">
                        {getUserName(memberId).charAt(0)}
                      </div>
                      {getUserName(memberId)}
                      {memberId !== watchedLead && (
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeMember(memberId)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>

                {/* Add Member */}
                <div className="flex gap-2">
                  <Select onValueChange={addMember}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers
                        .filter(user => !members.includes(user.id))
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Default View */}
            <FormField
              control={form.control}
              name="defaultView"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default View *</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {viewOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={field.value === option.value ? "default" : "outline"}
                          className="h-auto p-4 flex flex-col gap-2"
                          onClick={() => field.onChange(option.value)}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="font-medium">{option.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Project Dates */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
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
                          disabled={(date) => {
                            const startDate = form.getValues("startDate")
                            return startDate ? date < startDate : false
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  onCancel?.()
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {mode === "create" ? "Create Project" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}