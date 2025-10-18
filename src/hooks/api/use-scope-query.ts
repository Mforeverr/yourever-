'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { fetchScopeState, postScopeUpdate } from '@/lib/api/scope'
import type { ApiError } from '@/lib/api/http'
import type { ScopeState, ScopeUpdateRequest } from '@/modules/scope/types'

export type ScopeQueryKey = ['scope']

export const SCOPE_QUERY_KEY: ScopeQueryKey = ['scope']

export type ScopeQueryData = ScopeState

export const useScopeQuery = (
  options?: Omit<UseQueryOptions<ScopeQueryData, ApiError, ScopeQueryData, ScopeQueryKey>, 'queryKey' | 'queryFn'>
) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SCOPE_QUERY_KEY,
    queryFn: ({ signal }) => fetchScopeState(signal),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    ...options,
  })

  const setScopeCache = useCallback(
    (payload: ScopeState) => {
      queryClient.setQueryData(SCOPE_QUERY_KEY, payload)
    },
    [queryClient]
  )

  const mutateScope = useCallback(
    async (payload: ScopeUpdateRequest) => {
      const response = await postScopeUpdate(payload)
      setScopeCache(response)
      return response
    },
    [setScopeCache]
  )

  return {
    ...query,
    setScopeCache,
    mutateScope,
  }
}
