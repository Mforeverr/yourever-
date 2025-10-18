import { httpRequest } from '@/lib/api/http'
import type {
  ActivityFeedResponse,
  ChannelListResponse,
  DashboardSummary,
  CreateChannelPayload,
  CreateProjectPayload,
  UpdateChannelPayload,
  UpdateProjectPayload,
  WorkspaceChannel,
  WorkspaceOverview,
  WorkspaceProject,
} from '@/modules/workspace/types'

const WORKSPACE_ENDPOINT = '/api/workspaces'

export const fetchWorkspaceOverview = (
  orgId: string,
  options?: { divisionId?: string | null; includeTemplates?: boolean },
  signal?: AbortSignal,
): Promise<WorkspaceOverview> => {
  const params = new URLSearchParams()
  if (options?.divisionId) params.set('divisionId', options.divisionId)
  params.set('includeTemplates', `${options?.includeTemplates ?? true}`)
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/overview?${params.toString()}`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET', scope: { orgId, divisionId: options?.divisionId ?? undefined } },
  })
}

export const fetchWorkspaceDashboardSummary = (
  orgId: string,
  options?: { divisionId?: string | null; includeTemplates?: boolean },
  signal?: AbortSignal,
): Promise<DashboardSummary> => {
  const params = new URLSearchParams()
  if (options?.divisionId) params.set('divisionId', options.divisionId)
  params.set('includeTemplates', `${options?.includeTemplates ?? true}`)
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/dashboard?${params.toString()}`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET', scope: { orgId, divisionId: options?.divisionId ?? undefined } },
  })
}

export const fetchDivisionChannels = (
  orgId: string,
  divisionId: string,
  options?: { includeTemplates?: boolean; page?: number; pageSize?: number },
  signal?: AbortSignal,
): Promise<ChannelListResponse> => {
  const params = new URLSearchParams()
  params.set('includeTemplates', `${options?.includeTemplates ?? true}`)
  if (options?.page) params.set('page', `${options.page}`)
  if (options?.pageSize) params.set('pageSize', `${options.pageSize}`)
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/divisions/${divisionId}/channels?${params.toString()}`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET', scope: { orgId, divisionId } },
  })
}

export const fetchActivityFeed = (
  orgId: string,
  divisionId: string,
  options?: { includeTemplates?: boolean; limit?: number; cursor?: string },
  signal?: AbortSignal,
): Promise<ActivityFeedResponse> => {
  const params = new URLSearchParams()
  params.set('includeTemplates', `${options?.includeTemplates ?? true}`)
  if (options?.limit) params.set('limit', `${options.limit}`)
  if (options?.cursor) params.set('cursor', options.cursor)
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/divisions/${divisionId}/activities?${params.toString()}`
  return httpRequest('GET', endpoint, {
    signal,
    meta: { endpoint, method: 'GET', scope: { orgId, divisionId } },
  })
}

export const createWorkspaceProject = (
  orgId: string,
  payload: CreateProjectPayload,
): Promise<WorkspaceProject> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/projects`
  return httpRequest('POST', endpoint, {
    body: payload,
    meta: { endpoint, method: 'POST', scope: { orgId, divisionId: payload.divisionId ?? undefined } },
  })
}

export const updateWorkspaceProject = (
  projectId: string,
  orgId: string,
  payload: UpdateProjectPayload,
): Promise<WorkspaceProject> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/projects/${projectId}`
  const params = new URLSearchParams({ orgId })
  return httpRequest('PATCH', `${endpoint}?${params.toString()}`, {
    body: payload,
    meta: { endpoint, method: 'PATCH', scope: { orgId, divisionId: payload.divisionId ?? undefined } },
  })
}

export const deleteWorkspaceProject = (
  projectId: string,
  orgId: string,
): Promise<void> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/projects/${projectId}`
  const params = new URLSearchParams({ orgId })
  return httpRequest('DELETE', `${endpoint}?${params.toString()}`, {
    meta: { endpoint, method: 'DELETE', scope: { orgId } },
  })
}

export const createWorkspaceChannel = (
  orgId: string,
  payload: CreateChannelPayload,
): Promise<WorkspaceChannel> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/${orgId}/channels`
  return httpRequest('POST', endpoint, {
    body: payload,
    meta: { endpoint, method: 'POST', scope: { orgId, divisionId: payload.divisionId ?? undefined } },
  })
}

export const updateWorkspaceChannel = (
  channelId: string,
  orgId: string,
  payload: UpdateChannelPayload,
): Promise<WorkspaceChannel> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/channels/${channelId}`
  const params = new URLSearchParams({ orgId })
  return httpRequest('PATCH', `${endpoint}?${params.toString()}`, {
    body: payload,
    meta: { endpoint, method: 'PATCH', scope: { orgId, divisionId: payload.divisionId ?? undefined } },
  })
}

export const deleteWorkspaceChannel = (
  channelId: string,
  orgId: string,
): Promise<void> => {
  const endpoint = `${WORKSPACE_ENDPOINT}/channels/${channelId}`
  const params = new URLSearchParams({ orgId })
  return httpRequest('DELETE', `${endpoint}?${params.toString()}`, {
    meta: { endpoint, method: 'DELETE', scope: { orgId } },
  })
}
