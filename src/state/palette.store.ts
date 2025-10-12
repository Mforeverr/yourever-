import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  PaletteQuickAddOptions,
  PaletteSearchResult,
} from "@/types/command-palette"
import { sessionStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

interface PaletteStoreState {
  isOpen: boolean
  query: string
  isSearching: boolean
  results: PaletteSearchResult[]
  error?: string
  quickAdd: PaletteQuickAddOptions | null
  setQuery: (query: string) => void
  setResults: (results: PaletteSearchResult[]) => void
  setIsSearching: (isSearching: boolean) => void
  setError: (error?: string) => void
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  openQuickAdd: (options: PaletteQuickAddOptions) => void
  closeQuickAdd: () => void
  resetSearch: () => void
}

export const usePaletteStore = create<PaletteStoreState>()(
  withOptionalDevtools(
    persist(
      (set) => ({
        isOpen: false,
        query: "",
        isSearching: false,
        results: [],
        error: undefined,
        quickAdd: null,
        setQuery: (query) => set({ query, error: undefined }),
        setResults: (results) => set({ results }),
        setIsSearching: (isSearching) => set({ isSearching }),
        setError: (error) => set({ error }),
        openPalette: () => set({ isOpen: true }),
        closePalette: () =>
          set({
            isOpen: false,
            query: "",
            results: [],
            isSearching: false,
            error: undefined,
          }),
        togglePalette: () =>
          set((state) => {
            const nextOpen = !state.isOpen
            if (nextOpen) {
              return { isOpen: true }
            }
            return {
              isOpen: false,
              query: "",
              results: [],
              isSearching: false,
              error: undefined,
            }
          }),
        openQuickAdd: (options) =>
          set({
            quickAdd: options,
            isOpen: false,
            query: "",
            results: [],
            isSearching: false,
            error: undefined,
          }),
        closeQuickAdd: () => set({ quickAdd: null }),
        resetSearch: () => set({ query: "", results: [], error: undefined, isSearching: false }),
      }),
      {
        name: "yourever-palette",
        version: 1,
        storage: createJSONStorage(() => sessionStorageService.toStorageAdapter()),
        partialize: (state) => ({
          query: state.query,
          results: state.results,
          error: state.error,
        }),
        migrate: (persistedState) => {
          const state = (persistedState as Partial<PaletteStoreState>) ?? {}
          return {
            query: state.query ?? "",
            results: state.results ?? [],
            error: state.error,
          }
        },
      }
    ),
    "PaletteStore"
  )
)
