'use client'

import * as React from 'react'
import { ExplorerItem } from '@/lib/explorer-data'

export function useKeyboardShortcuts(
  items: ExplorerItem[],
  selectedItem: ExplorerItem | null,
  onSelect: (item: ExplorerItem) => void,
  onToggle: (id: string) => void,
  expandedItems: Set<string>
) {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const flatItems = flattenItems(items)
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(prev => {
            const next = prev + 1
            return next >= flatItems.length ? 0 : next
          })
          break
          
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(prev => {
            const next = prev - 1
            return next < 0 ? flatItems.length - 1 : next
          })
          break
          
        case 'ArrowRight':
          e.preventDefault()
          if (selectedItem && selectedItem.children && selectedItem.children.length > 0) {
            onToggle(selectedItem.id)
          }
          break
          
        case 'ArrowLeft':
          e.preventDefault()
          if (selectedItem && expandedItems.has(selectedItem.id)) {
            onToggle(selectedItem.id)
          }
          break
          
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && flatItems[focusedIndex]) {
            onSelect(flatItems[focusedIndex])
          }
          break
          
        case ' ':
          e.preventDefault()
          if (selectedItem) {
            onToggle(selectedItem.id)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedItem, onSelect, onToggle, expandedItems, focusedIndex])

  return { focusedIndex, setFocusedIndex }
}

function flattenItems(items: ExplorerItem[]): ExplorerItem[] {
  const result: ExplorerItem[] = []
  
  const flatten = (items: ExplorerItem[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children) {
        flatten(item.children)
      }
    }
  }
  
  flatten(items)
  return result
}

export function useExplorerState() {
  const [selectedItem, setSelectedItem] = React.useState<ExplorerItem | null>(null)
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set(['1', '2', '3']))
  const [viewMode, setViewMode] = React.useState<string>('tree')
  const [searchTerm, setSearchTerm] = React.useState<string>('')
  const [filterType, setFilterType] = React.useState<string>('all')
  const [clipboardItem, setClipboardItem] = React.useState<ExplorerItem | null>(null)
  const [clipboardAction, setClipboardAction] = React.useState<'copy' | 'cut' | null>(null)

  const handleToggle = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelect = (item: ExplorerItem) => {
    setSelectedItem(item)
    // Auto-expand parent folders if needed
    if (item.parentId) {
      setExpandedItems(prev => {
        const next = new Set(prev)
        next.add(item.parentId!)
        return next
      })
    }
  }

  const handleCopy = (item: ExplorerItem) => {
    setClipboardItem(item)
    setClipboardAction('copy')
  }

  const handleCut = (item: ExplorerItem) => {
    setClipboardItem(item)
    setClipboardAction('cut')
  }

  const handlePaste = () => {
    // Implementation would depend on your data structure
    console.log('Paste', clipboardItem, clipboardAction)
    setClipboardItem(null)
    setClipboardAction(null)
  }

  const clearClipboard = () => {
    setClipboardItem(null)
    setClipboardAction(null)
  }

  return {
    selectedItem,
    expandedItems,
    viewMode,
    searchTerm,
    filterType,
    clipboardItem,
    clipboardAction,
    handleToggle,
    handleSelect,
    setViewMode,
    setSearchTerm,
    setFilterType,
    handleCopy,
    handleCut,
    handlePaste,
    clearClipboard
  }
}