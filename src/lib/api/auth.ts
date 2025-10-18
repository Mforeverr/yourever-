import type { AuthSessionSnapshot } from '@/modules/auth/types'
import { ApiError, type ApiErrorBody } from '@/lib/api/http'
import { notifyUnauthorized } from '@/lib/api/unauthorized-handler'
import { resolveApiUrl } from '@/lib/api/endpoints'

const parseErrorBody = async (response: Response): Promise<ApiErrorBody | null> => {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

const buildAuthHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
})

export const fetchAuthSession = async (accessToken: string): Promise<AuthSessionSnapshot> => {
  if (!accessToken) {
    throw new ApiError('Missing access token', 401)
  }

  const response = await fetch(resolveApiUrl('/api/auth/session'), {
    method: 'GET',
    headers: buildAuthHeaders(accessToken),
  })

  if (response.status === 401) {
    const body = await parseErrorBody(response)
    notifyUnauthorized()
    throw new ApiError(body?.detail ?? 'Unauthorized', response.status, body)
  }

  if (!response.ok) {
    const body = await parseErrorBody(response)
    throw new ApiError(
      body?.detail ?? `Request to /api/auth/session failed with status ${response.status}`,
      response.status,
      body,
    )
  }

  const payload = (await response.json()) as AuthSessionSnapshot
  return payload
}

export const postAuthLogout = async (accessToken: string): Promise<void> => {
  if (!accessToken) {
    return
  }

  const response = await fetch(resolveApiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
  })

  if (response.status === 401) {
    notifyUnauthorized()
    return
  }

  if (!response.ok && response.status !== 404) {
    const body = await parseErrorBody(response)
    throw new ApiError(
      body?.detail ?? `Request to /api/auth/logout failed with status ${response.status}`,
      response.status,
      body,
    )
  }
}

export const postAuthRefresh = async (accessToken: string): Promise<AuthSessionSnapshot | null> => {
  if (!accessToken) {
    throw new ApiError('Missing access token', 401)
  }

  const response = await fetch(resolveApiUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
  })

  if (response.status === 401) {
    const body = await parseErrorBody(response)
    notifyUnauthorized()
    throw new ApiError(body?.detail ?? 'Unauthorized', response.status, body)
  }

  if (response.status === 202) {
    return null
  }

  if (!response.ok) {
    const body = await parseErrorBody(response)
    throw new ApiError(
      body?.detail ?? `Request to /api/auth/refresh failed with status ${response.status}`,
      response.status,
      body,
    )
  }

  return (await response.json()) as AuthSessionSnapshot
}

