'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import { fetchWorkspaceDashboardSummary } from '@/lib/api/workspace'
import type { DashboardSummary } from '@/modules/workspace/types'

export type WorkspaceDashboardKey = ['workspace', 'dashboard', string, string | null, boolean]

export const buildWorkspaceDashboardKey = (
  orgId: string,
  divisionId: string | null,
  includeTemplates: boolean,
): WorkspaceDashboardKey => ['workspace', 'dashboard', orgId, divisionId, includeTemplates]

export const useWorkspaceDashboardQuery = (
  orgId: string | null | undefined,
  divisionId: string | null | undefined,
  options?: { includeTemplates?: boolean } & Omit<
    UseQueryOptions<DashboardSummary, unknown, DashboardSummary, WorkspaceDashboardKey>,
    'queryFn' | 'queryKey'
  >,
) => {
  const includeTemplates = options?.includeTemplates ?? true

  return useQuery({
    enabled: Boolean(orgId) && (options?.enabled ?? true),
    queryKey: buildWorkspaceDashboardKey(orgId ?? 'unknown', divisionId ?? null, includeTemplates),
    queryFn: ({ signal }) =>
      fetchWorkspaceDashboardSummary(orgId as string, { divisionId: divisionId ?? null, includeTemplates }, signal),
    staleTime: 30_000,
    gcTime: 10 * 60 * 1000,
    ...options,
  })
}
