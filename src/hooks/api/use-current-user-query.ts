'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { resolveAuthToken } from '@/lib/api/client'
import { fetchCurrentUser } from '@/lib/api/users'
import { ApiError } from '@/lib/api/http'
import type { WorkspaceUser } from '@/modules/auth/types'

export type CurrentUserQueryKey = ['user']

export const CURRENT_USER_QUERY_KEY: CurrentUserQueryKey = ['user']

export type CurrentUserQueryData = WorkspaceUser | null

export const useCurrentUserQuery = (
  options?: Omit<
    UseQueryOptions<CurrentUserQueryData, ApiError, CurrentUserQueryData, CurrentUserQueryKey>,
    'queryKey' | 'queryFn'
  >,
) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      const token = await resolveAuthToken()
      if (!token) {
        throw new ApiError('Unauthorized', 401)
      }
      return fetchCurrentUser(token)
    },
    ...options,
  })

  const refetchUser = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
  }, [queryClient])

  return {
    ...query,
    refetchUser,
  }
}
