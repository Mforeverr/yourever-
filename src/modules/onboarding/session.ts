'use client'

import type { Session } from '@supabase/supabase-js'
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
  session: Session | null,
): Promise<OnboardingSession | null> => {
  if (!session) return null
  const payload = await request<{ session: OnboardingSession | null }>(
    'GET',
    session.access_token,
    undefined,
    '/api/users/me/onboarding-progress',
  )
  return payload?.session ?? null
}

export const persistOnboardingStatus = async (
  session: Session | null,
  status: StoredOnboardingStatus,
): Promise<OnboardingSession | null> => {
  if (!session) return null
  const payload = await request<{ session: OnboardingSession | null }>(
    'PATCH',
    session.access_token,
    { status },
    '/api/users/me/onboarding-progress',
  )
  return payload?.session ?? null
}
