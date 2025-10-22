import { createSupabaseAuthGateway } from '@/modules/auth/supabase-gateway'

export const auth = {
  api: {
    getSession: async (options?: { headers?: Headers }) => {
      try {
        // First try to get session from cookie-based auth (server-side)
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/session`, {
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            return data.session
          }
        }

        // Fallback to client-side Supabase auth (for middleware)
        const gateway = createSupabaseAuthGateway()
        if (!gateway) {
          return null
        }

        return await gateway.getSession()
      } catch (error) {
        console.error('Failed to get session:', error)
        return null
      }
    },
  },
}