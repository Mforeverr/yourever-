import * as React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { 
  Plus, 
  Minus, 
  Maximize2,
  Download,
  Share2
} from "lucide-react"

interface MindMapNode {
  id: string
  label: string
  x: number
  y: number
  color?: string
  children?: string[]
  parent?: string
  metadata?: Record<string, any>
}

interface MindMapConnection {
  from: string
  to: string
  color?: string
  type?: 'solid' | 'dashed'
}

interface MindMapCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  nodes: MindMapNode[]
  connections: MindMapConnection[]
  onNodeClick?: (node: MindMapNode) => void
  onNodeAdd?: (parentId: string, x: number, y: number) => void
  onNodeUpdate?: (nodeId: string, updates: Partial<MindMapNode>) => void
  onNodeDelete?: (nodeId: string) => void
  editable?: boolean
  showControls?: boolean
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

function MindMapCanvas({
  nodes,
  connections,
  onNodeClick,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  editable = false,
  showControls = true,
  zoom = 1,
  onZoomChange,
  className,
  ...props
}: MindMapCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [draggedNode, setDraggedNode] = React.useState<string | null>(null)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = React.useState(false)
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 })

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!editable) return
    
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setDraggedNode(nodeId)
    setDragOffset({
      x: e.clientX - rect.left - node.x * zoom - pan.x,
      y: e.clientY - rect.top - node.y * zoom - pan.y
    })
    setIsDragging(true)
    e.preventDefault()
  }

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const newX = (e.clientX - rect.left - dragOffset.x - pan.x) / zoom
      const newY = (e.clientY - rect.top - dragOffset.y - pan.y) / zoom
      
      onNodeUpdate?.(draggedNode, { x: newX, y: newY })
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedNode(null)
    setIsPanning(false)
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!editable || !onNodeAdd) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top - pan.y) / zoom
    
    onNodeAdd('', x, y)
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 3)
    onZoomChange?.(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.3)
    onZoomChange?.(newZoom)
  }

  const handleZoomReset = () => {
    onZoomChange?.(1)
    setPan({ x: 0, y: 0 })
  }

  const renderConnections = () => {
    return connections.map((connection, index) => {
      const fromNode = nodes.find(n => n.id === connection.from)
      const toNode = nodes.find(n => n.id === connection.to)
      
      if (!fromNode || !toNode) return null
      
      const x1 = fromNode.x * zoom + pan.x
      const y1 = fromNode.y * zoom + pan.y
      const x2 = toNode.x * zoom + pan.x
      const y2 = toNode.y * zoom + pan.y
      
      return (
        <svg
          key={index}
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        >
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={connection.color || '#94a3b8'}
            strokeWidth="2"
            strokeDasharray={connection.type === 'dashed' ? '5,5' : undefined}
          />
        </svg>
      )
    })
  }

  const renderNodes = () => {
    return nodes.map((node) => (
      <div
        key={node.id}
        className={cn(
          "absolute cursor-pointer select-none transition-transform",
          "hover:scale-105 active:scale-95",
          draggedNode === node.id && "cursor-grabbing z-50"
        )}
        style={{
          left: `${node.x * zoom + pan.x}px`,
          top: `${node.y * zoom + pan.y}px`,
          transform: `translate(-50%, -50%) scale(${zoom})`
        }}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        onClick={() => onNodeClick?.(node)}
      >
        <Card className="shadow-lg border-2" style={{ borderColor: node.color || '#e2e8f0' }}>
          <CardContent className="p-3 min-w-32">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{node.label}</span>
              {editable && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onNodeAdd?.(node.id, node.x + 100, node.y)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      onNodeDelete?.(node.id)
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {node.metadata && Object.entries(node.metadata).map(([key, value]) => (
              <div key={key} className="text-xs text-muted-foreground mt-1">
                {key}: {String(value)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    ))
  }

  return (
    <div className={cn("relative w-full h-full", className)} {...props}>
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomReset}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div
        ref={canvasRef}
        className="relative w-full h-full bg-surface rounded-lg border border-border overflow-hidden"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {renderConnections()}
        {renderNodes()}
      </div>
      
      {editable && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
          Double-click to add node • Drag to move • Scroll to zoom
        </div>
      )}
    </div>
  )
}

export { MindMapCanvas, type MindMapNode, type MindMapConnection }