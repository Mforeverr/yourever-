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
import { AssigneeSelector } from "@/components/ui/assignee-selector"
import { 
  Hash, 
  Lock, 
  Users, 
  Plus,
  X,
  Globe,
  Shield
} from "lucide-react"

// Form validation schema
const channelSchema = z.object({
  name: z.string()
    .min(1, "Channel name is required")
    .regex(/^[a-z0-9-_]+$/, "Channel name can only contain lowercase letters, numbers, hyphens, and underscores")
    .max(21, "Channel name must be 21 characters or less"),
  visibility: z.enum(["public", "private"]),
  defaultMembers: z.array(z.string()).optional(),
  description: z.string().max(250, "Description must be 250 characters or less").optional(),
})

type ChannelValues = z.infer<typeof channelSchema>

interface ChannelFormProps {
  children?: React.ReactNode
  initialData?: Partial<ChannelValues>
  mode?: "create" | "edit"
  onSuccess?: (data: ChannelValues) => void
  onCancel?: () => void
}

const visibilityOptions = [
  { 
    value: "public", 
    label: "Public", 
    icon: Globe,
    description: "Anyone can see and join this channel"
  },
  { 
    value: "private", 
    label: "Private", 
    icon: Lock,
    description: "Only invited members can see and join this channel"
  },
]

const mockUsers = [
  { id: "1", name: "Sarah Chen", email: "sarah@company.com", avatar: "" },
  { id: "2", name: "Mike Johnson", email: "mike@company.com", avatar: "" },
  { id: "3", name: "Emily Davis", email: "emily@company.com", avatar: "" },
  { id: "4", name: "Tom Wilson", email: "tom@company.com", avatar: "" },
  { id: "5", name: "Lisa Anderson", email: "lisa@company.com", avatar: "" },
]

export function ChannelForm({ 
  children, 
  initialData,
  mode = "create",
  onSuccess,
  onCancel
}: ChannelFormProps) {
  const [open, setOpen] = React.useState(false)
  const [defaultMembers, setDefaultMembers] = React.useState<string[]>(initialData?.defaultMembers || [])

  const form = useForm<ChannelValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      visibility: "public",
      defaultMembers: [],
      description: "",
      ...initialData,
    },
  })

  const watchedVisibility = form.watch("visibility")

  const onSubmit = (data: ChannelValues) => {
    const finalData = { ...data, defaultMembers }
    console.log("Channel data:", finalData)
    onSuccess?.(finalData)
    setOpen(false)
    if (mode === "create") {
      form.reset()
      setDefaultMembers([])
    }
  }

  const addMember = (userId: string) => {
    if (!defaultMembers.includes(userId)) {
      const newMembers = [...defaultMembers, userId]
      setDefaultMembers(newMembers)
      form.setValue("defaultMembers", newMembers)
    }
  }

  const removeMember = (userId: string) => {
    const newMembers = defaultMembers.filter(id => id !== userId)
    setDefaultMembers(newMembers)
    form.setValue("defaultMembers", newMembers)
  }

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user?.name || userId
  }

  const formatChannelName = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Channel" : "Edit Channel"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Channel Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {watchedVisibility === "private" ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                      </div>
                      <Input 
                        placeholder="e.g., project-alpha"
                        className="pl-10"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatChannelName(e.target.value)
                          field.onChange(formatted)
                        }}
                      />
                    </div>
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
                    <Input
                      placeholder="What's this channel about?"
                      maxLength={250}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility *</FormLabel>
                  <div className="space-y-3">
                    {visibilityOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <div
                          key={option.value}
                          className={cn(
                            "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                            field.value === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent"
                          )}
                          onClick={() => field.onChange(option.value)}
                        >
                          <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border-2 mt-1",
                              field.value === option.value
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            )}
                          >
                            {field.value === option.value && (
                              <div className="w-full h-full rounded-full bg-white scale-50" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Members */}
            <div>
              <FormLabel>Default Members</FormLabel>
              <p className="text-sm text-muted-foreground mb-3">
                Add team members who should be in this channel by default
              </p>
              
              {/* Current Members */}
              {defaultMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {defaultMembers.map((memberId) => (
                    <Badge
                      key={memberId}
                      variant="secondary"
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs">
                        {getUserName(memberId).charAt(0)}
                      </div>
                      {getUserName(memberId)}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeMember(memberId)}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Member */}
              <div className="flex gap-2">
                <Select onValueChange={addMember}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add members..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers
                      .filter(user => !defaultMembers.includes(user.id))
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

            {/* Channel Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Preview</div>
              <div className="flex items-center gap-2">
                {watchedVisibility === "private" ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Hash className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-mono">
                  {form.getValues("name") || "channel-name"}
                </span>
              </div>
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
                {mode === "create" ? "Create Channel" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
