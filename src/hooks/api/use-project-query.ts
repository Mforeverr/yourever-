'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchProject, createMockProjectResponse } from '@/lib/api/projects'
import { isFeatureEnabled } from '@/lib/feature-flags'
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
  const liveDataEnabled = isFeatureEnabled('workspace.liveData', process.env.NODE_ENV !== 'production')

  return useQuery({
    enabled: Boolean(projectId),
    queryKey: buildProjectDetailKey(projectId ?? 'unknown'),
    queryFn: async ({ signal }) => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }

      if (liveDataEnabled) {
        try {
          return await fetchProject(projectId, { signal })
        } catch (error) {
          // Fall back to mock data if API fails
          console.warn('Failed to fetch project data, falling back to mock data:', error)
          return createMockProjectResponse(projectId)
        }
      } else {
        // Use mock data when live data is disabled
        return createMockProjectResponse(projectId)
      }
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: liveDataEnabled ? 1 : false, // Retry once if live data is enabled
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
  const liveDataEnabled = isFeatureEnabled('workspace.liveData', process.env.NODE_ENV !== 'production')

  return useQuery({
    enabled: Boolean(orgId),
    queryKey: buildProjectsByScopeKey(orgId ?? 'unknown', divisionId ?? null),
    queryFn: async ({ signal }) => {
      if (!orgId) {
        throw new Error('Organization ID is required')
      }

      if (liveDataEnabled) {
        try {
          const { fetchProjectsByScope } = await import('@/lib/api/projects')
          return await fetchProjectsByScope(orgId, divisionId ?? null, { signal })
        } catch (error) {
          console.warn('Failed to fetch projects by scope from API, falling back to mock data:', error)
          // Import and use mock fallback
          const { createMockProjectsList } = await import('@/lib/api/projects')
          return createMockProjectsList(orgId, divisionId ?? null)
        }
      } else {
        // Use mock data when live data is disabled
        const { createMockProjectsList } = await import('@/lib/api/projects')
        return createMockProjectsList(orgId, divisionId ?? null)
      }
    },
    staleTime: 60_000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: liveDataEnabled ? 1 : false,
    ...options,
  })
}