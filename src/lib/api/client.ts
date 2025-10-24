// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

type AuthTokenResolver = () => Promise<string | null>

let resolver: AuthTokenResolver | null = null

export const setAuthTokenResolver = (nextResolver: AuthTokenResolver) => {
  resolver = nextResolver
}

export const clearAuthTokenResolver = () => {
  resolver = null
}

export const resolveAuthToken = async (): Promise<string | null> => {
  console.log("[API DEBUG] resolveAuthToken called")

  if (!resolver) {
    console.warn("[API DEBUG] No token resolver available")
    return null
  }

  try {
    console.log("[API DEBUG] Calling token resolver...")
    const token = await resolver()

    if (token) {
      console.log(`[API DEBUG] Token resolved successfully, length: ${token.length}`)
      console.log(`[API DEBUG] Token prefix: ${token.substring(0, 20)}...`)

      // Basic JWT validation
      const parts = token.split('.')
      if (parts.length !== 3) {
        console.error("[API DEBUG] Invalid JWT format - expected 3 parts, got:", parts.length)
      } else {
        console.log("[API DEBUG] JWT format appears valid (3 parts)")

        // Try to decode payload for debugging
        try {
          const payload = JSON.parse(atob(parts[1]))
          console.log("[API DEBUG] Token payload:", {
            sub: payload.sub,
            exp: payload.exp,
            iat: payload.iat,
            aud: payload.aud,
            email: payload.email
          })

          // Check expiration
          if (payload.exp) {
            const now = Math.floor(Date.now() / 1000)
            const timeUntilExpiry = payload.exp - now
            if (timeUntilExpiry <= 0) {
              console.error("[API DEBUG] TOKEN EXPIRED! Expiration time:", payload.exp, "Current time:", now)
            } else if (timeUntilExpiry < 300) { // 5 minutes
              console.warn(`[API DEBUG] Token expires soon in ${timeUntilExpiry} seconds`)
            } else {
              console.log(`[API DEBUG] Token valid for ${timeUntilExpiry} seconds`)
            }
          }
        } catch (decodeError) {
          console.warn("[API DEBUG] Could not decode JWT payload:", decodeError.message)
        }
      }
    } else {
      console.warn("[API DEBUG] Token resolver returned null")
    }

    return token
  } catch (error) {
    console.error("[API DEBUG] Failed to resolve auth token:", error)
    return null
  }
}
