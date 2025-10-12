import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Plus
} from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type?: 'default' | 'meeting' | 'deadline' | 'reminder'
  color?: string
  time?: string
}

interface CalendarGridProps extends React.HTMLAttributes<HTMLDivElement> {
  events: CalendarEvent[]
  currentMonth?: Date
  onMonthChange?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onEventAdd?: (date: Date) => void
  showWeekNumbers?: boolean
  compact?: boolean
}

function CalendarGrid({
  events,
  currentMonth = new Date(),
  onMonthChange,
  onEventClick,
  onDateClick,
  onEventAdd,
  showWeekNumbers = false,
  compact = false,
  className,
  ...props
}: CalendarGridProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    onMonthChange?.(newDate)
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getEventColor = (type?: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500'
      case 'deadline': return 'bg-red-500'
      case 'reminder': return 'bg-yellow-500'
      default: return 'bg-brand'
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })

  const renderCalendarDays = () => {
    const days: React.ReactNode[] = []
    const today = new Date()
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 border border-border/50 bg-muted/20" />
      )
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isToday = date.toDateString() === today.toDateString()
      const isSelected = selectedDate?.toDateString() === date.toDateString()
      
      days.push(
        <div
          key={day}
          className={cn(
            "h-20 border border-border/50 p-1 cursor-pointer transition-colors",
            "hover:bg-accent/50",
            isToday && "bg-brand/10 border-brand/50",
            isSelected && "bg-accent border-accent",
            compact && "h-16"
          )}
          onClick={() => {
            setSelectedDate(date)
            onDateClick?.(date)
          }}
        >
          <div className="flex items-start justify-between mb-1">
            <span className={cn(
              "text-sm font-medium",
              isToday && "text-brand"
            )}>
              {day}
            </span>
            {onEventAdd && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onEventAdd(date)
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, compact ? 1 : 2).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "text-xs px-1 py-0.5 rounded truncate cursor-pointer",
                  "text-white hover:opacity-80",
                  getEventColor(event.type)
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
              >
                {event.time && `${event.time} `}{event.title}
              </div>
            ))}
            {dayEvents.length > (compact ? 1 : 2) && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - (compact ? 1 : 2)} more
              </div>
            )}
          </div>
        </div>
      )
    }
    
    return days
  }

  return (
    <Card className={cn("", className)} {...props}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {monthName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-0">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="h-8 border border-border/50 bg-muted/30 p-2 text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {renderCalendarDays()}
        </div>
      </CardContent>
    </Card>
  )
}

export { CalendarGrid, type CalendarEvent }
