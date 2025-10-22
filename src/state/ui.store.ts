import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { StateCreator } from "zustand"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export type UITabType = "task" | "project" | "doc" | "channel" | "calendar" | "timeline" | "dm" | "ai" | "admin" | "explorer"

export interface TabRoute {
  path: string
  params?: Record<string, string>
  query?: Record<string, string>
  hash?: string
}

export interface TabMetadata {
  createdAt: string
  updatedAt: string
  lastVisited: string
  visitCount: number
  contextData?: Record<string, any>
  preview?: string
  badgeCount?: number
  icon?: string
  tooltip?: string
}

export interface UITab {
  id: string
  title: string
  type: UITabType
  path?: string
  route?: TabRoute
  metadata?: TabMetadata
  isDirty?: boolean
  isActive?: boolean
  isSplit?: boolean
  isPinned?: boolean
}

export interface HuddleParticipantState {
  id: string
  name: string
  avatar?: string
  isSpeaking: boolean
  isMuted: boolean
  isVideoOn: boolean
  status: "online" | "away" | "offline"
}

export interface HuddleMetadata {
  agenda?: string
  scheduledFor?: string
  location?: string
  notes?: string
  attachments?: string[]
}

export interface HuddleSessionState {
  id: string
  title: string
  participants: HuddleParticipantState[]
  startTime?: string
  isRecording?: boolean
  isScreenSharing?: boolean
  metadata?: HuddleMetadata
}

interface UIStoreState {
  activeActivity: string
  setActiveActivity: (activity: string) => void

  leftSidebarCollapsed: boolean
  toggleLeftSidebar: () => void
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  leftSidebarSize: number
  setLeftSidebarSize: (size: number) => void

  rightPanelCollapsed: boolean
  setRightPanelCollapsed: (collapsed: boolean) => void
  toggleRightPanel: () => void

  bottomPanelCollapsed: boolean
  toggleBottomPanel: () => void
  setBottomPanelCollapsed: (collapsed: boolean) => void
  isBottomPanelOpen: boolean
  openBottomPanel: () => void
  closeBottomPanel: () => void
  bottomPanelSession: HuddleSessionState | null
  setBottomPanelSession: (session: HuddleSessionState | null) => void

  floatingAssistantOpen: boolean
  floatingAssistantMinimized: boolean
  openFloatingAssistant: () => void
  closeFloatingAssistant: () => void
  toggleFloatingAssistant: () => void
  toggleFloatingAssistantMinimized: () => void

  tabs: UITab[]
  activeTabId: string | null
  setActiveTabId: (tabId: string) => void
  openTab: (tab: UITab) => void
  closeTab: (tabId: string) => void
  closeAllTabs: () => void
  duplicateTab: (tabId: string) => void
  toggleTabPinned: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<UITab>) => void
  toggleSplitView: (tabId: string) => void
  resetTabs: () => void

  // New advanced tab management methods
  createTabForPage: (pageId: string, title: string, type: UITabType, route: TabRoute) => string
  createTabForChannel: (channelId: string, channelName: string) => string
  createTabForProject: (projectId: string, projectName: string) => string
  createTabForDM: (userId: string, userName: string) => string
  createTabForExplorer: (path: string) => string
  ensureTabExists: (tabId: string, options: { title: string; type: UITabType; route?: TabRoute }) => string
  closeTabById: (tabId: string) => void
  closeTabsToRight: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  pinTab: (tabId: string) => void
  unpinTab: (tabId: string) => void
  toggleTabPin: (tabId: string) => void
  updateTabMetadata: (tabId: string, updates: Partial<TabMetadata>) => void
  getTabByRoute: (route: TabRoute) => UITab | undefined
  getTabsByType: (type: UITabType) => UITab[]
  getPinnedTabs: () => UITab[]
  getUnpinnedTabs: () => UITab[]
  sortTabsByLastVisited: () => void
  incrementTabVisitCount: (tabId: string) => void

  rightPanelSize: number
  setRightPanelSize: (size: number) => void
  bottomPanelHeight: number
  setBottomPanelHeight: (size: number) => void
}

