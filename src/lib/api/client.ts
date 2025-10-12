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
  if (!resolver) {
    return null
  }

  try {
    return await resolver()
  } catch (error) {
    console.error("[API] failed to resolve auth token", error)
    return null
  }
}
