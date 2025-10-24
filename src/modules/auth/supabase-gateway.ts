'use client'

import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase-client'

export interface SupabaseAuthGateway {
  getSession: () => Promise<Session | null>
  signInWithPassword: (email: string, password: string) => Promise<Session | null>
  signOut: () => Promise<void>
  onAuthStateChange: (handler: (session: Session | null) => void) => () => void
  getAccessToken: () => Promise<string | null>
}

export const createSupabaseAuthGateway = (): SupabaseAuthGateway | null => {
  const client = getSupabaseClient()

  if (!client) {
    return null
  }

  return {
    getSession: async () => {
      const { data, error } = await client.auth.getSession()
      if (error) {
        console.error('[auth:supabase] failed to load session', error)
        return null
      }
      return data.session ?? null
    },
    signInWithPassword: async (email: string, password: string) => {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('[auth:supabase] sign-in failed', error)
        return null
      }
      return data.session ?? null
    },
    signOut: async () => {
      const { error } = await client.auth.signOut()
      if (error) {
        console.error('[auth:supabase] sign-out failed', error)
      }
    },
    onAuthStateChange: (handler: (session: Session | null) => void) => {
      const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
        handler(session)
      })

      return () => subscription.subscription.unsubscribe()
    },
    getAccessToken: async () => {
      console.log('[AUTH DEBUG] getAccessToken called')

      try {
        const { data, error } = await client.auth.getSession()

        if (error) {
          console.error('[AUTH DEBUG] Failed to get session:', error)
          console.error('[AUTH DEBUG] Error details:', {
            message: error.message,
            status: error.status,
            name: error.name
          })
          return null
        }

        if (!data.session) {
          console.warn('[AUTH DEBUG] No session found')
          return null
        }

        const accessToken = data.session.access_token

        if (!accessToken) {
          console.warn('[AUTH DEBUG] Session exists but no access token')
          console.log('[AUTH DEBUG] Session data:', {
            hasUser: !!data.session.user,
            userId: data.session.user?.id,
            hasAccessToken: !!data.session.access_token,
            hasRefreshToken: !!data.session.refresh_token,
            expiresAt: data.session.expires_at
          })
          return null
        }

        console.log(`[AUTH DEBUG] Access token resolved successfully, length: ${accessToken.length}`)

        // Check if token is expired
        if (data.session.expires_at) {
          const now = Math.floor(Date.now() / 1000)
          const timeUntilExpiry = data.session.expires_at - now
          if (timeUntilExpiry <= 0) {
            console.error(`[AUTH DEBUG] TOKEN EXPIRED! Expired at: ${data.session.expires_at}, Current: ${now}`)
          } else if (timeUntilExpiry < 300) {
            console.warn(`[AUTH DEBUG] Token expires soon in ${timeUntilExpiry} seconds`)
          } else {
            console.log(`[AUTH DEBUG] Token valid for ${timeUntilExpiry} seconds`)
          }
        }

        return accessToken

      } catch (unexpectedError) {
        console.error('[AUTH DEBUG] Unexpected error in getAccessToken:', unexpectedError)
        return null
      }
    }
  }
}