const DEFAULT_TABS: UITab[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    type: "project",
    path: "/dashboard",
    route: { path: "/dashboard" },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      visitCount: 0
    },
    isActive: true,
    isSplit: false,
    isPinned: false
  },
  {
    id: "workspace",
    title: "Workspace",
    type: "project",
    path: "/workspace",
    route: { path: "/workspace" },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      visitCount: 0
    },
    isActive: false,
    isSplit: false,
    isPinned: false
  },
  {
    id: "general-channel",
    title: "#general",
    type: "channel",
    path: "/channels/general",
    route: { path: "/channels/general" },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      visitCount: 0
    },
    isDirty: true,
    isActive: false,
    isSplit: false,
    isPinned: false,
  },
]

const normalizeTabPath = (path: string) => {
  if (!path) {
    return "/dashboard"
  }

  return path.startsWith("/") ? path : `/${path}`
}

const createMetadata = (overrides: Partial<TabMetadata> = {}): TabMetadata => ({
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastVisited: new Date().toISOString(),
  visitCount: 0,
  ...overrides
})

const sortTabsByPinState = (tabs: UITab[]) => {
  const pinned: UITab[] = []
  const unpinned: UITab[] = []

  tabs.forEach((tab) => {
    if (tab.isPinned) {
      pinned.push(tab)
    } else {
      unpinned.push(tab)
    }
  })

  return [...pinned, ...unpinned]
}

const markActiveTab = (tabs: UITab[], tabId: string) =>
  tabs.map((tab) => ({
    ...tab,
    isActive: tab.id === tabId,
  }))

