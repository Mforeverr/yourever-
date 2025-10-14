import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Organization, OrganizationDivision } from "@/lib/mock-users"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export interface ScopeSnapshot {
  userId: string | null
  organizations: Organization[]
  currentOrgId: string | null
  currentDivisionId: string | null
  currentOrganization: Organization | null
  currentDivision: OrganizationDivision | null
  isReady: boolean
}

interface ScopeStoreState extends ScopeSnapshot {
  workspaceBasePath: string
  setSnapshot: (snapshot: ScopeSnapshot) => void
}

const initialSnapshot: ScopeSnapshot = {
  userId: null,
  organizations: [],
  currentOrgId: null,
  currentDivisionId: null,
  currentOrganization: null,
  currentDivision: null,
  isReady: false,
}

const computeWorkspaceBasePath = (snapshot: ScopeSnapshot) => {
  if (snapshot.currentOrgId && snapshot.currentDivisionId) {
    return `/${snapshot.currentOrgId}/${snapshot.currentDivisionId}`
  }

  return "/workspace-hub"
}

export const useScopeStore = create<ScopeStoreState>()(
  withOptionalDevtools(
    persist(
      (set) => ({
        ...initialSnapshot,
        workspaceBasePath: computeWorkspaceBasePath(initialSnapshot),
        setSnapshot: (snapshot) =>
          set({
            ...snapshot,
            workspaceBasePath: computeWorkspaceBasePath(snapshot),
          }),
      }),
      {
        name: "yourever-scope",
        version: 2,
        storage: createJSONStorage(() => localStorageService.toStorageAdapter()),
        partialize: (state) => ({
          userId: state.userId,
          currentOrgId: state.currentOrgId,
          currentDivisionId: state.currentDivisionId,
          workspaceBasePath: state.workspaceBasePath,
        }),
        migrate: (persistedState) => {
          const state = (persistedState as Partial<ScopeStoreState>) ?? {}
          const currentOrgId = state.currentOrgId ?? null
          const currentDivisionId = state.currentDivisionId ?? null

          const snapshot: ScopeStoreState = {
            ...initialSnapshot,
            ...state,
            currentOrgId,
            currentDivisionId,
            workspaceBasePath: computeWorkspaceBasePath({
              ...initialSnapshot,
              currentOrgId,
              currentDivisionId,
              organizations: [],
              currentOrganization: null,
              currentDivision: null,
              userId: state.userId ?? null,
              isReady: state.isReady ?? false,
            }),
          }

          return snapshot
        },
      }
    ),
    "ScopeStore"
  )
)

export const getScopeSnapshot = () => useScopeStore.getState()
