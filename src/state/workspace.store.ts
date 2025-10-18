import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { localStorageService } from '@/lib/storage'
import { withOptionalDevtools } from '@/state/store-utils'

interface WorkspaceUIState {
  selectedChannelId: string | null
  channelSearch: string
  showTemplatesBanner: boolean
}

interface WorkspaceUIActions {
  setSelectedChannel: (channelId: string | null) => void
  setChannelSearch: (query: string) => void
  dismissTemplatesBanner: () => void
  reset: () => void
}

export type WorkspaceStoreState = WorkspaceUIState & WorkspaceUIActions

const initialState: WorkspaceUIState = {
  selectedChannelId: null,
  channelSearch: '',
  showTemplatesBanner: true,
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  withOptionalDevtools(
    persist(
      (set) => ({
        ...initialState,
        setSelectedChannel: (channelId) => set({ selectedChannelId: channelId }),
        setChannelSearch: (query) => set({ channelSearch: query }),
        dismissTemplatesBanner: () => set({ showTemplatesBanner: false }),
        reset: () => set(initialState),
      }),
      {
        name: 'workspace-ui',
        version: 1,
        storage: createJSONStorage(() => localStorageService.toStorageAdapter()),
        partialize: (state) => ({
          selectedChannelId: state.selectedChannelId,
          channelSearch: state.channelSearch,
          showTemplatesBanner: state.showTemplatesBanner,
        }),
      },
    ),
    'WorkspaceStore',
  ),
)