export const useUIStore = create<UIStoreState>()(
  withOptionalDevtools(
    persist(
      (set, get) => ({
        activeActivity: "home",
        setActiveActivity: (activity) => set({ activeActivity: activity }),

        leftSidebarCollapsed: false,
        toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
        setLeftSidebarCollapsed: (collapsed) => set({ leftSidebarCollapsed: collapsed }),
        leftSidebarSize: 22,
        setLeftSidebarSize: (size) =>
          set(() => ({
            leftSidebarSize: Math.min(Math.max(size, 8), 35),
          })),

        rightPanelCollapsed: false,
        setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
        toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),

        bottomPanelCollapsed: false,
        toggleBottomPanel: () =>
          set((state) => {
            if (!state.isBottomPanelOpen) {
              return { isBottomPanelOpen: true, bottomPanelCollapsed: false }
            }
            return { bottomPanelCollapsed: !state.bottomPanelCollapsed }
          }),
        setBottomPanelCollapsed: (collapsed) => set({ bottomPanelCollapsed: collapsed }),
        isBottomPanelOpen: false,
        bottomPanelSession: null,
        setBottomPanelSession: (session) => set({ bottomPanelSession: session }),
        openBottomPanel: () =>
          set((state) => ({
            isBottomPanelOpen: true,
            bottomPanelCollapsed: false,
            bottomPanelSession: state.bottomPanelSession,
          })),
        closeBottomPanel: () =>
          set({ isBottomPanelOpen: false, bottomPanelCollapsed: false, bottomPanelSession: null }),

        floatingAssistantOpen: false,
        floatingAssistantMinimized: false,
        openFloatingAssistant: () => set({ floatingAssistantOpen: true, floatingAssistantMinimized: false }),
        closeFloatingAssistant: () => set({ floatingAssistantOpen: false, floatingAssistantMinimized: false }),
        toggleFloatingAssistant: () =>
          set((state) => ({
            floatingAssistantOpen: !state.floatingAssistantOpen,
            floatingAssistantMinimized: false,
          })),
        toggleFloatingAssistantMinimized: () =>
          set((state) => {
            if (!state.floatingAssistantOpen) {
              return { floatingAssistantOpen: true, floatingAssistantMinimized: false }
            }
            return { floatingAssistantMinimized: !state.floatingAssistantMinimized }
          }),

        tabs: DEFAULT_TABS,
        activeTabId: DEFAULT_TABS[0]?.id ?? null,
        setActiveTabId: (tabId) =>
          set((state) => ({
            activeTabId: tabId,
            tabs: state.tabs.map((tab) => ({ ...tab, isActive: tab.id === tabId })),
          })),
        openTab: (tab) =>
          set((state) => {
            const existingIndex = state.tabs.findIndex((candidate) => candidate.id === tab.id)
            if (existingIndex >= 0) {
              const updatedTabs = markActiveTab(
                state.tabs.map((candidate, index) => ({
                  ...candidate,
                  ...(index === existingIndex
                    ? {
                        ...candidate,
                        ...tab,
                        path: normalizeTabPath(tab.path ?? candidate.path ?? ""),
                      }
                    : candidate),
                })),
                tab.id
              )
              return {
                tabs: sortTabsByPinState(updatedTabs),
                activeTabId: tab.id,
              }
            }

            const normalizedPath = normalizeTabPath(tab.path ?? "")
            const preparedTabs = state.tabs.map((candidate) => ({
              ...candidate,
              isActive: false,
            }))

            const nextTabs = sortTabsByPinState([
              ...preparedTabs,
              {
                ...tab,
                path: normalizedPath,
                isActive: true,
                isSplit: tab.isSplit ?? false,
                isPinned: tab.isPinned ?? false,
              },
            ])

            return {
              tabs: nextTabs,
              activeTabId: tab.id,
            }
          }),
        closeTab: (tabId) =>
          set((state) => {
            const filteredTabs = state.tabs.filter((tab) => tab.id !== tabId)
            if (filteredTabs.length === 0) {
              return {
                tabs: [],
                activeTabId: null,
              }
            }

            const nextActiveId =
              state.activeTabId === tabId
                ? filteredTabs[0].id
                : state.activeTabId ?? filteredTabs[0].id

            const nextTabs = sortTabsByPinState(
              filteredTabs.map((tab) => ({
                ...tab,
                isActive: tab.id === nextActiveId,
              }))
            )

            return {
              tabs: nextTabs,
              activeTabId: nextActiveId,
            }
          }),
        closeAllTabs: () =>
          set((state) => {
            const remainingTabs = state.tabs.filter((tab) => tab.isPinned)
            const nextActiveId = remainingTabs[0]?.id ?? null

            const nextTabs = remainingTabs.map((tab, index) => ({
              ...tab,
              isActive: index === 0,
            }))

            return {
              tabs: nextTabs,
              activeTabId: nextActiveId,
            }
          }),
        duplicateTab: (tabId) => {
          const state = get()
          const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
          if (tabIndex === -1) {
            return tabId
          }

          const tabToDuplicate = state.tabs[tabIndex]
          const cloneId = `${tabToDuplicate.id}-copy-${Date.now()}`
          const duplicatedTab: UITab = {
            ...tabToDuplicate,
            id: cloneId,
            title: `${tabToDuplicate.title} (Copy)`,
            metadata: tabToDuplicate.metadata ? {
              ...tabToDuplicate.metadata,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0
            } : {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0
            },
            isActive: true,
          }

          const deactivatedTabs = state.tabs.map((tab) => ({
            ...tab,
            isActive: false,
          }))

          deactivatedTabs.splice(tabIndex + 1, 0, duplicatedTab as any)

          const nextTabs = sortTabsByPinState(deactivatedTabs)

          set({
            tabs: nextTabs,
            activeTabId: cloneId,
          })

          return cloneId
        },
        toggleTabPinned: (tabId) =>
          set((state) => {
            const nextTabs = state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    isPinned: !tab.isPinned,
                  }
                : tab
            )

            return {
              tabs: sortTabsByPinState(nextTabs),
            }
          }),
        updateTab: (tabId, updates) =>
          set((state) => ({
            tabs: sortTabsByPinState(
              state.tabs.map((tab) =>
                tab.id === tabId
                  ? {
                      ...tab,
                      ...updates,
                      path: updates.path ? normalizeTabPath(updates.path) : tab.path ?? "",
                    }
                  : tab
              )
            ),
          })),
        resetTabs: () =>
          set(() => ({
            tabs: DEFAULT_TABS,
            activeTabId: DEFAULT_TABS[0]?.id ?? null,
          })),
        toggleSplitView: (tabId) =>
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId ? { ...tab, isSplit: !tab.isSplit } : tab
            ),
          })),

        // Advanced tab management methods
        createTabForPage: (pageId, title, type, route) => {
          const tabId = `page-${pageId}`
          const tab: UITab = {
            id: tabId,
            title,
            type,
            route,
            path: route.path,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0
            },
            isActive: true,
            isPinned: false,
            isSplit: false
          };
          get().openTab(tab);
          return tabId;
        },

        createTabForChannel: (channelId, channelName) => {
          const tabId = `channel-${channelId}`
          const tab: UITab = {
            id: tabId,
            title: `#${channelName}`,
            type: "channel",
            route: { path: `/channels/${channelId}` },
            path: `/channels/${channelId}`,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0
            },
            isActive: true,
            isPinned: false,
            isSplit: false,
          };
          get().openTab(tab);
          return tabId;
        },

        createTabForProject: (projectId, projectName) => {
          const tabId = `project-${projectId}`
          const tab: UITab = {
            id: tabId,
            title: projectName,
            type: "project",
            route: { path: `/projects/${projectId}` },
            path: `/projects/${projectId}`,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0,
              contextData: { projectId }
            },
            isActive: true,
            isPinned: false,
            isSplit: false,
          };
          get().openTab(tab);
          return tabId;
        },

        createTabForDM: (userId, userName) => {
          const tabId = `dm-${userId}`
          const tab: UITab = {
            id: tabId,
            title: userName,
            type: "dm",
            route: { path: `/dm/${userId}` },
            path: `/dm/${userId}`,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0,
              contextData: { userId }
            },
            isActive: true,
            isPinned: false,
            isSplit: false,
          };
          get().openTab(tab);
          return tabId;
        },

        createTabForExplorer: (path) => {
          const tabId = `explorer-${path.replace(/[^a-zA-Z0-9]/g, '-')}`
          const tab: UITab = {
            id: tabId,
            title: `Explorer: ${path}`,
            type: "explorer",
            route: { path: `/explorer${path}` },
            path: `/explorer${path}`,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0,
              contextData: { path }
            },
            isActive: true,
            isPinned: false,
            isSplit: false,
          };
          get().openTab(tab);
          return tabId;
        },

        ensureTabExists: (tabId, options) => {
          const state = get()
          const existingTab = state.tabs.find(tab => tab.id === tabId)

          if (existingTab) {
            state.setActiveTabId(tabId)
            return tabId
          }

          const tab: UITab = {
            id: tabId,
            title: options.title,
            type: options.type,
            route: options.route,
            path: options.route?.path,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              visitCount: 0
            },
            isActive: true,
            isPinned: false,
            isSplit: false
          }
          state.openTab(tab)
          return tabId
        },

        closeTabById: (tabId) => {
          get().closeTab(tabId)
        },

        closeTabsToRight: (tabId) => {
          const state = get()
          const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)
          if (tabIndex === -1) return

          const tabsToKeep = state.tabs.slice(0, tabIndex + 1)
          const newActiveId = tabsToKeep.find(tab => tab.id === state.activeTabId)?.id ||
                            tabsToKeep[tabsToKeep.length - 1]?.id || null

          set({
            tabs: sortTabsByPinState(tabsToKeep),
            activeTabId: newActiveId
          })
        },

        closeOtherTabs: (tabId) => {
          const state = get()
          const targetTab = state.tabs.find(tab => tab.id === tabId)
          if (!targetTab) return

          const pinnedTabs = state.tabs.filter(tab => tab.isPinned && tab.id !== tabId)
          const finalTabs = [...pinnedTabs, targetTab]

          set({
            tabs: sortTabsByPinState(finalTabs.map(tab => ({ ...tab, isActive: tab.id === tabId }))),
            activeTabId: tabId
          })
        },

        pinTab: (tabId) => {
          set((state) => ({
            tabs: sortTabsByPinState(
              state.tabs.map(tab =>
                tab.id === tabId ? { ...tab, isPinned: true } : tab
              )
            )
          }))
        },

        unpinTab: (tabId) => {
          set((state) => ({
            tabs: sortTabsByPinState(
              state.tabs.map(tab =>
                tab.id === tabId ? { ...tab, isPinned: false } : tab
              )
            )
          }))
        },

        toggleTabPin: (tabId) => {
          get().toggleTabPinned(tabId)
        },

        updateTabMetadata: (tabId, updates) => {
          set((state) => ({
            tabs: sortTabsByPinState(
              state.tabs.map(tab =>
                tab.id === tabId
                  ? {
                      ...tab,
                      metadata: tab.metadata
                        ? { ...tab.metadata, ...updates, updatedAt: new Date().toISOString() }
                        : {
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            lastVisited: new Date().toISOString(),
                            visitCount: 0,
                            ...updates
                          }
                    }
                  : tab
              )
            )
          }))
        },

        getTabByRoute: (route) => {
          const state = get()
          return state.tabs.find(tab =>
            tab.route?.path === route.path &&
            JSON.stringify(tab.route?.params) === JSON.stringify(route.params) &&
            JSON.stringify(tab.route?.query) === JSON.stringify(route.query)
          )
        },

        getTabsByType: (type) => {
          const state = get()
          return state.tabs.filter(tab => tab.type === type)
        },

        getPinnedTabs: () => {
          const state = get()
          return state.tabs.filter(tab => tab.isPinned)
        },

        getUnpinnedTabs: () => {
          const state = get()
          return state.tabs.filter(tab => !tab.isPinned)
        },

        sortTabsByLastVisited: () => {
          set((state) => {
            const sortedTabs = [...state.tabs].sort((a, b) => {
              const aTime = a.metadata?.lastVisited || ''
              const bTime = b.metadata?.lastVisited || ''
              return new Date(bTime).getTime() - new Date(aTime).getTime()
            })
            return { tabs: sortTabsByPinState(sortedTabs) }
          })
        },

        incrementTabVisitCount: (tabId) => {
          set((state) => ({
            tabs: sortTabsByPinState(
              state.tabs.map(tab =>
                tab.id === tabId
                  ? {
                      ...tab,
                      metadata: tab.metadata
                        ? {
                            ...tab.metadata,
                            visitCount: tab.metadata.visitCount + 1,
                            lastVisited: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          }
                        : {
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            lastVisited: new Date().toISOString(),
                            visitCount: 1
                          }
                    }
                  : tab
              )
            )
          }))
        },

        rightPanelSize: 25,
        setRightPanelSize: (size) =>
          set(() => ({
            rightPanelSize: Math.min(Math.max(size, 20), 40),
          })),
        bottomPanelHeight: 30,
        setBottomPanelHeight: (size) =>
          set(() => ({
            bottomPanelHeight: Math.min(Math.max(size, 15), 60),
          })),
      }),
      {
        name: "yourever-ui",
        version: 4,
        storage: createJSONStorage(() => localStorageService.toStorageAdapter()),
        partialize: (state) => ({
          activeActivity: state.activeActivity,
          leftSidebarCollapsed: state.leftSidebarCollapsed,
          leftSidebarSize: state.leftSidebarSize,
          rightPanelCollapsed: state.rightPanelCollapsed,
          bottomPanelCollapsed: state.bottomPanelCollapsed,
          isBottomPanelOpen: state.isBottomPanelOpen,
          bottomPanelSession: state.bottomPanelSession,
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          floatingAssistantOpen: state.floatingAssistantOpen,
          floatingAssistantMinimized: state.floatingAssistantMinimized,
          rightPanelSize: state.rightPanelSize,
          bottomPanelHeight: state.bottomPanelHeight,
        }),
        migrate: (persistedState) => {
          const state = (persistedState as Partial<UIStoreState>) ?? {}
          const tabs = sortTabsByPinState(
            (state.tabs ?? DEFAULT_TABS).map((tab) => {
              const existingTab = tab as UITab
              return {
                ...existingTab,
                path: normalizeTabPath(existingTab.path ?? existingTab.route?.path ?? existingTab.id ?? ""),
                route: existingTab.route ?? (existingTab.path ? { path: existingTab.path } : { path: "/" }),
                metadata: existingTab.metadata ?? createMetadata(),
                isSplit: existingTab.isSplit ?? false,
                isPinned: existingTab.isPinned ?? false,
              }
            })
          )

          return {
            ...state,
            tabs,
            activeActivity: state.activeActivity ?? "home",
            leftSidebarCollapsed: state.leftSidebarCollapsed ?? false,
            leftSidebarSize: state.leftSidebarSize ?? 22,
            rightPanelCollapsed: state.rightPanelCollapsed ?? false,
            bottomPanelCollapsed: state.bottomPanelCollapsed ?? false,
            isBottomPanelOpen: state.isBottomPanelOpen ?? false,
            bottomPanelSession: state.bottomPanelSession ?? null,
            floatingAssistantOpen: state.floatingAssistantOpen ?? false,
            floatingAssistantMinimized: state.floatingAssistantMinimized ?? false,
            rightPanelSize: state.rightPanelSize ?? 25,
            bottomPanelHeight: state.bottomPanelHeight ?? 30,
            activeTabId:
              state.activeTabId ??
              tabs.find((tab) => tab.isActive)?.id ??
              (tabs.length > 0 ? tabs[0].id : null),
          }
        },
      }
    ),
    "UIStore"
  )
)

