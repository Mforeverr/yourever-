import { httpRequest } from '@/lib/api/http'
import type {
  HubInvitation,
  HubOverview,
  HubOrganization,
  InvitationActionPayload,
} from '@/modules/organizations/types'

const ORGANIZATIONS_ENDPOINT = '/api/organizations'

export const fetchWorkspaceHubOverview = (signal?: AbortSignal): Promise<HubOverview> => {
  const endpoint = `${ORGANIZATIONS_ENDPOINT}/hub`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET' },
  })
}

export const fetchPendingInvitations = (signal?: AbortSignal): Promise<HubInvitation[]> => {
  const endpoint = `${ORGANIZATIONS_ENDPOINT}/pending-invitations`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET' },
  }).then((response) => (response as { invitations?: HubInvitation[] })?.invitations ?? [])
}

export const acceptOrganizationInvitation = (
  orgId: string,
  payload: InvitationActionPayload,
): Promise<HubOrganization> => {
  const endpoint = `${ORGANIZATIONS_ENDPOINT}/${orgId}/accept-invitation`
  return httpRequest('POST', endpoint, {
    body: payload,
    meta: { endpoint, method: 'POST', scope: { orgId } },
  })
}

export const declineOrganizationInvitation = (
  orgId: string,
  payload: InvitationActionPayload,
): Promise<HubInvitation> => {
  const endpoint = `${ORGANIZATIONS_ENDPOINT}/${orgId}/decline-invitation`
  return httpRequest('POST', endpoint, {
    body: payload,
    meta: { endpoint, method: 'POST', scope: { orgId } },
  })
}
