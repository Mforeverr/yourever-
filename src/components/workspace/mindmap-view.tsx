"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Share2,
  Edit3,
  Trash2,
  Move,
  Circle,
  Square,
  Triangle,
  Hexagon
} from "lucide-react"

interface MindMapNode {
  id: string
  label: string
  x: number
  y: number
  color?: string
  shape?: 'circle' | 'square' | 'triangle' | 'hexagon'
  size?: 'small' | 'medium' | 'large'
  children: string[]
  parent?: string
  notes?: string
}

interface MindMapConnection {
  from: string
  to: string
  color?: string
  type?: 'solid' | 'dashed' | 'dotted'
  width?: number
}

const initialNodes: MindMapNode[] = [
  {
    id: "central",
    label: "Project Ideas",
    x: 400,
    y: 300,
    color: "#3b82f6",
    shape: "hexagon",
    size: "large",
    children: ["frontend", "backend", "design", "infrastructure"]
  },
  {
    id: "frontend",
    label: "Frontend",
    x: 200,
    y: 150,
    color: "#8b5cf6",
    shape: "circle",
    size: "medium",
    parent: "central",
    children: ["react", "vue", "styling"]
  },
  {
    id: "backend",
    label: "Backend",
    x: 600,
    y: 150,
    color: "#10b981",
    shape: "circle",
    size: "medium",
    parent: "central",
    children: ["api", "database", "auth"]
  },
  {
    id: "design",
    label: "Design",
    x: 200,
    y: 450,
    color: "#f59e0b",
    shape: "circle",
    size: "medium",
    parent: "central",
    children: ["ui", "ux", "branding"]
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    x: 600,
    y: 450,
    color: "#ef4444",
    shape: "circle",
    size: "medium",
    parent: "central",
    children: ["cloud", "cicd", "monitoring"]
  },
  {
    id: "react",
    label: "React",
    x: 100,
    y: 80,
    color: "#06b6d4",
    shape: "square",
    size: "small",
    parent: "frontend",
    children: []
  },
  {
    id: "vue",
    label: "Vue",
    x: 200,
    y: 50,
    color: "#06b6d4",
    shape: "square",
    size: "small",
    parent: "frontend",
    children: []
  },
  {
    id: "styling",
    label: "Styling",
    x: 300,
    y: 80,
    color: "#06b6d4",
    shape: "square",
    size: "small",
    parent: "frontend",
    children: []
  },
  {
    id: "api",
    label: "API",
    x: 550,
    y: 80,
    color: "#84cc16",
    shape: "square",
    size: "small",
    parent: "backend",
    children: []
  },
  {
    id: "database",
    label: "Database",
    x: 650,
    y: 50,
    color: "#84cc16",
    shape: "square",
    size: "small",
    parent: "backend",
    children: []
  },
  {
    id: "auth",
    label: "Auth",
    x: 700,
    y: 100,
    color: "#84cc16",
    shape: "square",
    size: "small",
    parent: "backend",
    children: []
  }
]

const initialConnections: MindMapConnection[] = [
  { from: "central", to: "frontend", color: "#3b82f6", width: 3 },
  { from: "central", to: "backend", color: "#3b82f6", width: 3 },
  { from: "central", to: "design", color: "#3b82f6", width: 3 },
  { from: "central", to: "infrastructure", color: "#3b82f6", width: 3 },
  { from: "frontend", to: "react", color: "#8b5cf6", width: 2 },
  { from: "frontend", to: "vue", color: "#8b5cf6", width: 2 },
  { from: "frontend", to: "styling", color: "#8b5cf6", width: 2 },
  { from: "backend", to: "api", color: "#10b981", width: 2 },
  { from: "backend", to: "database", color: "#10b981", width: 2 },
  { from: "backend", to: "auth", color: "#10b981", width: 2 },
  { from: "design", to: "ui", color: "#f59e0b", width: 2, type: "dashed" },
  { from: "design", to: "ux", color: "#f59e0b", width: 2, type: "dashed" },
  { from: "design", to: "branding", color: "#f59e0b", width: 2, type: "dashed" },
  { from: "infrastructure", to: "cloud", color: "#ef4444", width: 2, type: "dotted" },
  { from: "infrastructure", to: "cicd", color: "#ef4444", width: 2, type: "dotted" },
  { from: "infrastructure", to: "monitoring", color: "#ef4444", width: 2, type: "dotted" }
]

