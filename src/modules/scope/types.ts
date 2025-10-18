export type ScopeStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ScopeContext {
  orgId: string
  divisionId?: string | null
  role?: string | null
  divisionRole?: string | null
  permissions: string[]
  lastUpdatedAt?: string | null
}

export interface ScopeState {
  userId: string
  organizations: import('@/modules/auth/types').WorkspaceOrganization[]
  active?: ScopeContext | null
  rememberedAt?: string | null
  cachedAt?: string | null
}

export interface ScopeUpdateRequest {
  orgId: string
  divisionId?: string | null
  reason?: string
}

export type ScopeUpdateResponse = ScopeState
