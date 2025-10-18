'use client'

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import {
  acceptOrganizationInvitation,
  declineOrganizationInvitation,
  fetchWorkspaceHubOverview,
} from '@/lib/api/organizations'
import type { HubOverview, InvitationActionPayload } from '@/modules/organizations/types'

export type WorkspaceHubQueryKey = ['workspace-hub', 'overview']

const HUB_QUERY_KEY: WorkspaceHubQueryKey = ['workspace-hub', 'overview']

export const useWorkspaceHubOverviewQuery = (
  options?: Omit<UseQueryOptions<HubOverview, unknown, HubOverview, WorkspaceHubQueryKey>, 'queryFn' | 'queryKey'>,
) =>
  useQuery({
    queryKey: HUB_QUERY_KEY,
    queryFn: ({ signal }) => fetchWorkspaceHubOverview(signal),
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })

export const useAcceptHubInvitationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
      acceptOrganizationInvitation(orgId, { invitationId }),
    onSuccess: (_organization, variables) => {
      queryClient.invalidateQueries({ queryKey: HUB_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['scope'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })
}

export const useDeclineHubInvitationMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orgId, invitationId }: { orgId: string; invitationId: string }) =>
      declineOrganizationInvitation(orgId, { invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HUB_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
  })
}

export const buildInvitationActionPayload = (invitationId: string): InvitationActionPayload => ({
  invitationId,
})
