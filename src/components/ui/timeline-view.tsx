import * as React from "react"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"

interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp: Date | string
  type?: 'default' | 'success' | 'warning' | 'error'
  avatar?: string
  author?: string
  metadata?: Record<string, any>
}

interface TimelineViewProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[]
  showDate?: boolean
  compact?: boolean
}

function TimelineView({ 
  items, 
  showDate = true, 
  compact = false,
  className,
  ...props 
}: TimelineViewProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'success': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-border'
    }
  }

  const groupedItems = React.useMemo(() => {
    if (!showDate) return { '': items }
    
    return items.reduce((groups, item) => {
      const date = formatDate(item.timestamp)
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
      return groups
    }, {} as Record<string, TimelineItem[]>)
  }, [items, showDate])

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {Object.entries(groupedItems).map(([date, dateItems]) => (
        <div key={date} className="relative">
          {showDate && date && (
            <div className="sticky top-0 z-10 mb-4 bg-background">
              <h3 className="text-sm font-medium text-muted-foreground">{date}</h3>
            </div>
          )}
          
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-0 top-0 h-full w-px bg-border" />
            
            {dateItems.map((item, index) => (
              <div key={item.id} className={cn("relative pb-6", compact && "pb-4")}>
                {/* Timeline dot */}
                <div 
                  className={cn(
                    "absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background",
                    getTypeColor(item.type)
                  )}
                />
                
                {/* Content */}
                <div className={cn("ml-6", compact && "ml-4")}>
                  <Card className="shadow-sm">
                    <CardContent className={cn("p-4", compact && "p-3")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.avatar && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={item.avatar} alt={item.author} />
                                <AvatarFallback className="text-xs">
                                  {item.author?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <h4 className={cn(
                              "font-medium truncate",
                              compact ? "text-sm" : "text-base"
                            )}>
                              {item.title}
                            </h4>
                            {item.type && (
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className={cn(
                              "text-muted-foreground mb-2",
                              compact ? "text-xs line-clamp-2" : "text-sm"
                            )}>
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatTime(item.timestamp)}</span>
                            {item.author && !item.avatar && (
                              <span>{item.author}</span>
                            )}
                            {item.metadata && Object.entries(item.metadata).map(([key, value]) => (
                              <span key={key}>{key}: {value}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { TimelineView, type TimelineItem }