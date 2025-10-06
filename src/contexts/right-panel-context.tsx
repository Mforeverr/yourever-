'use client'

import * as React from 'react'
import { ExplorerItem } from '@/lib/explorer-data'

interface RightPanelContextType {
  selectedItems: ExplorerItem[]
  setSelectedItems: (items: ExplorerItem[]) => void
  filters: {
    assignees: string[]
    priorities: string[]
    statuses: string[]
    types: string[]
    dateRange?: {
      from: string
      to: string
    }
  }
  setFilters: (filters: any) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  activeTab: 'filters' | 'views' | 'metadata'
  setActiveTab: (tab: 'filters' | 'views' | 'metadata') => void
}

const RightPanelContext = React.createContext<RightPanelContextType | null>(null)

export function RightPanelProvider({ children }: { children: React.ReactNode }) {
  const [selectedItems, setSelectedItems] = React.useState<ExplorerItem[]>([])
  const [filters, setFilters] = React.useState({
    assignees: [],
    priorities: [],
    statuses: [],
    types: [],
  })
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'filters' | 'views' | 'metadata'>('filters')

  return (
    <RightPanelContext.Provider value={{
      selectedItems,
      setSelectedItems,
      filters,
      setFilters,
      isCollapsed,
      setIsCollapsed,
      activeTab,
      setActiveTab
    }}>
      {children}
    </RightPanelContext.Provider>
  )
}

export function useRightPanel() {
  const context = React.useContext(RightPanelContext)
  if (!context) {
    throw new Error('useRightPanel must be used within a RightPanelProvider')
  }
  return context
}