function MindMapNodeComponent({ node, isEditing, onEdit, onDelete, onRename, onSelect }: {
  node: MindMapNode
  isEditing: boolean
  onEdit: (node: MindMapNode) => void
  onDelete: (nodeId: string) => void
  onRename: (nodeId: string, newLabel: string) => void
  onSelect: (node: MindMapNode) => void
}) {
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [newLabel, setNewLabel] = React.useState(node.label)
  const [isHovered, setIsHovered] = React.useState(false)

  const handleRename = () => {
    if (newLabel.trim() && newLabel !== node.label) {
      onRename(node.id, newLabel)
    }
    setIsRenaming(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setNewLabel(node.label)
      setIsRenaming(false)
    }
  }

  const getNodeShape = (shape?: string) => {
    switch (shape) {
      case 'square': return 'rounded-lg'
      case 'triangle': return 'clip-triangle'
      case 'hexagon': return 'clip-hexagon'
      default: return 'rounded-full'
    }
  }

  const getNodeSize = (size?: string) => {
    switch (size) {
      case 'small': return 'w-16 h-16 text-xs'
      case 'large': return 'w-32 h-32 text-base'
      default: return 'w-24 h-24 text-sm'
    }
  }

  return (
    <div
      className={cn(
        "absolute flex flex-col items-center justify-center cursor-move transition-all hover:scale-105",
        getNodeSize(node.size)
      )}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(node)}
    >
      <div
        className={cn(
          "w-full h-full flex items-center justify-center border-2 shadow-lg hover:shadow-xl transition-shadow",
          getNodeShape(node.shape),
          isEditing && "ring-2 ring-brand ring-offset-2"
        )}
        style={{
          backgroundColor: node.color || "#3b82f6",
          borderColor: node.color ? `${node.color}cc` : "#3b82f6cc"
        }}
      >
        {isRenaming ? (
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="text-center bg-background border-none text-foreground font-medium"
            autoFocus
          />
        ) : (
          <span className="text-white font-medium text-center px-2 truncate">
            {node.label}
          </span>
        )}
      </div>
      
      {/* Node actions */}
      {isHovered && (
        <div className="absolute -top-8 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background border border-border shadow-md"
            onClick={(e) => {
              e.stopPropagation()
              setIsRenaming(true)
            }}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background border border-border shadow-md"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(node)
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
          {node.id !== "central" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-background border border-border shadow-md"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(node.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      
      {/* Node notes indicator */}
      {node.notes && (
        <div className="absolute -bottom-2 w-2 h-2 bg-yellow-400 rounded-full" />
      )}
    </div>
  )
}

function MindMapConnectionComponent({ connection }: { connection: MindMapConnection }) {
  const fromNode = initialNodes.find(n => n.id === connection.from)
  const toNode = initialNodes.find(n => n.id === connection.to)
  
  if (!fromNode || !toNode) return null

  const x1 = fromNode.x
  const y1 = fromNode.y
  const x2 = toNode.x
  const y2 = toNode.y

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <marker
          id={`arrowhead-${connection.from}-${connection.to}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={connection.color || "#94a3b8"}
          />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={connection.color || "#94a3b8"}
        strokeWidth={connection.width || 2}
        strokeDasharray={
          connection.type === 'dashed' ? '5,5' :
          connection.type === 'dotted' ? '2,2' : undefined
        }
        markerEnd={`url(#arrowhead-${connection.from}-${connection.to})`}
      />
    </svg>
  )
}

interface MindMapViewProps {
  projectId?: string
}

export function MindMapView({ projectId }: MindMapViewProps) {
  const [nodes, setNodes] = React.useState<MindMapNode[]>(initialNodes)
  const [connections, setConnections] = React.useState<MindMapConnection[]>(initialConnections)
  const [selectedNode, setSelectedNode] = React.useState<MindMapNode | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [draggedNode, setDraggedNode] = React.useState<string | null>(null)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })

  const handleNodeSelect = (node: MindMapNode) => {
    setSelectedNode(node)
    setIsEditing(true)
  }

  const handleNodeEdit = (node: MindMapNode) => {
    console.log("Edit node:", node)
    // TODO: Open node edit panel
  }

  const handleNodeRename = (nodeId: string, newLabel: string) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, label: newLabel } : node
      )
    )
  }

  const handleNodeDelete = (nodeId: string) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId))
    setConnections(prevConnections =>
      prevConnections.filter(conn => conn.from !== nodeId && conn.to !== nodeId)
    )
  }

  const handleAddChildNode = (parentId: string) => {
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) return

    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      label: "New Node",
      x: parentNode.x + (Math.random() - 0.5) * 100,
      y: parentNode.y + (Math.random() - 0.5) * 100,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      shape: "circle",
      size: "small",
      parent: parentId,
      children: []
    }

    setNodes(prevNodes => [...prevNodes, newNode])
    setConnections(prevConnections => [
      ...prevConnections,
      {
        from: parentId,
        to: newNode.id,
        color: parentNode.color,
        width: 2
      }
    ])

    // Update parent node
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === parentId
          ? { ...node, children: [...node.children, newNode.id] }
          : node
      )
    )
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom

      const newNode: MindMapNode = {
        id: `node-${Date.now()}`,
        label: "New Node",
        x,
        y,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        shape: "circle",
        size: "small",
        children: []
      }

      setNodes(prevNodes => [...prevNodes, newNode])
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5))
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const handleExport = () => {
    console.log("Export mind map")
    // TODO: Implement export functionality
  }

  const handleShare = () => {
    console.log("Share mind map")
    // TODO: Implement share functionality
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Mind Map View</h2>
          <p className="text-muted-foreground">
            Interactive mind mapping with nodes and connections (UI only)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomOut}>
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs px-2 font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleZoomIn}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleResetZoom}>
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mind Map Canvas */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <div
                className="relative w-full h-full bg-surface rounded-lg overflow-hidden cursor-crosshair"
                onClick={handleCanvasClick}
                style={{ minHeight: '600px' }}
              >
                {/* Connections */}
                {connections.map((connection, index) => (
                  <MindMapConnectionComponent
                    key={index}
                    connection={connection}
                  />
                ))}
                
                {/* Nodes */}
                {nodes.map((node) => (
                  <MindMapNodeComponent
                    key={node.id}
                    node={node}
                    isEditing={isEditing && selectedNode?.id === node.id}
                    onEdit={handleNodeEdit}
                    onDelete={handleNodeDelete}
                    onRename={handleNodeRename}
                    onSelect={handleNodeSelect}
                  />
                ))}
                
                {/* Instructions */}
                <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg border border-border">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Click canvas to add node</div>
                    <div>• Double-click node to rename</div>
                    <div>• Hover node for actions</div>
                    <div>• Use zoom controls to navigate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Node Properties */}
          {selectedNode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Node Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Label</label>
                    <Input
                      value={selectedNode.label}
                      onChange={(e) => handleNodeRename(selectedNode.id, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Color</label>
                    <div className="mt-1 flex gap-2">
                      {["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"].map(color => (
                        <button
                          key={color}
                          className="w-6 h-6 rounded border-2 border-border"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setNodes(prevNodes =>
                              prevNodes.map(node =>
                                node.id === selectedNode.id ? { ...node, color } : node
                              )
                            )
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Shape</label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {["circle", "square", "triangle", "hexagon"].map(shape => (
                        <Button
                          key={shape}
                          variant={selectedNode.shape === shape ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setNodes(prevNodes =>
                              prevNodes.map(node =>
                                node.id === selectedNode.id ? { ...node, shape: shape as any } : node
                              )
                            )
                          }}
                        >
                          {shape}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {["small", "medium", "large"].map(size => (
                        <Button
                          key={size}
                          variant={selectedNode.size === size ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setNodes(prevNodes =>
                              prevNodes.map(node =>
                                node.id === selectedNode.id ? { ...node, size: size as any } : node
                              )
                            )
                          }}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {selectedNode.parent && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleAddChildNode(selectedNode.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Child Node
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Nodes</span>
                  <span className="font-medium">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="font-medium">{connections.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Depth</span>
                  <span className="font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Central Node</span>
                  <span className="font-medium">Project Ideas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Root Node
                </Button>
                <Button variant="outline" className="w-full">
                  <Move className="h-4 w-4 mr-2" />
                  Auto Layout
                </Button>
                <Button variant="outline" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}