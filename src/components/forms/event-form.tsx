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
  Clock, 
  MapPin, 
  Video, 
  Users, 
  Bell,
  Plus,
  X,
  Globe
} from "lucide-react"
import { format, addMinutes } from "date-fns"

// Form validation schema
const eventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  date: z.date({
    required_error: "Event date is required",
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
  locationType: z.enum(["physical", "virtual", "hybrid"], {
    required_error: "Please select location type",
  }),
  location: z.string().optional(),
  meetingLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
  reminders: z.array(z.string()).optional(),
}).refine((data) => {
  // Validate that end time is after start time
  if (data.startTime && data.endTime) {
    const start = new Date(`2000-01-01T${data.startTime}`)
    const end = new Date(`2000-01-01T${data.endTime}`)
    return end > start
  }
  return true
}, {
  message: "End time must be after start time",
  path: ["endTime"],
}).refine((data) => {
  // Validate location requirements
  if (data.locationType === "physical" && !data.location) {
    return false
  }
  if (data.locationType === "virtual" && !data.meetingLink) {
    return false
  }
  if (data.locationType === "hybrid" && (!data.location || !data.meetingLink)) {
    return false
  }
  return true
}, {
  message: "Location details are required based on location type",
  path: ["location"],
})

type EventValues = z.infer<typeof eventSchema>

interface EventFormProps {
  children?: React.ReactNode
  initialData?: Partial<EventValues>
  mode?: "create" | "edit"
  onSuccess?: (data: EventValues) => void
  onCancel?: () => void
}

const locationTypeOptions = [
  { 
    value: "physical", 
    label: "In Person", 
    icon: MapPin,
    description: "Physical location"
  },
  { 
    value: "virtual", 
    label: "Virtual", 
    icon: Video,
    description: "Online meeting"
  },
  { 
    value: "hybrid", 
    label: "Hybrid", 
    icon: Users,
    description: "Both physical and virtual"
  },
]

const reminderOptions = [
  { value: "5", label: "5 minutes before" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
]

const timeSlots = []
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    timeSlots.push(time)
  }
}

const mockUsers = [
  { id: "1", name: "Sarah Chen", email: "sarah@company.com", avatar: "" },
  { id: "2", name: "Mike Johnson", email: "mike@company.com", avatar: "" },
  { id: "3", name: "Emily Davis", email: "emily@company.com", avatar: "" },
  { id: "4", name: "Tom Wilson", email: "tom@company.com", avatar: "" },
  { id: "5", name: "Lisa Anderson", email: "lisa@company.com", avatar: "" },
]

export function EventForm({ 
  children, 
  initialData,
  mode = "create",
  onSuccess,
  onCancel
}: EventFormProps) {
  const [open, setOpen] = React.useState(false)
  const [attendees, setAttendees] = React.useState<string[]>(initialData?.attendees || [])
  const [reminders, setReminders] = React.useState<string[]>(initialData?.reminders || [])

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      attendees: [],
      locationType: "virtual",
      location: "",
      meetingLink: "",
      description: "",
      reminders: [],
      ...initialData,
    },
  })

  const watchedLocationType = form.watch("locationType")

  const onSubmit = (data: EventValues) => {
    const finalData = { ...data, attendees, reminders }
    console.log("Event data:", finalData)
    onSuccess?.(finalData)
    setOpen(false)
    if (mode === "create") {
      form.reset()
      setAttendees([])
      setReminders([])
    }
  }

  const addAttendee = (userId: string) => {
    if (!attendees.includes(userId)) {
      const newAttendees = [...attendees, userId]
      setAttendees(newAttendees)
      form.setValue("attendees", newAttendees)
    }
  }

  const removeAttendee = (userId: string) => {
    const newAttendees = attendees.filter(id => id !== userId)
    setAttendees(newAttendees)
    form.setValue("attendees", newAttendees)
  }

  const addReminder = (value: string) => {
    if (!reminders.includes(value)) {
      const newReminders = [...reminders, value]
      setReminders(newReminders)
      form.setValue("reminders", newReminders)
    }
  }

  const removeReminder = (value: string) => {
    const newReminders = reminders.filter(r => r !== value)
    setReminders(newReminders)
    form.setValue("reminders", newReminders)
  }

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user?.name || userId
  }

  const getReminderLabel = (value: string) => {
    const option = reminderOptions.find(r => r.value === value)
    return option?.label || value
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Event" : "Edit Event"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter event title..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
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
                              format(field.value, "MMM dd, yyyy")
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

              {/* Start Time */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Start time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="End time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location Type */}
            <FormField
              control={form.control}
              name="locationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type *</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {locationTypeOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <div
                          key={option.value}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                            field.value === option.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-accent"
                          )}
                          onClick={() => field.onChange(option.value)}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Details */}
            {(watchedLocationType === "physical" || watchedLocationType === "hybrid") && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedLocationType === "hybrid" ? "Physical Location" : "Location"} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter address or location..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(watchedLocationType === "virtual" || watchedLocationType === "hybrid") && (
              <FormField
                control={form.control}
                name="meetingLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedLocationType === "hybrid" ? "Meeting Link" : "Meeting URL"} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://zoom.us/j/..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Attendees */}
            <div>
              <FormLabel>Attendees *</FormLabel>
              <div className="space-y-3">
                {/* Current Attendees */}
                {attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((attendeeId) => (
                      <Badge
                        key={attendeeId}
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1"
                      >
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xs">
                          {getUserName(attendeeId).charAt(0)}
                        </div>
                        {getUserName(attendeeId)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeAttendee(attendeeId)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Attendee */}
                <div className="flex gap-2">
                  <Select onValueChange={addAttendee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add attendees..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers
                        .filter(user => !attendees.includes(user.id))
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add event description and agenda..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reminders */}
            <div>
              <FormLabel>Reminders</FormLabel>
              <div className="space-y-3">
                {/* Current Reminders */}
                {reminders.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {reminders.map((reminder) => (
                      <Badge
                        key={reminder}
                        variant="outline"
                        className="flex items-center gap-2 px-3 py-1"
                      >
                        <Bell className="h-3 w-3" />
                        {getReminderLabel(reminder)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeReminder(reminder)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Reminder */}
                <div className="flex gap-2">
                  <Select onValueChange={addReminder}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add reminder..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reminderOptions
                        .filter(option => !reminders.includes(option.value))
                        .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
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
                {mode === "create" ? "Create Event" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}