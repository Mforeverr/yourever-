'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchProject, fetchProjectsByScope } from '@/lib/api/projects'
import type { ProjectDetailResponse, ProjectSummary } from '@/modules/projects/contracts'

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
  >,
) => {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: buildProjectDetailKey(projectId ?? 'unknown'),
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      return fetchProject(projectId, { signal })
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
