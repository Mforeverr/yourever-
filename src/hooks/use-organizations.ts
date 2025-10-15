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
  inviter_name?: string
}

export interface Template {
  id: string
  name: string
  description?: string
  category?: string
  tools: Record<string, any>
  functions: Record<string, any>
  intents: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface OrganizationCreateData {
  name: string
  slug?: string
  description?: string
  division_name: string
  division_key?: string
  template_id?: string
}

export interface SlugAvailability {
  slug: string
  is_available: boolean
  suggestions: string[]
}

export interface WorkspaceCreationResult {
  organization: Organization
  user_role: string
  template_applied?: string
  active_invitations: Invitation[]
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
      return apiRequest<WorkspaceCreationResult>('POST', '/api/organizations', token, data)
    },
    onSuccess: (result) => {
      toast({
        title: 'Organization created!',
        description: `Welcome to ${result.organization.name}`,
      })

      // Invalidate and refetch organizations
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
    onError: (error) => {
      const message = error instanceof ApiError
        ? error.detail
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
      const response = await apiRequest<Invitation[] | { invitations: Invitation[] }>(
        'GET',
        '/api/organizations/invitations',
        token,
      )

      if (Array.isArray(response)) {
        return response
      }

      return response?.invitations ?? []
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
        ? error.detail
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
        ? error.detail
        : 'Failed to decline invitation'

      toast({
        title: 'Error declining invitation',
        description: message,
        variant: 'destructive',
      })
    },
  })
}

export const useAvailableTemplates = () => {
  const { getAccessToken } = useCurrentUser()

  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const token = await getAccessToken()
      if (!token) throw new Error('Authentication required')
      return apiRequest<Template[]>('GET', '/api/organizations/templates', token)
    },
    enabled: !!getAccessToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}