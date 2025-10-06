'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Filter,
  Bookmark,
  Info,
  Calendar,
  User,
  Tag,
  Hash,
  Save,
  Eye,
  RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useRightPanel } from "@/contexts/right-panel-context"

interface FilterState {
  assignees: string[]
  priorities: string[]
  statuses: string[]
  types: string[]
  dateRange?: {
    from: string
    to: string
  }
}

interface SavedView {
  id: string
  name: string
  filters: FilterState
  isDefault?: boolean
}

interface Metadata {
  created: string
  modified: string
  size: string
  type: string
  owner: string
  path: string
  tags: string[]
}

interface RightPanelProps {
  className?: string
  onFiltersChange?: (filters: FilterState) => void
  onCollapsedChange?: (collapsed: boolean) => void
}

export function RightPanel({ className, onFiltersChange, onCollapsedChange }: RightPanelProps) {
  const { selectedItems, filters, setFilters, isCollapsed, setIsCollapsed, activeTab, setActiveTab } = useRightPanel()

  // Sync collapse state with parent (if needed for backwards compatibility)
  React.useEffect(() => {
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed)
    }
  }, [isCollapsed, onCollapsedChange])

  // Mock data for filters
  const availableAssignees = [
    { id: 'alex', name: 'Alex Chen', avatar: 'AC' },
    { id: 'sarah', name: 'Sarah Johnson', avatar: 'SJ' },
    { id: 'mike', name: 'Mike Wilson', avatar: 'MW' },
    { id: 'emma', name: 'Emma Davis', avatar: 'ED' },
    { id: 'john', name: 'John Smith', avatar: 'JS' },
  ]

  const availablePriorities = [
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low', color: 'bg-green-500' },
  ]

  const availableStatuses = [
    { value: 'active', label: 'Active', color: 'bg-blue-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'archived', label: 'Archived', color: 'bg-gray-500' },
  ]

  const availableTypes = [
    { value: 'project', label: 'Projects', icon: '📁' },
    { value: 'task', label: 'Tasks', icon: '✓' },
    { value: 'document', label: 'Documents', icon: '📄' },
    { value: 'folder', label: 'Folders', icon: '📂' },
  ]

  const [savedViews, setSavedViews] = useState<SavedView[]>([
    {
      id: '1',
      name: 'My Active Tasks',
      filters: {
        assignees: ['alex'],
        priorities: ['high', 'critical'],
        statuses: ['active'],
        types: ['task'],
      },
      isDefault: true,
    },
    {
      id: '2',
      name: 'All Projects',
      filters: {
        assignees: [],
        priorities: [],
        statuses: ['active'],
        types: ['project'],
      },
    },
    {
      id: '3',
      name: 'Completed This Week',
      filters: {
        assignees: [],
        priorities: [],
        statuses: ['completed'],
        types: ['task'],
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0],
        },
      },
    },
  ])

  // Mock metadata for selected items
  const [metadata, setMetadata] = useState<Metadata>({
    created: new Date('2024-01-15').toLocaleDateString(),
    modified: new Date().toLocaleDateString(),
    size: '2.4 MB',
    type: 'Folder',
    owner: 'Alex Chen',
    path: '/projects/website-redesign',
    tags: ['frontend', 'react', 'typescript'],
  })

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters)
    }
  }, [filters, onFiltersChange])

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return {
        ...prev,
        [filterType]: newValues,
      }
    })
  }

  const clearAllFilters = () => {
    setFilters({
      assignees: [],
      priorities: [],
      statuses: [],
      types: [],
    })
  }

  const saveCurrentView = () => {
    const name = prompt('Enter view name:')
    if (name) {
      const newView: SavedView = {
        id: Date.now().toString(),
        name,
        filters: { ...filters },
      }
      setSavedViews(prev => [...prev, newView])
    }
  }

  const applySavedView = (view: SavedView) => {
    setFilters(view.filters)
  }

  const deleteSavedView = (viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId))
  }

  const hasActiveFilters = Object.values(filters).some(values => 
    Array.isArray(values) && values.length > 0
  )

  const activeFilterCount = Object.values(filters).reduce((count, values) => 
    count + (Array.isArray(values) ? values.length : 0), 0
  )

  if (isCollapsed) {
    return (
      <div className={cn("h-full w-12 border-l border-border bg-surface-panel flex flex-col items-center py-4", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 p-0 hover:bg-muted text-foreground"
          title="Expand Right Panel"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="flex-1 flex flex-col gap-2 mt-4">
          <Button
            variant={activeTab === 'filters' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setActiveTab('filters'); setIsCollapsed(false) }}
            className="h-8 w-8 p-0 relative hover:bg-muted text-foreground"
            title="Filters"
          >
            <Filter className="size-4" />
            {activeFilterCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeTab === 'views' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setActiveTab('views'); setIsCollapsed(false) }}
            className="h-8 w-8 p-0 hover:bg-muted text-foreground"
            title="Saved Views"
          >
            <Bookmark className="size-4" />
          </Button>

          <Button
            variant={activeTab === 'metadata' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => { setActiveTab('metadata'); setIsCollapsed(false) }}
            className="h-8 w-8 p-0 hover:bg-muted text-foreground"
            title="Info"
          >
            <Info className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full w-full border-l border-border bg-surface-panel flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 p-0 hover:bg-muted text-foreground"
            >
              <ChevronDown className="size-4" />
            </Button>
            <h3 className="font-semibold text-foreground">Panel</h3>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2 text-xs hover:bg-muted text-foreground"
            >
              <RotateCcw className="size-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mt-3">
          <Button
            variant={activeTab === 'filters' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('filters')}
            className="flex-1 h-8 text-xs hover:bg-muted text-foreground"
          >
            <Filter className="size-3 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'views' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('views')}
            className="flex-1 h-8 text-xs hover:bg-muted text-foreground"
          >
            <Bookmark className="size-3 mr-1" />
            Views
          </Button>
          <Button
            variant={activeTab === 'metadata' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('metadata')}
            className="flex-1 h-8 text-xs hover:bg-muted text-foreground"
          >
            <Info className="size-3 mr-1" />
            Info
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 bg-surface-panel">
        <div className="p-4">
          {activeTab === 'filters' && (
            <div className="space-y-6">
              {/* Assignees Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <User className="size-4" />
                    <Label className="text-sm font-medium">Assignees</Label>
                  </div>
                  <ChevronRight className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {availableAssignees.map(assignee => (
                    <div key={assignee.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={assignee.id}
                        checked={filters.assignees.includes(assignee.id)}
                        onCheckedChange={() => handleFilterChange('assignees', assignee.id)}
                      />
                      <Label htmlFor={assignee.id} className="text-sm flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {assignee.avatar}
                        </div>
                        {assignee.name}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Priority Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4" />
                    <Label className="text-sm font-medium">Priority</Label>
                  </div>
                  <ChevronRight className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {availablePriorities.map(priority => (
                    <div key={priority.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={priority.value}
                        checked={filters.priorities.includes(priority.value)}
                        onCheckedChange={() => handleFilterChange('priorities', priority.value)}
                      />
                      <Label htmlFor={priority.value} className="text-sm flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", priority.color)} />
                        {priority.label}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Status Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Eye className="size-4" />
                    <Label className="text-sm font-medium">Status</Label>
                  </div>
                  <ChevronRight className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {availableStatuses.map(status => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={status.value}
                        checked={filters.statuses.includes(status.value)}
                        onCheckedChange={() => handleFilterChange('statuses', status.value)}
                      />
                      <Label htmlFor={status.value} className="text-sm flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", status.color)} />
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Type Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Hash className="size-4" />
                    <Label className="text-sm font-medium">Type</Label>
                  </div>
                  <ChevronRight className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {availableTypes.map(type => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.types.includes(type.value)}
                        onCheckedChange={() => handleFilterChange('types', type.value)}
                      />
                      <Label htmlFor={type.value} className="text-sm flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Date Range Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <Label className="text-sm font-medium">Date Range</Label>
                  </div>
                  <ChevronRight className="size-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="from-date" className="text-xs">From</Label>
                    <Input
                      id="from-date"
                      type="date"
                      className="h-8 text-xs"
                      value={filters.dateRange?.from || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          from: e.target.value,
                          to: prev.dateRange?.to || '',
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to-date" className="text-xs">To</Label>
                    <Input
                      id="to-date"
                      type="date"
                      className="h-8 text-xs"
                      value={filters.dateRange?.to || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          from: prev.dateRange?.from || '',
                          to: e.target.value,
                        }
                      }))}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {activeTab === 'views' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Saved Views</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveCurrentView}
                  className="h-7 px-2 text-xs"
                  disabled={!hasActiveFilters}
                >
                  <Save className="size-3 mr-1" />
                  Save Current
                </Button>
              </div>

              <div className="space-y-2">
                {savedViews.map(view => (
                  <div
                    key={view.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-medium">{view.name}</h5>
                          {view.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(view.filters).map(([key, values]) => {
                            if (Array.isArray(values) && values.length > 0) {
                              return (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {values.length}
                                </Badge>
                              )
                            }
                            return null
                          })}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronRight className="size-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => applySavedView(view)}>
                            <Eye className="size-3 mr-2" />
                            Apply
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteSavedView(view.id)}>
                            <X className="size-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              {selectedItems.length > 0 ? (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-3">Selected Items ({selectedItems.length})</h4>
                    <div className="space-y-3">
                      {selectedItems.slice(0, 3).map((item, index) => (
                        <div key={index} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-sm">
                              {item.type === 'folder' ? '📁' : item.type === 'project' ? '📂' : '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.type}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {selectedItems.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{selectedItems.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Info className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No items selected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select items to view their metadata
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-3">Current Folder</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-sm">{metadata.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Size</span>
                    <span className="text-sm">{metadata.size}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Owner</span>
                    <span className="text-sm">{metadata.owner}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-sm">{metadata.created}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Modified</span>
                    <span className="text-sm">{metadata.modified}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Path</h4>
                <div className="p-2 bg-muted rounded-md">
                  <code className="text-xs">{metadata.path}</code>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {metadata.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}