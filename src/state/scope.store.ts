import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { WorkspaceOrganization, WorkspaceDivision } from "@/modules/auth/types"
import { localStorageService } from "@/lib/storage"
import { withOptionalDevtools } from "@/state/store-utils"

export type ProjectScopeSource = "route" | "manual" | "system" | null

export interface ScopeSnapshot {
  userId: string | null
  organizations: WorkspaceOrganization[]
  currentOrgId: string | null
  currentDivisionId: string | null
  currentProjectId: string | null
  currentOrganization: WorkspaceOrganization | null
  currentDivision: WorkspaceDivision | null
  isReady: boolean
  status: import("@/modules/scope/types").ScopeStatus
  error: string | null
  lastSyncedAt: string | null
  projectScopeSource: ProjectScopeSource
  projectScopeReason: string | null
  projectScopeUpdatedAt: string | null
  // Enhanced project metadata
  projectData: import("@/modules/projects/contracts").ProjectSummary | null
  breadcrumbs: Array<{
    id: string
    name: string
    type: 'organization' | 'division' | 'project'
    href: string
  }>
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
  currentProjectId: null,
  currentOrganization: null,
  currentDivision: null,
  isReady: false,
  status: 'idle',
  error: null,
  lastSyncedAt: null,
  projectScopeSource: null,
  projectScopeReason: null,
  projectScopeUpdatedAt: null,
  projectData: null,
  breadcrumbs: [],
}

const computeWorkspaceBasePath = (snapshot: ScopeSnapshot) => {
  if (snapshot.currentOrgId && snapshot.currentDivisionId && snapshot.currentProjectId) {
    return `/${snapshot.currentOrgId}/${snapshot.currentDivisionId}/projects/${snapshot.currentProjectId}`
  }

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
          currentProjectId: state.currentProjectId,
          projectScopeSource: state.projectScopeSource,
          projectScopeReason: state.projectScopeReason,
          projectScopeUpdatedAt: state.projectScopeUpdatedAt,
          workspaceBasePath: state.workspaceBasePath,
        }),
        migrate: (persistedState) => {
          const state = (persistedState as Partial<ScopeStoreState>) ?? {}
          const currentOrgId = state.currentOrgId ?? null
          const currentDivisionId = state.currentDivisionId ?? null
          const currentProjectId = state.currentProjectId ?? null
          const projectScopeSource = state.projectScopeSource ?? null
          const projectScopeReason = state.projectScopeReason ?? null
          const projectScopeUpdatedAt = state.projectScopeUpdatedAt ?? null

          const snapshot: ScopeStoreState = {
            ...initialSnapshot,
            ...state,
            currentOrgId,
            currentDivisionId,
            currentProjectId,
            projectScopeSource,
            projectScopeReason,
            projectScopeUpdatedAt,
            setSnapshot: () => {
              // set function will be provided by zustand store
              throw new Error("setSnapshot cannot be called during migration")
            },
            workspaceBasePath: computeWorkspaceBasePath({
              ...initialSnapshot,
              currentOrgId,
              currentDivisionId,
              currentProjectId,
              organizations: [],
              currentOrganization: null,
              currentDivision: null,
              userId: state.userId ?? null,
              isReady: state.isReady ?? false,
              status: state.status ?? 'idle',
              error: state.error ?? null,
              lastSyncedAt: state.lastSyncedAt ?? null,
              projectScopeSource,
              projectScopeReason,
              projectScopeUpdatedAt,
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
