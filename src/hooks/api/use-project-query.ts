'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchProject, fetchProjectsByScope, fetchProjectWorkspaceSnapshot } from '@/lib/api/projects'
import type { ProjectDetailResponse, ProjectSummary, ProjectWorkspaceSnapshot } from '@/modules/projects/contracts'

export type ProjectDetailKey = ['project', 'detail', string]

export const buildProjectDetailKey = (projectId: string): ProjectDetailKey => [
  'project',
  'detail',
  projectId,
]

export const useProjectDetailQuery = (
  projectId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ProjectDetailResponse, unknown, ProjectDetailResponse, ProjectDetailKey>,
    'queryFn' | 'queryKey'
  > & { orgId?: string },
) => {
  return useQuery({
    enabled: Boolean(projectId) && Boolean(options?.orgId),
    queryKey: buildProjectDetailKey(projectId ?? 'unknown'),
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      if (!options?.orgId) {
        throw new Error('Organization ID is required to fetch project details')
      }

      return fetchProject(projectId, { orgId: options.orgId, signal })
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

export type ProjectsByScopeKey = ['projects', 'by-scope', string, string | null]

export const buildProjectsByScopeKey = (
  orgId: string,
  divisionId: string | null,
): ProjectsByScopeKey => ['projects', 'by-scope', orgId, divisionId]

export const useProjectsByScopeQuery = (
  orgId: string | null | undefined,
  divisionId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ProjectSummary[], unknown, ProjectSummary[], ProjectsByScopeKey>,
    'queryFn' | 'queryKey'
  >,
) => {
  return useQuery({
    enabled: Boolean(orgId),
    queryKey: buildProjectsByScopeKey(orgId ?? 'unknown', divisionId ?? null),
    queryFn: async ({ signal }) => {
      if (!orgId) {
        throw new Error('Organization ID is required')
      }

      return fetchProjectsByScope(orgId, divisionId ?? null, { signal })
    },
    staleTime: 60_000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  })
}

export type ProjectWorkspaceSnapshotKey = ['project', 'workspace', string, string, string]

export const buildProjectWorkspaceSnapshotKey = (
  orgId: string,
  divisionId: string,
  projectId: string,
): ProjectWorkspaceSnapshotKey => ['project', 'workspace', orgId, divisionId, projectId]

export const useProjectWorkspaceSnapshotQuery = (
  projectId: string | null | undefined,
  options: {
    orgId: string | null | undefined
    divisionId: string | null | undefined
  } & Omit<
    UseQueryOptions<ProjectWorkspaceSnapshot, unknown, ProjectWorkspaceSnapshot, ProjectWorkspaceSnapshotKey>,
    'queryFn' | 'queryKey'
  >,
) => {
  const { orgId, divisionId, ...queryOptions } = options

  return useQuery({
    enabled: Boolean(projectId) && Boolean(orgId) && Boolean(divisionId),
    queryKey: buildProjectWorkspaceSnapshotKey(
      orgId ?? 'unknown',
      divisionId ?? 'unknown',
      projectId ?? 'unknown'
    ),
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      if (!orgId) {
        throw new Error('Organization ID is required to fetch workspace snapshot')
      }

      if (!divisionId) {
        throw new Error('Division ID is required to fetch workspace snapshot')
      }

      return fetchProjectWorkspaceSnapshot(projectId, { orgId, divisionId, signal })
    },
    staleTime: 60_000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...queryOptions,
  })
}
