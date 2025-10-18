'use client'

import * as React from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TreeView } from '@/components/explorer/tree-view'
import { GridView, ListView } from '@/components/explorer/alternative-views'
import { ContentPanel } from '@/components/explorer/content-panel'
import { ExplorerToolbar } from '@/components/explorer/explorer-toolbar'
import { ExplorerStatusBar } from '@/components/explorer/explorer-status-bar'
import { ExplorerProvider, useExplorer } from '@/contexts/explorer-context'
import { useExplorerRightPanel } from '@/hooks/use-explorer-right-panel'
import { useScope } from '@/contexts/scope-context'
import {
  useMockExplorerStore,
  selectExplorerTreeForScope
} from '@/mocks/data/explorer'

function ExplorerViewContent() {
  const {
    selectedItem,
    expandedItems,
    viewMode,
    searchTerm,
    filterType,
    handleToggle,
    handleSelect,
    setViewMode,
    setSearchTerm,
    setFilterType
  } = useExplorer()
  const { currentOrgId, currentDivisionId } = useScope()

  const explorerTree = useMockExplorerStore(
    React.useCallback(
      (state) => selectExplorerTreeForScope(state, currentOrgId, currentDivisionId),
      [currentOrgId, currentDivisionId]
    )
  )

  // Connect Explorer to RightPanel
  useExplorerRightPanel()

  // Flatten tree data for grid and list views
  const flattenItems = (items: any[], filter: string = 'all'): any[] => {
    const result: any[] = []
    
    const flatten = (items: any[]) => {
      for (const item of items) {
        if (filter === 'all' || item.type === filter) {
          result.push(item)
        }
        if (item.children) {
          flatten(item.children)
        }
      }
    }
    
    flatten(items)
    return result
  }

  // Filter items based on search term
  const filterItems = (items: any[], term: string): any[] => {
    if (!term) return items
    
    const lowerTerm = term.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerTerm) ||
      item.path.toLowerCase().includes(lowerTerm)
    )
  }

  // Get filtered data for current view
  const getFilteredData = () => {
    const treeData = explorerTree

    if (viewMode === 'tree') {
      return treeData
    } else {
      const flattened = flattenItems(treeData, filterType)
      return filterItems(flattened, searchTerm)
    }
  }

  const filteredData = getFilteredData()

  const renderMainContent = () => {
    switch (viewMode) {
      case 'grid':
        return (
          <GridView
            items={filteredData}
            selectedItem={selectedItem}
            onSelect={handleSelect}
            searchTerm={searchTerm}
          />
        )
      case 'list':
        return (
          <ListView
            items={filteredData}
            selectedItem={selectedItem}
            onSelect={handleSelect}
            searchTerm={searchTerm}
          />
        )
      case 'tree':
      default:
        return (
          <ScrollArea className="h-full">
            <TreeView
              data={filteredData}
              expandedItems={expandedItems}
              selectedItem={selectedItem}
              onToggle={handleToggle}
              onSelect={handleSelect}
              searchTerm={searchTerm}
            />
          </ScrollArea>
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <ExplorerToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterType={filterType}
        onFilterChange={setFilterType}
      />

      {/* Main Content */}
      <div className="flex-1">
        {viewMode === 'tree' ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={30} minSize={20}>
              <ScrollArea className="h-full">
                <TreeView
                  data={filteredData}
                  expandedItems={expandedItems}
                  selectedItem={selectedItem}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                  searchTerm={searchTerm}
                />
              </ScrollArea>
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={70} minSize={40}>
              <ContentPanel selectedItem={selectedItem} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={viewMode === 'grid' ? 60 : 70} minSize={40}>
              {renderMainContent()}
            </ResizablePanel>
            
            {selectedItem && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={viewMode === 'grid' ? 40 : 30} minSize={30}>
                  <ContentPanel selectedItem={selectedItem} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* Status Bar */}
      <ExplorerStatusBar />
    </div>
  )
}

export function ExplorerView() {
  return (
    <ExplorerProvider>
      <ExplorerViewContent />
    </ExplorerProvider>
  )
}
