'use client'

import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { fetchDivisionChannels } from '@/lib/api/workspace'
import type { ChannelListResponse } from '@/modules/workspace/types'

export type DivisionChannelsKey = ['workspace', 'channels', string, string, boolean, number, number]

export const buildDivisionChannelsKey = (
  orgId: string,
  divisionId: string,
  includeTemplates: boolean,
  page: number,
  pageSize: number,
): DivisionChannelsKey => ['workspace', 'channels', orgId, divisionId, includeTemplates, page, pageSize]

interface UseDivisionChannelsOptions
  extends Omit<
    UseQueryOptions<ChannelListResponse, unknown, ChannelListResponse, DivisionChannelsKey>,
    'queryFn' | 'queryKey'
  > {
  includeTemplates?: boolean
  page?: number
  pageSize?: number
}

export const useDivisionChannelsQuery = (
  orgId: string | null | undefined,
  divisionId: string | null | undefined,
  options?: UseDivisionChannelsOptions,
) => {
  const includeTemplates = options?.includeTemplates ?? true
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? 50

  return useQuery({
    enabled: Boolean(orgId && divisionId),
    queryKey: buildDivisionChannelsKey(orgId ?? 'unknown', divisionId ?? 'unknown', includeTemplates, page, pageSize),
    queryFn: ({ signal }) =>
      fetchDivisionChannels(orgId as string, divisionId as string, { includeTemplates, page, pageSize }, signal),
    staleTime: 15_000,
    gcTime: 5 * 60 * 1000,
    ...options,
  })
}
