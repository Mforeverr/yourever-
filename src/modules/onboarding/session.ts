'use client'

import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import type { OnboardingSession } from './transform'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

const resolveEndpoint = (path: string) => {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`
}

const request = async <T>(
  method: 'GET' | 'PATCH',
  token: string,
  body?: unknown,
  path: string,
): Promise<T | null> => {
  try {
    const response = await fetch(resolveEndpoint(path), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      console.error('[onboarding] request failed', response.status, await response.text())
      return null
    }

    return (await response.json()) as T
  } catch (error) {
    console.error('[onboarding] network request failed', error)
    return null
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
