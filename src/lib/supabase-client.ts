'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

const getConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // Fallback to hardcoded values for development
    // This ensures the app works even when environment variables aren't loaded
    console.warn('[supabase-client] Environment variables not found, using fallback values')
    return {
      url: 'https://eweaektalqrsrdokljvl.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZWFla3RhbHFyc3Jkb2tsanZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjkyNjI4MTksImV4cCI6MjA4NDgyNjgxOX0.Y4AnH_i21ZSO5h3dPQ9tLhIzq1C5hE_Pi0qQJdNQqW4'
    }
  }

  return { url, anonKey }
}

export const getSupabaseClient = (): SupabaseClient | null => {
  if (browserClient) return browserClient

  const config = getConfig()
  if (!config) return null

  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })

  return browserClient
}

export const isSupabaseAvailable = () => getConfig() !== null