export const getUIState = () => useUIStore.getState()

// Selector hooks for components
export const useActiveTab = () => {
  const activeTabId = useUIStore((state) => state.activeTabId)
  const tabs = useUIStore((state) => state.tabs)
  return tabs.find(tab => tab.id === activeTabId)
}

export const useTabById = (tabId: string) => {
  const tabs = useUIStore((state) => state.tabs)
  return tabs.find(tab => tab.id === tabId)
}

export const useTabsByType = (type: UITabType) => {
  const tabs = useUIStore((state) => state.tabs)
  return tabs.filter(tab => tab.type === type)
}

export const usePinnedTabs = () => {
  const tabs = useUIStore((state) => state.tabs)
  return tabs.filter(tab => tab.isPinned)
}

export const useUnpinnedTabs = () => {
  const tabs = useUIStore((state) => state.tabs)
  return tabs.filter(tab => !tab.isPinned)
}

export const useTabCount = () => {
  const tabs = useUIStore((state) => state.tabs)
  return {
    total: tabs.length,
    pinned: tabs.filter(tab => tab.isPinned).length,
    unpinned: tabs.filter(tab => !tab.isPinned).length,
    dirty: tabs.filter(tab => tab.isDirty).length
  }
}

export const useTabWithUnsavedChanges = () => {
  const tabs = useUIStore((state) => state.tabs)
  return tabs.filter(tab => tab.isDirty)
}
