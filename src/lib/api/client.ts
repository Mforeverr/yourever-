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

// Simple API client for project operations
export const createApiClient = () => ({
  get: async (url: string, options?: { signal?: AbortSignal }) => {
    // For now, mock the API client response
    // TODO: Replace with actual fetch implementation
    console.log(`API GET: ${url}`, options)

    // Mock project data for specific endpoints
    if (url.includes('/api/projects/company-allhands')) {
      const { createMockProjectResponse } = await import('./projects')
      return { data: createMockProjectResponse('company-allhands') }
    }

    return { data: null }
  },
  post: async (url: string, data?: any, options?: { signal?: AbortSignal }) => {
    console.log(`API POST: ${url}`, data, options)
    return { data: null }
  },
  put: async (url: string, data?: any, options?: { signal?: AbortSignal }) => {
    console.log(`API PUT: ${url}`, data, options)
    return { data: null }
  },
  delete: async (url: string, options?: { signal?: AbortSignal }) => {
    console.log(`API DELETE: ${url}`, options)
    return { data: null }
  },
  patch: async (url: string, data?: any, options?: { signal?: AbortSignal }) => {
    console.log(`API PATCH: ${url}`, data, options)
    return { data: null }
  }
})
