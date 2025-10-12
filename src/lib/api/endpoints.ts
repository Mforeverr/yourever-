const DEFAULT_DEV_BASE_URL = 'http://localhost:8000'

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '')

export const getApiBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (configured) {
    return normalizeBaseUrl(configured)
  }

  if (process.env.NODE_ENV !== 'production') {
    return DEFAULT_DEV_BASE_URL
  }

  return ''
}

export const isApiBaseUrlConfigured = (): boolean => Boolean(process.env.NEXT_PUBLIC_API_BASE_URL?.trim())

export const resolveApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = getApiBaseUrl()

  if (!baseUrl) {
    return normalizedPath
  }

  return `${baseUrl}${normalizedPath}`
}
