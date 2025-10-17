import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export type UITabType = "task" | "project" | "doc" | "channel" | "calendar" | "timeline"

export type TabSplitDirection = "left" | "right" | "up" | "down"
export type TabPaneId = "primary" | "secondary"

export interface UITab {
  id: string
  title: string
  type: UITabType
  path: string
  isDirty?: boolean
  isActive?: boolean
  isSplit?: boolean
  isPinned?: boolean
  splitDirection?: TabSplitDirection
  paneId?: TabPaneId
  splitGroupId?: string
  viewKey?: number
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
  paneActiveTabIds: Record<TabPaneId, string | null>
  splitLayout: { direction: TabSplitDirection } | null
  setActiveTabId: (tabId: string) => void
  openTab: (tab: UITab) => void
  closeTab: (tabId: string) => void
  closeAllTabs: () => void
  duplicateTab: (tabId: string) => void
  toggleTabPinned: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<UITab>) => void
  toggleSplitView: (tabId: string, direction?: TabSplitDirection) => void
  resetTabs: () => void

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
    isActive: true,
    isSplit: false,
    isPinned: false,
    splitDirection: undefined,
    paneId: "primary",
  },
  {
    id: "workspace",
    title: "Workspace",
    type: "project",
    path: "/workspace",
    isActive: false,
    isSplit: false,
    isPinned: false,
    splitDirection: undefined,
    paneId: "primary",
  },
  {
    id: "general-channel",
    title: "#general",
    type: "channel",
    path: "/channels/general",
    isDirty: true,
    isActive: false,
    isSplit: false,
    isPinned: false,
    splitDirection: undefined,
    paneId: "primary",
  },
]

const normalizeTabPath = (path: string) => {
  if (!path) {
    return "/dashboard"
  }

  return path.startsWith("/") ? path : `/${path}`
}

const ensurePaneId = (paneId?: TabPaneId): TabPaneId => paneId ?? "primary"

const markPaneActiveTab = (tabs: UITab[], targetId: string, paneId: TabPaneId) =>
  tabs.map((tab) => {
    if (ensurePaneId(tab.paneId) !== paneId) {
      return tab
    }

    return {
      ...tab,
      isActive: tab.id === targetId,
    }
  })

const clearPaneSplitState = (tabs: UITab[], groupId?: string) =>
  tabs.map((tab) => {
    if (!groupId || tab.splitGroupId !== groupId) {
      return tab
    }

    return {
      ...tab,
      isSplit: false,
      splitDirection: undefined,
      splitGroupId: undefined,
    }
  })

const collectPaneTabs = (tabs: UITab[], paneId: TabPaneId) =>
  tabs.filter((tab) => ensurePaneId(tab.paneId) === paneId)

