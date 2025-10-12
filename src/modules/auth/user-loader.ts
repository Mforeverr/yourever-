'use client'

import type { Session } from '@supabase/supabase-js'
import type { WorkspaceUser } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

const resolveEndpoint = (path: string) => {
  if (!API_BASE_URL) {
    return path
  }
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`
}

export const loadWorkspaceUser = async (session: Session): Promise<WorkspaceUser | null> => {
  try {
    const response = await fetch(resolveEndpoint('/api/users/me'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[auth] failed to load workspace user', await response.text())
      return null
    }

    const payload = (await response.json()) as { user: WorkspaceUser | null }
    return payload.user ?? null
  } catch (error) {
    console.error('[auth] workspace user request failed', error)
    return null
  }
}
