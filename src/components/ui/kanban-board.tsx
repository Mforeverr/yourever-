import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { Plus, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface KanbanItem {
  id: string
  title: string
  description?: string
  badge?: string
  avatar?: string
}

interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
  badge?: string
}

interface KanbanBoardProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: KanbanColumn[]
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string) => void
  onItemAdd?: (columnId: string) => void
  editable?: boolean
}

function KanbanBoard({ 
  columns, 
  onItemMove, 
  onItemAdd, 
  editable = false,
  className,
  ...props 
}: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = React.useState<{itemId: string, fromColumn: string} | null>(null)

  const handleDragStart = (itemId: string, fromColumn: string) => {
    setDraggedItem({ itemId, fromColumn })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toColumn: string) => {
    e.preventDefault()
    if (draggedItem && onItemMove) {
      onItemMove(draggedItem.itemId, draggedItem.fromColumn, toColumn)
    }
    setDraggedItem(null)
  }

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)} {...props}>
      {columns.map((column) => (
        <Card 
          key={column.id} 
          className="min-w-80 flex-shrink-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {column.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {column.badge && (
                <Badge variant="secondary" className="text-xs">
                  {column.badge}
                </Badge>
              )}
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onItemAdd?.(column.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {column.items.map((item) => (
              <Card
                key={item.id}
                className="cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                draggable={editable}
                onDragStart={() => handleDragStart(item.id, column.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.badge && (
                        <Badge variant="outline" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export { KanbanBoard, type KanbanItem, type KanbanColumn }