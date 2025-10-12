import type { WorkspaceUser } from '@/modules/auth/types'
import { ApiError, type ApiErrorBody } from '@/lib/api/http'
import { notifyUnauthorized } from '@/lib/api/unauthorized-handler'
import { resolveApiUrl } from '@/lib/api/endpoints'

interface CurrentUserResponse {
  user: WorkspaceUser | null
}

const parseErrorBody = async (response: Response): Promise<ApiErrorBody | null> => {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

export const fetchCurrentUser = async (accessToken: string): Promise<WorkspaceUser | null> => {
  if (!accessToken) {
    throw new ApiError('Missing access token', 401)
  }

  const response = await fetch(resolveApiUrl('/api/users/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (response.status === 401) {
    const body = await parseErrorBody(response)
    notifyUnauthorized()
    throw new ApiError(body?.detail ?? 'Unauthorized', response.status, body)
  }

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const body = await parseErrorBody(response)
    throw new ApiError(
      body?.detail ?? `Request to /api/users/me failed with status ${response.status}`,
      response.status,
      body,
    )
  }

  const payload = (await response.json()) as CurrentUserResponse
  return payload.user ?? null
}
