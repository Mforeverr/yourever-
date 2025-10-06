import * as React from "react"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Input } from "./input"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"
import { 
  Calendar as CalendarIcon,
  Clock,
  X
} from "lucide-react"
import { format } from "date-fns"

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  showTime?: boolean
  format?: string
  minDate?: Date
  maxDate?: Date
  clearable?: boolean
}

function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  disabled = false,
  showTime = false,
  format = "PPP",
  minDate,
  maxDate,
  clearable = true,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(value || null)

  React.useEffect(() => {
    setSelectedDate(value || null)
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      onChange?.(date)
      setOpen(false)
    }
  }

  const handleClear = () => {
    setSelectedDate(null)
    onChange?.(null)
  }

  const formatDate = (date: Date) => {
    if (showTime) {
      return format(date, "PPP p")
    }
    return format(date, format)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            "hover:bg-accent/50",
            !selectedDate && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {selectedDate ? (
              <span className="truncate">{formatDate(selectedDate)}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          
          {clearable && selectedDate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={handleDateSelect}
          initialFocus
          disabled={(date) => {
            if (disabled) return true
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
        />
        
        {showTime && selectedDate && (
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={format(selectedDate, "HH:mm")}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':')
                  const newDate = new Date(selectedDate)
                  newDate.setHours(parseInt(hours), parseInt(minutes))
                  setSelectedDate(newDate)
                  onChange?.(newDate)
                }}
                className="h-8"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: { from?: Date; to?: Date } | null
  onChange?: (range: { from?: Date; to?: Date } | null) => void
  placeholder?: string
  disabled?: boolean
  format?: string
  minDate?: Date
  maxDate?: Date
  clearable?: boolean
}

function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range...",
  disabled = false,
  format = "PPP",
  minDate,
  maxDate,
  clearable = true,
  className,
  ...props
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedRange, setSelectedRange] = React.useState<{ from?: Date; to?: Date } | null>(value || null)

  React.useEffect(() => {
    setSelectedRange(value || null)
  }, [value])

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setSelectedRange(range)
      onChange?.(range)
      if (range.from && range.to) {
        setOpen(false)
      }
    }
  }

  const handleClear = () => {
    setSelectedRange(null)
    onChange?.(null)
  }

  const formatRange = (range: { from?: Date; to?: Date }) => {
    if (!range.from) return ""
    if (!range.to) return format(range.from, format)
    return `${format(range.from, format)} - ${format(range.to, format)}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            "hover:bg-accent/50",
            !selectedRange?.from && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            {selectedRange?.from ? (
              <span className="truncate">{formatRange(selectedRange)}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          
          {clearable && selectedRange?.from && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selectedRange || undefined}
          onSelect={handleRangeSelect}
          initialFocus
          numberOfMonths={2}
          disabled={(date) => {
            if (disabled) return true
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker }