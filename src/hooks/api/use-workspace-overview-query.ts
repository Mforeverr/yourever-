'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchWorkspaceOverview } from '@/lib/api/workspace'
import type { WorkspaceOverview } from '@/modules/workspace/types'

export type WorkspaceOverviewKey = ['workspace', 'overview', string, string | null, boolean]

export const buildWorkspaceOverviewKey = (
  orgId: string,
  divisionId: string | null,
  includeTemplates: boolean,
): WorkspaceOverviewKey => ['workspace', 'overview', orgId, divisionId, includeTemplates]

export const useWorkspaceOverviewQuery = (
  orgId: string | null | undefined,
  divisionId: string | null | undefined,
  options?: { includeTemplates?: boolean } & Omit<
    UseQueryOptions<WorkspaceOverview, unknown, WorkspaceOverview, WorkspaceOverviewKey>,
    'queryFn' | 'queryKey'
  >,
) => {
  const includeTemplates = options?.includeTemplates ?? true

  return useQuery({
    enabled: Boolean(orgId),
    queryKey: buildWorkspaceOverviewKey(orgId ?? 'unknown', divisionId ?? null, includeTemplates),
    queryFn: ({ signal }) =>
      fetchWorkspaceOverview(orgId as string, { divisionId: divisionId ?? null, includeTemplates }, signal),
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}
