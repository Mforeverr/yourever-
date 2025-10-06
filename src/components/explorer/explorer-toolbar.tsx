'use client'

import * as React from 'react'
import { Search, Filter, Grid3X3, List, TreePine, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { viewModes, filterOptions } from '@/lib/explorer-data'

interface ExplorerToolbarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  viewMode: string
  onViewModeChange: (mode: string) => void
  filterType: string
  onFilterChange: (type: string) => void
}

export function ExplorerToolbar({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  filterType,
  onFilterChange
}: ExplorerToolbarProps) {
  const handleClearSearch = () => {
    onSearchChange('')
  }

  const currentViewMode = viewModes.find(mode => mode.id === viewMode)
  const currentFilter = filterOptions.find(filter => filter.id === filterType)

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClearSearch}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      {/* Filter */}
      <Select value={filterType} onValueChange={onFilterChange}>
        <SelectTrigger className="w-40">
          <div className="flex items-center gap-2">
            <Filter className="size-4" />
            <SelectValue placeholder="Filter" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((filter) => (
            <SelectItem key={filter.id} value={filter.id}>
              {filter.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* View Mode */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-muted">
        {viewModes.map((mode) => (
          <Button
            key={mode.id}
            variant={viewMode === mode.id ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => onViewModeChange(mode.id)}
            title={mode.description}
          >
            {mode.id === 'tree' && <TreePine className="size-4" />}
            {mode.id === 'grid' && <Grid3X3 className="size-4" />}
            {mode.id === 'list' && <List className="size-4" />}
          </Button>
        ))}
      </div>

        {/* Active Filters Display */}
      {(searchTerm || filterType !== 'all') && (
        <div className="flex items-center gap-2 ml-auto">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchTerm}"
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={handleClearSearch}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )}
          {filterType !== 'all' && currentFilter && (
            <Badge variant="secondary" className="gap-1">
              {currentFilter.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => onFilterChange('all')}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}