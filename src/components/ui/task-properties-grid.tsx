import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { PriorityBadge } from "./priority-badge"
import { StatusBadge } from "./status-badge"
import { formatDate } from '@/lib/date-utils'
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  MessageSquare,
  Paperclip,
  Edit2,
  Save,
  X
} from "lucide-react"

interface TaskProperty {
  key: string
  label: string
  value: any
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'avatar' | 'badge' | 'status' | 'priority'
  options?: string[]
  editable?: boolean
  icon?: React.ReactNode
}

interface TaskPropertiesGridProps extends React.HTMLAttributes<HTMLDivElement> {
  taskId: string
  properties: TaskProperty[]
  onPropertyChange?: (key: string, value: any) => void
  editable?: boolean
  columns?: number
  compact?: boolean
}

function TaskPropertiesGrid({
  taskId,
  properties,
  onPropertyChange,
  editable = false,
  columns = 2,
  compact = false,
  className,
  ...props
}: TaskPropertiesGridProps) {
  const [editingProperty, setEditingProperty] = React.useState<string | null>(null)
  const [editValues, setEditValues] = React.useState<Record<string, any>>({})

  const startEditing = (key: string, currentValue: any) => {
    setEditingProperty(key)
    setEditValues({ ...editValues, [key]: currentValue })
  }

  const saveEdit = (key: string) => {
    onPropertyChange?.(key, editValues[key])
    setEditingProperty(null)
  }

  const cancelEdit = (key: string) => {
    setEditingProperty(null)
    const newEditValues = { ...editValues }
    delete newEditValues[key]
    setEditValues(newEditValues)
  }

  const renderPropertyValue = (property: TaskProperty) => {
    const isEditing = editingProperty === property.key
    const currentValue = property.value

    if (isEditing && editable) {
      switch (property.type) {
        case 'text':
          return (
            <Input
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
        
        case 'textarea':
          return (
            <Textarea
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="min-h-20 resize-none"
              autoFocus
            />
          )
        
        case 'select':
          return (
            <Select
              value={editValues[property.key] || ''}
              onValueChange={(value) => setEditValues({ ...editValues, [property.key]: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {property.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        
        case 'date':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editValues[property.key] ? formatDate(editValues[property.key]) : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={editValues[property.key] ? new Date(editValues[property.key]) : undefined}
                  onSelect={(date) => setEditValues({ ...editValues, [property.key]: date?.toISOString() })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )
        
        case 'number':
          return (
            <Input
              type="number"
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
        
        default:
          return (
            <Input
              value={editValues[property.key] || ''}
              onChange={(e) => setEditValues({ ...editValues, [property.key]: e.target.value })}
              className="h-8"
              autoFocus
            />
          )
      }
    }

    // Display mode
    switch (property.type) {
      case 'status':
        return currentValue ? <StatusBadge status={currentValue} /> : <span className="text-muted-foreground">Not set</span>
      
      case 'priority':
        return currentValue ? <PriorityBadge priority={currentValue} /> : <span className="text-muted-foreground">Not set</span>
      
      case 'avatar':
        if (!currentValue) return <span className="text-muted-foreground">Not assigned</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={currentValue.avatar} alt={currentValue.name} />
              <AvatarFallback className="text-xs">
                {currentValue.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{currentValue.name}</span>
          </div>
        )
      
      case 'badge':
        if (!currentValue || !Array.isArray(currentValue)) return <span className="text-muted-foreground">None</span>
        return (
          <div className="flex flex-wrap gap-1">
            {currentValue.map((badge: string) => (
              <Badge key={badge} variant="outline" className="text-xs">
                {badge}
              </Badge>
            ))}
          </div>
        )
      
      case 'date':
        if (!currentValue) return <span className="text-muted-foreground">No date set</span>
        return <span>{formatDate(currentValue)}</span>
      
      case 'textarea':
        return currentValue ? (
          <p className="text-sm line-clamp-3">{currentValue}</p>
        ) : (
          <span className="text-muted-foreground">No description</span>
        )
      
      default:
        return currentValue ? (
          <span className="text-sm">{String(currentValue)}</span>
        ) : (
          <span className="text-muted-foreground">Not set</span>
        )
    }
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <Card className={cn("", className)} {...props}>
      <CardHeader className={cn(compact && "pb-3")}>
        <CardTitle className={cn("text-lg", compact && "text-base")}>
          Task Properties
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-4", gridCols[columns as keyof typeof gridCols])}>
          {properties.map((property) => (
            <div key={property.key} className="space-y-2">
              <div className="flex items-center gap-2">
                {property.icon}
                <label className="text-sm font-medium text-muted-foreground">
                  {property.label}
                </label>
                {editable && property.editable !== false && (
                  <div className="ml-auto">
                    {editingProperty === property.key ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => saveEdit(property.key)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cancelEdit(property.key)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEditing(property.key, property.value)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="min-h-8">
                {renderPropertyValue(property)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export { TaskPropertiesGrid, type TaskProperty }