"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { 
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Video,
  MoreHorizontal,
  Grid3X3,
  List
} from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  type: 'meeting' | 'task' | 'reminder' | 'deadline' | 'event'
  status: 'confirmed' | 'tentative' | 'cancelled'
  attendees?: Array<{
    name: string
    avatar?: string
    status?: 'accepted' | 'declined' | 'tentative'
  }>
  location?: string
  isVirtual?: boolean
  color?: string
  allDay?: boolean
}

type ViewType = 'month' | 'week' | 'day'

const mockEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Sprint Planning Meeting",
    description: "Q4 sprint planning and task allocation",
    start: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    end: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 * 2), // 2 hours
    type: "meeting",
    status: "confirmed",
    attendees: [
      { name: "Alex Chen", avatar: "/avatars/alex.jpg", status: "accepted" },
      { name: "Sarah Miller", avatar: "/avatars/sarah.jpg", status: "accepted" },
      { name: "Mike Johnson", avatar: "/avatars/mike.jpg", status: "tentative" }
    ],
    location: "Conference Room A",
    color: "#3b82f6"
  },
  {
    id: "2",
    title: "Design Review",
    description: "Review new landing page designs",
    start: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 * 4), // Tomorrow 4pm
    end: new Date(Date.now() + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 * 5), // 1 hour
    type: "meeting",
    status: "confirmed",
    attendees: [
      { name: "Sarah Miller", avatar: "/avatars/sarah.jpg", status: "accepted" },
      { name: "Emma Davis", status: "accepted" }
    ],
    isVirtual: true,
    color: "#8b5cf6"
  },
  {
    id: "3",
    title: "API Documentation Deadline",
    start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
    end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    type: "deadline",
    status: "confirmed",
    color: "#ef4444"
  },
  {
    id: "4",
    title: "Team Standup",
    start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 9), // In 2 days at 9am
    end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 9.5), // 30 minutes
    type: "meeting",
    status: "confirmed",
    attendees: [
      { name: "Alex Chen", avatar: "/avatars/alex.jpg", status: "accepted" },
      { name: "Sarah Miller", avatar: "/avatars/sarah.jpg", status: "accepted" },
      { name: "Mike Johnson", avatar: "/avatars/mike.jpg", status: "accepted" },
      { name: "Emma Davis", status: "accepted" }
    ],
    isVirtual: true,
    color: "#10b981"
  },
  {
    id: "5",
    title: "Code Review Session",
    description: "Review authentication module implementation",
    start: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 14), // In 2 days at 2pm
    end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 15), // 1 hour
    type: "meeting",
    status: "tentative",
    attendees: [
      { name: "Alex Chen", avatar: "/avatars/alex.jpg", status: "accepted" },
      { name: "Mike Johnson", avatar: "/avatars/mike.jpg", status: "tentative" }
    ],
    color: "#f59e0b"
  }
]

function MonthView({ currentDate, events, onEventClick, onDateClick }: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
}) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  const days: Date[] = []
  const current = new Date(startDate)
  
  while (current <= lastDay || current.getDay() !== 0) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      const checkDate = new Date(date)
      return eventStart.toDateString() === checkDate.toDateString() ||
             (eventStart <= checkDate && eventEnd >= checkDate)
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month
  }

  return (
    <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-surface-elevated p-3 text-center border-r border-border last:border-r-0">
          <div className="text-sm font-medium">{day}</div>
        </div>
      ))}
      
      {/* Calendar days */}
      {days.map((date, index) => {
        const dayEvents = getEventsForDate(date)
        const isCurrentDay = isToday(date)
        const inCurrentMonth = isCurrentMonth(date)
        
        return (
          <div
            key={index}
            className={cn(
              "min-h-24 p-2 border-r border-b border-border last:border-r-0 cursor-pointer transition-colors",
              "hover:bg-accent/30",
              isCurrentDay && "bg-brand/5",
              !inCurrentMonth && "bg-muted/30 opacity-50"
            )}
            onClick={() => onDateClick(date)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-sm font-medium",
                isCurrentDay && "text-brand",
                !inCurrentMonth && "text-muted-foreground"
              )}>
                {date.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1">
                  {dayEvents.length}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "text-xs p-1 rounded truncate cursor-pointer hover:opacity-80",
                    "text-white",
                    event.status === 'cancelled' && "opacity-50 line-through"
                  )}
                  style={{ backgroundColor: event.color || "#3b82f6" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventClick(event)
                  }}
                >
                  {event.allDay ? event.title : `${event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${event.title}`}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({ currentDate, events, onEventClick, onDateClick }: {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDateClick: (date: Date) => void
}) {
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    weekDays.push(day)
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getEventsForDateTime = (date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      const checkStart = new Date(date)
      checkStart.setHours(hour, 0, 0, 0)
      const checkEnd = new Date(date)
      checkEnd.setHours(hour + 1, 0, 0, 0)
      
      return (eventStart < checkEnd && eventEnd > checkStart)
    })
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-8">
        {/* Time column */}
        <div className="bg-surface-elevated border-r border-border">
          <div className="h-12 border-b border-border" />
          {hours.map(hour => (
            <div key={hour} className="h-12 border-b border-border/30 px-2 py-1">
              <div className="text-xs text-muted-foreground">
                {hour.toString().padStart(2, '0')}:00
              </div>
            </div>
          ))}
        </div>
        
        {/* Day columns */}
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="flex-1 border-r border-border last:border-r-0">
            {/* Day header */}
            <div className="h-12 bg-surface-elevated border-b border-border p-2 text-center">
              <div className="text-sm font-medium">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={cn(
                "text-xs",
                day.toDateString() === new Date().toDateString() && "text-brand font-medium"
              )}>
                {day.getDate()}
              </div>
            </div>
            
            {/* Hour slots */}
            {hours.map(hour => {
              const hourEvents = getEventsForDateTime(day, hour)
              
              return (
                <div
                  key={hour}
                  className="h-12 border-b border-border/30 relative cursor-pointer hover:bg-accent/20"
                  onClick={() => onDateClick(new Date(day.setHours(hour)))}
                >
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "absolute inset-x-1 top-0 bottom-0 rounded p-1 text-xs text-white truncate cursor-pointer hover:opacity-80",
                        event.status === 'cancelled' && "opacity-50 line-through"
                      )}
                      style={{ backgroundColor: event.color || "#3b82f6" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {!event.allDay && (
                        <div className="opacity-80">
                          {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="h-4 w-4" />
      case 'task': return <CalendarIcon className="h-4 w-4" />
      case 'reminder': return <Clock className="h-4 w-4" />
      case 'deadline': return <Clock className="h-4 w-4" />
      default: return <CalendarIcon className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'tentative': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: event.color || "#3b82f6" }}
            />
            <div>
              <CardTitle className="text-lg">{event.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn("text-xs", getStatusColor(event.status))}>
                  {event.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {event.type}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {event.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {event.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {event.start.toLocaleString()} - {event.end.toLocaleString()}
            </span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          
          {event.isVirtual && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span>Virtual Meeting</span>
            </div>
          )}
          
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {event.attendees.slice(0, 3).map((attendee, index) => (
                  <Avatar key={index} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={attendee.avatar} alt={attendee.name} />
                    <AvatarFallback className="text-[8px]">
                      {attendee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {event.attendees.length > 3 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-[8px]">+{event.attendees.length - 3}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [viewType, setViewType] = React.useState<ViewType>('month')
  const [events] = React.useState<CalendarEvent[]>(mockEvents)
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsCreatingEvent(true)
  }

  const handleCreateEvent = () => {
    console.log("Create event for:", selectedDate)
    setIsCreatingEvent(false)
    setSelectedDate(null)
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Calendar View</h2>
          <p className="text-muted-foreground">
            Schedule and manage events with drag to create functionality
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg">
            <Button
              variant={viewType === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('month')}
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              Month
            </Button>
            <Button
              variant={viewType === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('week')}
            >
              <List className="h-4 w-4 mr-1" />
              Week
            </Button>
          </div>
          
          <Button variant="outline" onClick={navigateToday}>
            Today
          </Button>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-32 text-center font-medium">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric',
                ...(viewType !== 'month' && { day: 'numeric' })
              })}
            </span>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          {viewType === 'month' ? (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events
                  .filter(event => event.start > new Date())
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-lg border border-border cursor-pointer hover:bg-accent/50"
                      onClick={() => handleEventClick(event)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color || "#3b82f6" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{event.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.start.toLocaleDateString()} at {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Mini Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Events</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">This Week</span>
                  <span className="font-medium">
                    {events.filter(e => {
                      const start = new Date(e.start)
                      const now = new Date()
                      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                      return start >= now && start <= weekEnd
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium">
                    {events.filter(e => e.status === 'tentative').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Event Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEvent(null)}
                >
                  ×
                </Button>
              </div>
              <EventCard event={selectedEvent} onClick={() => {}} />
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreatingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Event</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreatingEvent(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <div className="mt-1 p-2 bg-surface-elevated rounded">
                    {selectedDate?.toLocaleDateString()}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Event Title</label>
                  <input
                    type="text"
                    placeholder="Enter event title"
                    className="mt-1 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreatingEvent(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent}>
                    Create Event
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
