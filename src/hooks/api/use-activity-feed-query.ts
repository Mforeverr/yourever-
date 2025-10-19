'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchActivityFeed } from '@/lib/api/workspace'
import type { ActivityFeedResponse } from '@/modules/workspace/types'

export type ActivityFeedKey = ['workspace', 'activities', string, string, boolean]

export const buildActivityFeedKey = (
  orgId: string,
  divisionId: string,
  includeTemplates: boolean,
): ActivityFeedKey => ['workspace', 'activities', orgId, divisionId, includeTemplates]

interface UseActivityFeedOptions
  extends Omit<
    UseQueryOptions<ActivityFeedResponse, unknown, ActivityFeedResponse, ActivityFeedKey>,
    'queryKey' | 'queryFn'
  > {
  includeTemplates?: boolean
  limit?: number
}

export const useActivityFeedQuery = (
  orgId: string | null | undefined,
  divisionId: string | null | undefined,
  options?: UseActivityFeedOptions,
) => {
  const includeTemplates = options?.includeTemplates ?? true
  const limit = options?.limit ?? 20

  return useQuery({
    enabled: Boolean(orgId && divisionId),
    queryKey: buildActivityFeedKey(orgId ?? 'unknown', divisionId ?? 'unknown', includeTemplates),
    queryFn: ({ signal }) =>
      fetchActivityFeed(
        orgId as string,
        divisionId as string,
        { includeTemplates, limit, cursor: undefined },
        signal,
      ),
    ...options,
  })
}
