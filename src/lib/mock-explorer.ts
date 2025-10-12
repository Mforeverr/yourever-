import { create } from 'zustand'
import type { ExplorerItem } from '@/lib/explorer-data'
import { seedExplorerData } from '@/lib/explorer-data'

type OrgScope = Array<string> | 'all'
type DivisionScope = Array<string> | 'all'

interface ExplorerScopedItem extends ExplorerItem {
  scope: {
    orgIds: OrgScope
    divisions: DivisionScope
  }
  children?: ExplorerScopedItem[]
}

interface MockExplorerState {
  items: ExplorerScopedItem[]
  version: number
}

interface MockExplorerActions {
  reset: () => void
  setItems: (items: ExplorerScopedItem[]) => void
}

export type MockExplorerStore = MockExplorerState & MockExplorerActions

const defaultScope = {
  orgIds: 'all' as OrgScope,
  divisions: ['all'] as DivisionScope
}

const applyScopeDefaults = (items: ExplorerItem[]): ExplorerScopedItem[] =>
  items.map((item) => ({
    ...item,
    scope: {
      orgIds: item.scope?.orgIds ?? defaultScope.orgIds,
      divisions: item.scope?.divisions ?? defaultScope.divisions
    },
    children: item.children ? applyScopeDefaults(item.children) : undefined
  }))

const matchesOrg = (scope: OrgScope, orgId?: string | null) => {
  if (scope === 'all') return true
  if (!orgId) return false
  return scope.includes(orgId)
}

const matchesDivision = (scope: DivisionScope, divisionId?: string | null) => {
  if (scope.includes('all')) return true
  if (!divisionId) return false
  return scope.includes(divisionId)
}

const filterTree = (
  items: ExplorerScopedItem[],
  orgId?: string | null,
  divisionId?: string | null
): ExplorerScopedItem[] => {
  const result: ExplorerScopedItem[] = []

  for (const item of items) {
    const children = item.children ? filterTree(item.children, orgId, divisionId) : undefined
    const scopedMatch = matchesOrg(item.scope.orgIds, orgId) && matchesDivision(item.scope.divisions, divisionId)

    if (scopedMatch || (children && children.length > 0)) {
      result.push({
        ...item,
        children
      })
    }
  }

  return result
}

const flattenTree = (items: ExplorerScopedItem[]): ExplorerScopedItem[] => {
  const result: ExplorerScopedItem[] = []
  const traverse = (collection: ExplorerScopedItem[]) => {
    for (const item of collection) {
      result.push(item)
      if (item.children) {
        traverse(item.children)
      }
    }
  }
  traverse(items)
  return result
}

const countTree = (items: ExplorerScopedItem[]) => {
  let folders = 0
  let projects = 0
  let tasks = 0
  let documents = 0
  let total = 0

  const traverse = (collection: ExplorerScopedItem[]) => {
    for (const item of collection) {
      total += 1
      switch (item.type) {
        case 'folder':
          folders += 1
          break
        case 'project':
          projects += 1
          break
        case 'task':
          tasks += 1
          break
        case 'document':
          documents += 1
          break
      }
      if (item.children) {
        traverse(item.children)
      }
    }
  }

  traverse(items)
  return { total, folders, projects, tasks, documents }
}

export const useMockExplorerStore = create<MockExplorerStore>((set) => ({
  items: applyScopeDefaults(seedExplorerData),
  version: 0,
  reset: () => set(() => ({ items: applyScopeDefaults(seedExplorerData), version: Date.now() })),
  setItems: (items) => set(() => ({ items, version: Date.now() }))
}))

// Cache for filtered results to prevent unnecessary re-renders
const filterCache = new Map<string, ExplorerScopedItem[]>()

const getCacheKey = (version: number, orgId?: string | null, divisionId?: string | null) =>
  `${version}-${orgId || 'null'}-${divisionId || 'null'}`

export const selectExplorerTreeForScope = (
  state: MockExplorerStore,
  orgId?: string | null,
  divisionId?: string | null
) => {
  const cacheKey = getCacheKey(state.version, orgId, divisionId)

  if (!filterCache.has(cacheKey)) {
    const filtered = filterTree(state.items, orgId, divisionId)
    filterCache.set(cacheKey, filtered)
  }

  return filterCache.get(cacheKey)!
}

// Additional caches for other selector types
const flatListCache = new Map<string, ExplorerScopedItem[]>()
const countsCache = new Map<string, { total: number; folders: number; projects: number; tasks: number; documents: number }>()

export const selectExplorerFlatListForScope = (
  state: MockExplorerStore,
  orgId?: string | null,
  divisionId?: string | null
) => {
  const cacheKey = getCacheKey(state.version, orgId, divisionId)

  if (!flatListCache.has(cacheKey)) {
    const flatList = flattenTree(filterTree(state.items, orgId, divisionId))
    flatListCache.set(cacheKey, flatList)
  }

  return flatListCache.get(cacheKey)!
}

export const selectExplorerCountsForScope = (
  state: MockExplorerStore,
  orgId?: string | null,
  divisionId?: string | null
) => {
  const cacheKey = getCacheKey(state.version, orgId, divisionId)

  if (!countsCache.has(cacheKey)) {
    const counts = countTree(filterTree(state.items, orgId, divisionId))
    countsCache.set(cacheKey, counts)
  }

  return countsCache.get(cacheKey)!
}

export const flattenExplorerItems = flattenTree
