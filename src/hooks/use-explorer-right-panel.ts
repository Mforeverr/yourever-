'use client'

import { useEffect } from 'react'
import { useExplorer } from '@/contexts/explorer-context'
import { useRightPanel } from '@/contexts/right-panel-context'

export function useExplorerRightPanel() {
  const { selectedItem } = useExplorer()
  const { setSelectedItems } = useRightPanel()

  useEffect(() => {
    if (selectedItem) {
      setSelectedItems([selectedItem])
    } else {
      setSelectedItems([])
    }
  }, [selectedItem, setSelectedItems])
}