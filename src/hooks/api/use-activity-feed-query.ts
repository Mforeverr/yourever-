'use client'

import { useInfiniteQuery, type UseInfiniteQueryOptions } from '@tanstack/react-query'
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
    UseInfiniteQueryOptions<ActivityFeedResponse, unknown, ActivityFeedResponse, ActivityFeedResponse, ActivityFeedKey>,
    'queryKey' | 'queryFn' | 'initialPageParam'
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

  return useInfiniteQuery({
    enabled: Boolean(orgId && divisionId),
    queryKey: buildActivityFeedKey(orgId ?? 'unknown', divisionId ?? 'unknown', includeTemplates),
    queryFn: ({ pageParam, signal }) =>
      fetchActivityFeed(
        orgId as string,
        divisionId as string,
        { includeTemplates, limit, cursor: pageParam as string | undefined },
        signal,
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    ...options,
  })
}
