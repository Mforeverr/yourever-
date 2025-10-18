export interface HubDivision {
  id: string
  name: string
  key?: string | null
  description?: string | null
  orgId: string
  createdAt?: string | null
  userRole?: string | null
}

export interface HubOrganization {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  logoUrl?: string | null
  createdAt?: string | null
  userRole?: string | null
  divisions: HubDivision[]
  industry?: string | null
  location?: string | null
  timezone?: string | null
  memberCount?: number | null
  activeProjects?: number | null
  lastActiveAt?: string | null
  tags?: string[] | null
  accentColor?: string | null
}

export interface HubInvitation {
  id: string
  email: string
  orgId?: string | null
  divisionId?: string | null
  role: string
  message?: string | null
  status: string
  token?: string | null
  tokenHash?: string | null
  inviterId?: string | null
  inviterName?: string | null
  orgName?: string | null
  divisionName?: string | null
  createdAt: string
  updatedAt?: string | null
  expiresAt?: string | null
  acceptedAt?: string | null
  declinedAt?: string | null
}

export interface HubStats {
  totalOrganizations: number
  pendingInvitations: number
  lastUpdatedAt: string
}

export interface HubOverview {
  organizations: HubOrganization[]
  invitations: HubInvitation[]
  stats: HubStats
}

export interface InvitationActionPayload {
  invitationId: string
}
