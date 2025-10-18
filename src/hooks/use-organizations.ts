'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api/http'
import { resolveApiUrl } from '@/lib/api/endpoints'
import { toast } from '@/hooks/use-toast'

// Types
export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  created_at: string
  divisions: Division[]
  user_role: string
}

export interface Division {
  id: string
  name: string
  key?: string
  description?: string
  org_id: string
  created_at: string
  user_role?: string
}

export interface Invitation {
  id: string
  email: string
  org_id?: string
  division_id?: string
  org_name?: string
  division_name?: string
  role: string
  message?: string
  status: string
  expires_at?: string
  created_at: string
  updated_at?: string
  accepted_at?: string
  declined_at?: string
  token?: string
  inviter_id?: string
  inviter_name?: string
}

export interface InvitationEnvelope {
  invitations: Invitation[]
}

export interface InvitationDraft {
  email: string
  role?: string
  division_id?: string | null
  message?: string
  expires_at?: string | null
}

export interface InvitationBatchCreateResponse {
  invitations: Invitation[]
  skipped: string[]
}

export interface OrganizationCreateData {
  name: string
  slug?: string
  description?: string
  division_name: string
  division_key?: string
  additional_divisions?: Array<{ name: string; key?: string }>
  invitations?: InvitationDraft[]
}

export interface SlugAvailability {
  slug: string
  isAvailable: boolean
  suggestions: string[]
}

export interface WorkspaceCreationResult {
  organization: Organization
  userRole: string
  templateApplied?: string | null
  activeInvitations: Invitation[]
  skippedInvites: string[]
}

// API Functions
const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  token: string | null,
  body?: unknown
): Promise<T> => {
  try {
    const response = await fetch(resolveApiUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      throw new ApiError(
        errorBody.detail || `Request to ${path} failed with status ${response.status}`,
        response.status,
        errorBody
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      { detail: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

// Hooks
export const useUserOrganizations = () => {
  const { getAccessToken } = useCurrentUser()

  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')
      return apiRequest<Organization[]>('GET', '/api/organizations', token)
    },
    enabled: !!getAccessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateOrganization = () => {
  const { getAccessToken } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: OrganizationCreateData) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')

      const normalizedInvitations = data.invitations
        ?.filter((invitation) => invitation.email?.trim())
        .map((invitation) => ({
          email: invitation.email.trim().toLowerCase(),
          role: invitation.role ?? 'member',
          division_id: invitation.division_id ?? undefined,
          message: invitation.message?.trim() || undefined,
          expires_at: invitation.expires_at ?? undefined,
        }))

      const payload = {
        name: data.name.trim(),
        slug: data.slug?.trim() || undefined,
        description: data.description?.trim() || undefined,
        divisionName: data.division_name.trim(),
        divisionKey: data.division_key?.trim() || undefined,
        divisions: data.additional_divisions && data.additional_divisions.length > 0
          ? data.additional_divisions.map((division) => ({
              name: division.name.trim(),
              key: division.key?.trim() || undefined,
              description: undefined,
            }))
          : undefined,
        invitations: normalizedInvitations && normalizedInvitations.length > 0
          ? normalizedInvitations.map((invitation) => ({
              email: invitation.email,
              role: invitation.role,
              divisionId: invitation.division_id,
              message: invitation.message,
              expiresAt: invitation.expires_at,
            }))
          : undefined,
      }

      return apiRequest<WorkspaceCreationResult>('POST', '/api/organizations', token, payload)
    },
    onSuccess: (result) => {
      const invitedCount = result.activeInvitations?.length ?? 0
      const skippedCount = result.skippedInvites?.length ?? 0

      const inviteSummary = invitedCount || skippedCount
        ? `${invitedCount} invited${
            skippedCount ? ` · ${skippedCount} skipped` : ''
          }`
        : null

      toast({
        title: 'Organization created!',
        description: inviteSummary
          ? `Welcome to ${result.organization.name} · ${inviteSummary}`
          : `Welcome to ${result.organization.name}`,
      })

      // Invalidate and refetch organizations
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['workspace-hub', 'overview'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.body?.detail
        : 'Failed to create organization'

      toast({
        title: 'Error creating organization',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useCheckSlugAvailability = () => {
  const { getAccessToken } = useCurrentUser()

  return useMutation({
    mutationFn: async (slug: string) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')
      return apiRequest<SlugAvailability>(
        'GET',
        `/api/organizations/slug/availability?slug=${encodeURIComponent(slug)}`,
        token
      )
    },
  })
}

export const usePendingInvitations = () => {
  const { getAccessToken } = useCurrentUser()

  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')
      const response = await apiRequest<InvitationEnvelope | Invitation[]>(
        'GET',
        '/api/organizations/invitations',
        token,
      )

      return Array.isArray(response) ? response : response?.invitations ?? []
    },
    enabled: !!getAccessToken,
    staleTime: 60 * 1000, // 1 minute
  })
}

export const useAcceptInvitation = () => {
  const { getAccessToken } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Authentication required')
      return apiRequest<Organization>(
        'POST',
        `/api/organizations/invitations/${invitationId}/accept`,
        accessToken,
      )
    },
    onSuccess: (organization) => {
      toast({
        title: 'Invitation accepted!',
        description: `You've joined ${organization.name}`,
      })

      // Invalidate and refetch organizations and invitations
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.body?.detail
        : 'Failed to accept invitation'

      toast({
        title: 'Error accepting invitation',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useDeclineInvitation = () => {
  const { getAccessToken } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Authentication required')
      return apiRequest<Invitation>(
        'POST',
        `/api/organizations/invitations/${invitationId}/decline`,
        accessToken,
      )
    },
    onSuccess: (invitation) => {
      toast({
        title: 'Invitation declined',
        description: invitation?.org_name
          ? `We'll let ${invitation.org_name} know you passed.`
          : 'The invitation has been declined.',
      })

      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.body?.detail
        : 'Failed to decline invitation'

      toast({
        title: 'Error declining invitation',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

interface SendInvitationsParams {
  orgId: string
  invitations: InvitationDraft[]
}

export const useSendInvitations = () => {
  const { getAccessToken } = useCurrentUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, invitations }: SendInvitationsParams) => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')

      const sanitized = invitations
        .filter((invitation) => invitation.email?.trim())
        .map((invitation) => ({
          email: invitation.email.trim(),
          role: invitation.role ?? 'member',
          division_id: invitation.division_id ?? undefined,
          message: invitation.message?.trim() || undefined,
          expires_at: invitation.expires_at ?? undefined,
        }))

      if (sanitized.length === 0) {
        throw new ApiError('At least one valid email is required', 400, {
          detail: 'No valid invitations were provided.',
        })
      }

      return apiRequest<InvitationBatchCreateResponse>(
        'POST',
        `/api/organizations/${orgId}/invitations`,
        token,
        { invitations: sanitized },
      )
    },
    onSuccess: (result) => {
      const invitedCount = result.invitations.length
      const skippedCount = result.skipped.length

      toast({
        title: invitedCount === 1 ? 'Invitation sent' : 'Invitations sent',
        description: skippedCount
          ? `${invitedCount} sent · ${skippedCount} skipped (already pending)`
          : `${invitedCount} invitation${invitedCount === 1 ? '' : 's'} on the way!`,
      })

      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.body?.detail
        : 'Failed to send invitations'

      toast({
        title: 'Error sending invitations',
        description: message,
        variant: 'destructive',
      })
    },
  })
}
