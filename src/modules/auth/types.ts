export type MembershipRole = 'owner' | 'admin' | 'member' | 'lead' | 'viewer' | string

export interface WorkspaceDivision {
  id: string
  name: string
  key?: string | null
  description?: string | null
  orgId?: string | null
  userRole?: MembershipRole | null
}

export interface WorkspaceOrganization {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  divisions: WorkspaceDivision[]
  userRole: MembershipRole | null
}

export interface WorkspaceUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  displayName: string
  avatar?: string | null
  avatarUrl?: string | null
  role?: MembershipRole | null
  timezone?: string | null
  organizations: WorkspaceOrganization[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AuthSessionMetadata {
  userId: string
  sessionId?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  provider: string
  audience?: string | null
  roles: MembershipRole[]
  claims: Record<string, unknown>
}

export interface AuthSessionSnapshot {
  user: WorkspaceUser | null
  session: AuthSessionMetadata
  featureFlags: Record<string, boolean>
}