const sortTabsByPinState = (tabs: UITab[]) => {
  const primaryTabs = collectPaneTabs(tabs, "primary")
  const secondaryTabs = collectPaneTabs(tabs, "secondary")

  const sortPane = (paneTabs: UITab[]) => {
    const pinned: UITab[] = []
    const unpinned: UITab[] = []

    paneTabs.forEach((tab) => {
      if (tab.isPinned) {
        pinned.push(tab)
      } else {
        unpinned.push(tab)
      }
    })

    return [...pinned, ...unpinned]
  }

  return [...sortPane(primaryTabs), ...sortPane(secondaryTabs)]
}

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
        paneActiveTabIds: {
          primary: DEFAULT_TABS[0]?.id ?? null,
          secondary: null,
        },
        splitLayout: null,
        setActiveTabId: (tabId) =>
          set((state) => {
            const targetTab = state.tabs.find((tab) => tab.id === tabId)
            if (!targetTab) {
              return {}
            }

            const paneId = ensurePaneId(targetTab.paneId)
            const updatedTabs = markPaneActiveTab(state.tabs, tabId, paneId)

            return {
              tabs: sortTabsByPinState(updatedTabs),
              activeTabId: paneId === "primary" ? tabId : state.activeTabId,
              paneActiveTabIds: {
                ...state.paneActiveTabIds,
                [paneId]: tabId,
              },
            }
          }),
        openTab: (tab) =>
          set((state) => {
            const paneId = ensurePaneId(tab.paneId)
            const normalizedPath = normalizeTabPath(tab.path)
            const existingIndex = state.tabs.findIndex((candidate) => candidate.id === tab.id)

            const applyActivation = (tabs: UITab[], targetId: string) =>
              tabs.map((candidate) => {
                if (ensurePaneId(candidate.paneId) !== paneId) {
                  return candidate
                }

                return {
                  ...candidate,
                  isActive: candidate.id === targetId,
                }
              })

            if (existingIndex >= 0) {
              const updatedTabs = state.tabs.map((candidate, index) => {
                if (index !== existingIndex) {
                  return candidate
                }

                return {
                  ...candidate,
                  ...tab,
                  path: normalizeTabPath(tab.path ?? candidate.path),
                  paneId,
                }
              })

              const activatedTabs = applyActivation(updatedTabs, tab.id)

              return {
                tabs: sortTabsByPinState(activatedTabs),
                activeTabId: paneId === "primary" ? tab.id : state.activeTabId,
                paneActiveTabIds: {
                  ...state.paneActiveTabIds,
                  [paneId]: tab.id,
                },
              }
            }

            const preparedTabs = state.tabs.map((candidate) =>
              ensurePaneId(candidate.paneId) === paneId
                ? { ...candidate, isActive: false }
                : candidate
            )

            const newTab: UITab = {
              ...tab,
              path: normalizedPath,
              isActive: true,
              isSplit: tab.isSplit ?? false,
              isPinned: tab.isPinned ?? false,
              splitDirection: tab.splitDirection,
              paneId,
              splitGroupId: tab.splitGroupId,
              viewKey: tab.viewKey ?? Date.now(),
            }

            const nextTabs = sortTabsByPinState([...preparedTabs, newTab])

            return {
              tabs: nextTabs,
              activeTabId: paneId === "primary" ? tab.id : state.activeTabId,
              paneActiveTabIds: {
                ...state.paneActiveTabIds,
                [paneId]: tab.id,
              },
            }
          }),
        closeTab: (tabId) =>
          set((state) => {
            const targetTab = state.tabs.find((tab) => tab.id === tabId)
            if (!targetTab) {
              return {}
            }

            const paneId = ensurePaneId(targetTab.paneId)
            const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId)

            const paneTabs = collectPaneTabs(remainingTabs, paneId)
            const closedWasActive = state.paneActiveTabIds[paneId] === tabId
            const fallbackTab = closedWasActive
              ? paneTabs.find((tab) => tab.isPinned) ?? paneTabs[0] ?? null
              : null

            const nextPaneActiveTabId = closedWasActive
              ? fallbackTab?.id ?? null
              : state.paneActiveTabIds[paneId] ?? null

            let paneActiveTabIds: Record<TabPaneId, string | null> = {
              ...state.paneActiveTabIds,
              [paneId]: nextPaneActiveTabId,
            }

            let splitLayout = state.splitLayout

            let normalizedTabs = remainingTabs.map((tab) => {
              if (ensurePaneId(tab.paneId) !== paneId) {
                return tab
              }

              return {
                ...tab,
                isActive: tab.id === nextPaneActiveTabId,
              }
            })

            if (paneId === "secondary" && paneTabs.length === 0) {
              splitLayout = null
              paneActiveTabIds = {
                ...paneActiveTabIds,
                secondary: null,
              }
            }

            if (targetTab.splitGroupId) {
              const hasCounterpart = normalizedTabs.some(
                (tab) =>
                  tab.splitGroupId === targetTab.splitGroupId &&
                  ensurePaneId(tab.paneId) !== paneId
              )

              if (!hasCounterpart) {
                normalizedTabs = clearPaneSplitState(normalizedTabs, targetTab.splitGroupId)
              }
            }

            const nextActiveId = paneId === "primary" ? nextPaneActiveTabId ?? null : state.activeTabId

            return {
              tabs: sortTabsByPinState(normalizedTabs),
              activeTabId: nextActiveId,
              paneActiveTabIds,
              splitLayout,
            }
          }),
        closeAllTabs: () =>
          set((state) => {
            const remainingTabs = state.tabs.filter((tab) => tab.isPinned)
            const groupedByPane: Record<TabPaneId, UITab[]> = {
              primary: collectPaneTabs(remainingTabs, "primary"),
              secondary: collectPaneTabs(remainingTabs, "secondary"),
            }

            const nextPaneActiveTabId: Record<TabPaneId, string | null> = {
              primary: groupedByPane.primary[0]?.id ?? null,
              secondary: groupedByPane.secondary[0]?.id ?? null,
            }

            let normalizedTabs = remainingTabs.map((tab) => ({
              ...tab,
              isActive: tab.id === nextPaneActiveTabId[ensurePaneId(tab.paneId)],
              isSplit: false,
              splitDirection: undefined,
              splitGroupId: undefined,
              paneId: ensurePaneId(tab.paneId),
            }))

            const splitLayout = groupedByPane.secondary.length > 0 ? state.splitLayout : null

            if (splitLayout === null) {
              normalizedTabs = normalizedTabs.map((tab) => ({
                ...tab,
                isSplit: false,
                splitDirection: undefined,
                splitGroupId: undefined,
              }))
            }

            return {
              tabs: sortTabsByPinState(normalizedTabs),
              activeTabId: nextPaneActiveTabId.primary,
              paneActiveTabIds: nextPaneActiveTabId,
              splitLayout,
            }
          }),
        duplicateTab: (tabId) =>
          set((state) => {
            const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId)
            if (tabIndex === -1) {
              return {}
            }

            const tabToDuplicate = state.tabs[tabIndex]
            const paneId = ensurePaneId(tabToDuplicate.paneId)
            const cloneId = `${tabToDuplicate.id}-copy-${Date.now()}`
            const duplicatedTab: UITab = {
              ...tabToDuplicate,
              id: cloneId,
              isActive: true,
              viewKey: Date.now(),
            }

            const deactivatedTabs = state.tabs.map((tab) =>
              ensurePaneId(tab.paneId) === paneId
                ? { ...tab, isActive: false }
                : tab
            )

            deactivatedTabs.splice(tabIndex + 1, 0, duplicatedTab)

            return {
              tabs: sortTabsByPinState(deactivatedTabs),
              activeTabId: paneId === "primary" ? cloneId : state.activeTabId,
              paneActiveTabIds: {
                ...state.paneActiveTabIds,
                [paneId]: cloneId,
              },
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
          set((state) => {
            const updatedTabs = state.tabs.map((tab) => {
              if (tab.id !== tabId) {
                return tab
              }

              const nextPaneId = ensurePaneId((updates as UITab).paneId ?? tab.paneId)

              return {
                ...tab,
                ...updates,
                paneId: nextPaneId,
                path: updates.path ? normalizeTabPath(updates.path) : tab.path,
              }
            })

            return {
              tabs: sortTabsByPinState(updatedTabs),
            }
          }),
        resetTabs: () =>
          set(() => ({
            tabs: DEFAULT_TABS,
            activeTabId: DEFAULT_TABS[0]?.id ?? null,
            paneActiveTabIds: {
              primary: DEFAULT_TABS[0]?.id ?? null,
              secondary: null,
            },
            splitLayout: null,
          })),
        toggleSplitView: (tabId, direction) =>
          set((state) => {
            const targetTab = state.tabs.find((tab) => tab.id === tabId)
            if (!targetTab) {
              return {}
            }

            const paneId = ensurePaneId(targetTab.paneId)
            const desiredDirection = direction ?? targetTab.splitDirection ?? "right"
            const groupId = targetTab.splitGroupId ?? `split-${Date.now()}`
            const secondaryTabs = collectPaneTabs(state.tabs, "secondary")
            const secondaryGroupTab = secondaryTabs.find((tab) => tab.splitGroupId === groupId)

            // Unsplitting logic when toggling without explicit direction
            if (!direction && (paneId === "secondary" || secondaryGroupTab)) {
              const filteredTabs = state.tabs.filter(
                (tab) => !(ensurePaneId(tab.paneId) === "secondary" && tab.splitGroupId === groupId)
              )

              let normalizedTabs = clearPaneSplitState(filteredTabs, groupId)

              const remainingSecondaryTabs = collectPaneTabs(normalizedTabs, "secondary")
              const nextSecondaryActive = remainingSecondaryTabs.find(
                (tab) => tab.id === state.paneActiveTabIds.secondary
              )?.id

              const fallbackSecondaryActive = nextSecondaryActive ?? remainingSecondaryTabs[0]?.id ?? null

              normalizedTabs = normalizedTabs.map((tab) =>
                ensurePaneId(tab.paneId) === "secondary"
                  ? { ...tab, isActive: tab.id === fallbackSecondaryActive }
                  : tab
              )

              return {
                tabs: sortTabsByPinState(normalizedTabs),
                splitLayout: remainingSecondaryTabs.length > 0 ? state.splitLayout : null,
                paneActiveTabIds: {
                  ...state.paneActiveTabIds,
                  secondary: remainingSecondaryTabs.length > 0 ? fallbackSecondaryActive : null,
                },
              }
            }

            const cloneId = secondaryGroupTab?.id ?? `${tabId}-split-${Date.now()}`

            let updatedTabs = state.tabs.map((tab) => {
              if (tab.id === targetTab.id) {
                return {
                  ...tab,
                  isSplit: true,
                  splitDirection: desiredDirection,
                  splitGroupId: groupId,
                  paneId: "primary",
                }
              }

              if (tab.id === cloneId) {
                return {
                  ...tab,
                  paneId: "secondary",
                  isActive: true,
                  isSplit: true,
                  splitDirection: desiredDirection,
                  splitGroupId: groupId,
                }
              }

              if (ensurePaneId(tab.paneId) === "secondary") {
                return {
                  ...tab,
                  isActive: tab.id === cloneId,
                  splitDirection: desiredDirection,
                }
              }

              return tab
            })

            if (!secondaryGroupTab) {
              const cloneTab: UITab = {
                ...targetTab,
                id: cloneId,
                paneId: "secondary",
                isActive: true,
                isSplit: true,
                splitDirection: desiredDirection,
                splitGroupId: groupId,
                viewKey: Date.now(),
              }

              updatedTabs = [...updatedTabs, cloneTab]
            }

            return {
              tabs: sortTabsByPinState(updatedTabs),
              splitLayout: { direction: desiredDirection },
              paneActiveTabIds: {
                ...state.paneActiveTabIds,
                primary: paneId === "primary" ? tabId : state.paneActiveTabIds.primary,
                secondary: cloneId,
              },
            }
          }),

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
        version: 5,
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
          paneActiveTabIds: state.paneActiveTabIds,
          splitLayout: state.splitLayout,
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
              splitDirection: (tab as UITab).splitDirection,
              paneId: ensurePaneId((tab as UITab).paneId),
            }))
          )

          const paneActiveTabIds: Record<TabPaneId, string | null> = {
            primary:
              state.paneActiveTabIds?.primary ??
              tabs.find((tab) => ensurePaneId(tab.paneId) === "primary" && tab.isActive)?.id ??
              tabs.find((tab) => ensurePaneId(tab.paneId) === "primary")?.id ??
              null,
            secondary:
              state.paneActiveTabIds?.secondary ??
              tabs.find((tab) => ensurePaneId(tab.paneId) === "secondary" && tab.isActive)?.id ??
              tabs.find((tab) => ensurePaneId(tab.paneId) === "secondary")?.id ??
              null,
          }

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
            paneActiveTabIds,
            splitLayout: state.splitLayout ?? null,
          }
        },
      }
    ),
    "UIStore"
  )
)

export const getUIState = () => useUIStore.getState()
