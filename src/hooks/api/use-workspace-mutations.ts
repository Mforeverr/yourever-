'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createWorkspaceChannel,
  createWorkspaceProject,
  deleteWorkspaceChannel,
  deleteWorkspaceProject,
  updateWorkspaceChannel,
  updateWorkspaceProject,
} from '@/lib/api/workspace'
import type {
  CreateChannelPayload,
  CreateProjectPayload,
  UpdateChannelPayload,
  UpdateProjectPayload,
} from '@/modules/workspace/types'

const invalidateWorkspaceQueries = (queryClient: ReturnType<typeof useQueryClient>, orgId: string, divisionId?: string | null) => {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [namespace, resource] = Array.isArray(query.queryKey) ? (query.queryKey as unknown[]).slice(0, 2) : []
      if (namespace !== 'workspace') return false
      if (resource === 'overview') {
        const [, , queryOrgId, queryDivisionId] = query.queryKey as unknown[]
        if (queryOrgId !== orgId) {
          return false
        }
        return divisionId === undefined || queryDivisionId === (divisionId ?? null)
      }
      if (resource === 'channels' && divisionId) {
        return query.queryKey[2] === orgId && query.queryKey[3] === divisionId
      }
      if (resource === 'activities' && divisionId) {
        return query.queryKey[2] === orgId && query.queryKey[3] === divisionId
      }
      return true
    },
  })
}

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orgId, payload }: { orgId: string; payload: CreateProjectPayload }) =>
      createWorkspaceProject(orgId, payload),
    onSuccess: (project, { orgId, payload }) => {
      invalidateWorkspaceQueries(queryClient, orgId, payload.divisionId ?? null)
    },
  })
}

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, orgId, payload }: { projectId: string; orgId: string; payload: UpdateProjectPayload }) =>
      updateWorkspaceProject(projectId, orgId, payload),
    onSuccess: (project, { orgId, payload }) => {
      invalidateWorkspaceQueries(queryClient, orgId, payload.divisionId ?? null)
    },
  })
}

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, orgId }: { projectId: string; orgId: string }) =>
      deleteWorkspaceProject(projectId, orgId),
    onSuccess: (_, { orgId }) => {
      invalidateWorkspaceQueries(queryClient, orgId)
    },
  })
}

export const useCreateChannelMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orgId, payload }: { orgId: string; payload: CreateChannelPayload }) =>
      createWorkspaceChannel(orgId, payload),
    onSuccess: (channel, { orgId, payload }) => {
      invalidateWorkspaceQueries(queryClient, orgId, payload.divisionId ?? null)
    },
  })
}

export const useUpdateChannelMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, orgId, payload }: { channelId: string; orgId: string; payload: UpdateChannelPayload }) =>
      updateWorkspaceChannel(channelId, orgId, payload),
    onSuccess: (channel) => {
      invalidateWorkspaceQueries(queryClient, channel.orgId, channel.divisionId)
    },
  })
}

export const useDeleteChannelMutation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, orgId }: { channelId: string; orgId: string }) =>
      deleteWorkspaceChannel(channelId, orgId),
    onSuccess: (_, { orgId, channelId }) => {
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey.includes(channelId),
      })
      invalidateWorkspaceQueries(queryClient, orgId)
    },
  })
}
