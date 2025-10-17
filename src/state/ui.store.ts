import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export type UITabType = "task" | "project" | "doc" | "channel" | "calendar" | "timeline"

export interface UITab {
  id: string
  title: string
  type: UITabType
  path: string
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

  rightPanelSize: number
  setRightPanelSize: (size: number) => void
  bottomPanelHeight: number
  setBottomPanelHeight: (size: number) => void
}

const DEFAULT_TABS: UITab[] = [
  { id: "dashboard", title: "Dashboard", type: "project", path: "/dashboard", isActive: true, isSplit: false, isPinned: false },
  { id: "workspace", title: "Workspace", type: "project", path: "/workspace", isActive: false, isSplit: false, isPinned: false },
  {
    id: "general-channel",
    title: "#general",
    type: "channel",
    path: "/channels/general",
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
      (set) => ({
        activeActivity: "home",
        setActiveActivity: (activity) => set({ activeActivity: activity }),

        leftSidebarCollapsed: false,
        toggleLeftSidebar: () => set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
        setLeftSidebarCollapsed: (collapsed) => set({ leftSidebarCollapsed: collapsed }),

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
                        path: normalizeTabPath(tab.path ?? candidate.path),
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

            const normalizedPath = normalizeTabPath(tab.path)
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
        duplicateTab: (tabId) =>
          set((state) => {
            const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
            if (tabIndex === -1) {
              return {}
            }

            const tabToDuplicate = state.tabs[tabIndex]
            const cloneId = `${tabToDuplicate.id}-copy-${Date.now()}`
            const duplicatedTab: UITab = {
              ...tabToDuplicate,
              id: cloneId,
              isActive: true,
            }

            const deactivatedTabs = state.tabs.map((tab) => ({
              ...tab,
              isActive: false,
            }))

            deactivatedTabs.splice(tabIndex + 1, 0, duplicatedTab)

            const nextTabs = sortTabsByPinState(deactivatedTabs)

            return {
              tabs: nextTabs,
              activeTabId: cloneId,
            }
          }),
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
                      path: updates.path ? normalizeTabPath(updates.path) : tab.path,
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
            (state.tabs ?? DEFAULT_TABS).map((tab) => ({
              ...tab,
              path: normalizeTabPath((tab as UITab).path ?? tab.id ?? ""),
              isSplit: tab.isSplit ?? false,
              isPinned: tab.isPinned ?? false,
            }))
          )

          return {
            ...state,
            tabs,
            activeActivity: state.activeActivity ?? "home",
            leftSidebarCollapsed: state.leftSidebarCollapsed ?? false,
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
