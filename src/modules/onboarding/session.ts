'use client'

import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { ApiError, type ApiErrorBody } from '@/lib/api/http'
import { notifyUnauthorized } from '@/lib/api/unauthorized-handler'
import { resolveApiUrl } from '@/lib/api/endpoints'
import type { OnboardingSession } from './transform'

export interface OnboardingCompletionPayload {
  status: StoredOnboardingStatus
  answers: Record<string, unknown>
}

const parseErrorBody = async (response: Response): Promise<ApiErrorBody | null> => {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

const request = async <T>(
  method: 'GET' | 'PATCH' | 'POST',
  token: string,
  body: unknown,
  path: string,
): Promise<T> => {
  try {
    const response = await fetch(resolveApiUrl(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await parseErrorBody(response)
      if (response.status === 401) {
        notifyUnauthorized()
      }
      throw new ApiError(
        errorBody?.detail ?? `Request to ${path} failed with status ${response.status}`,
        response.status,
        errorBody ?? undefined,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      { detail: error instanceof Error ? error.message : 'Unknown error' },
    )
  }
}

export const fetchOrCreateOnboardingSession = async (
  accessToken: string | null,
): Promise<OnboardingSession | null> => {
  if (!accessToken) return null
  const payload = await request<{ session: OnboardingSession | null }>(
    'GET',
    accessToken,
    undefined,
    '/api/users/me/onboarding-progress',
  )
  return payload?.session ?? null
}

export const persistOnboardingStatus = async (
  accessToken: string | null,
  status: StoredOnboardingStatus,
): Promise<OnboardingSession | null> => {
  if (!accessToken) return null
  const payload = await request<{ session: OnboardingSession | null }>(
    'PATCH',
    accessToken,
    { status },
    '/api/users/me/onboarding-progress',
  )
  return payload?.session ?? null
}

export const submitOnboardingCompletion = async (
  accessToken: string | null,
  payload: OnboardingCompletionPayload,
): Promise<OnboardingSession | null> => {
  if (!accessToken) return null
  const response = await request<{ session: OnboardingSession | null }>(
    'POST',
    accessToken,
    payload,
    '/api/onboarding/complete',
  )
  return response?.session ?? null
}
