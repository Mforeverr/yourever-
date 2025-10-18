import type { AuthSessionSnapshot, WorkspaceUser } from '@/modules/auth/types'
import { fetchAuthSession } from '@/lib/api/auth'

export const fetchCurrentUser = async (accessToken: string): Promise<WorkspaceUser | null> => {
  const snapshot = await fetchAuthSession(accessToken)
  return snapshot.user ?? null
}

export const fetchCurrentUserSession = async (accessToken: string): Promise<AuthSessionSnapshot> => {
  return fetchAuthSession(accessToken)
}
