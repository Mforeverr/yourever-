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
      const { data, error } = await client.auth.getSession()
      if (error) {
        console.error('[auth:supabase] failed to resolve access token', error)
        return null
      }
      return data.session?.access_token ?? null
    }
  }
}
