import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export type UITabType = "task" | "project" | "doc" | "channel" | "calendar" | "timeline"

export interface UITab {
  id: string
  title: string
  type: UITabType
  isDirty?: boolean
  isActive?: boolean
  isSplit?: boolean
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
  updateTab: (tabId: string, updates: Partial<UITab>) => void
  toggleSplitView: (tabId: string) => void
  resetTabs: () => void

  rightPanelSize: number
  setRightPanelSize: (size: number) => void
  bottomPanelHeight: number
  setBottomPanelHeight: (size: number) => void
}

const DEFAULT_TABS: UITab[] = [
  { id: "dashboard", title: "Dashboard", type: "project", isActive: true, isSplit: false },
  { id: "website-revamp", title: "Website Revamp", type: "project", isActive: false, isSplit: false },
  { id: "general-channel", title: "#general", type: "channel", isDirty: true, isActive: false, isSplit: false },
]

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
              const updatedTabs = state.tabs.map((candidate, index) => ({
                ...candidate,
                ...(index === existingIndex ? { ...candidate, ...tab, isActive: true } : { isActive: false }),
              }))
              return {
                tabs: updatedTabs,
                activeTabId: tab.id,
              }
            }

            return {
              tabs: [
                ...state.tabs.map((candidate) => ({ ...candidate, isActive: false })),
                { ...tab, isActive: true, isSplit: tab.isSplit ?? false },
              ],
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

            return {
              tabs: filteredTabs.map((tab) => ({
                ...tab,
                isActive: tab.id === nextActiveId,
              })),
              activeTabId: nextActiveId,
            }
          }),
        updateTab: (tabId, updates) =>
          set((state) => ({
            tabs: state.tabs.map((tab) =>
              tab.id === tabId
                ? {
                    ...tab,
                    ...updates,
                  }
                : tab
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
        version: 3,
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
          const tabs = (state.tabs ?? DEFAULT_TABS).map((tab) => ({
            ...tab,
            isSplit: tab.isSplit ?? false,
          }))

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
