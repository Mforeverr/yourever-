'use client'

import * as React from 'react'
import { ExplorerItem } from '@/lib/explorer-data'
import { useExplorerState } from '@/lib/explorer-utils'

interface ExplorerContextType {
  selectedItem: ExplorerItem | null
  expandedItems: Set<string>
  viewMode: string
  searchTerm: string
  filterType: string
  clipboardItem: ExplorerItem | null
  clipboardAction: 'copy' | 'cut' | null
  
  // Actions
  handleToggle: (id: string) => void
  handleSelect: (item: ExplorerItem) => void
  setViewMode: (mode: string) => void
  setSearchTerm: (term: string) => void
  setFilterType: (type: string) => void
  handleCopy: (item: ExplorerItem) => void
  handleCut: (item: ExplorerItem) => void
  handlePaste: () => void
  clearClipboard: () => void
}

const ExplorerContext = React.createContext<ExplorerContextType | null>(null)

export function ExplorerProvider({ children }: { children: React.ReactNode }) {
  const explorerState = useExplorerState()

  return (
    <ExplorerContext.Provider value={explorerState}>
      {children}
    </ExplorerContext.Provider>
  )
}

export function useExplorer() {
  const context = React.useContext(ExplorerContext)
  if (!context) {
    throw new Error('useExplorer must be used within an ExplorerProvider')
  }
  return context
}