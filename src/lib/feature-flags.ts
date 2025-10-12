// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

const DEFAULT_FLAGS: Record<string, boolean> = {
  "projects.detail": process.env.NODE_ENV !== "production",
  "projects.detail.api": false,
}

const ENV_FLAG_MAP: Record<string, string> = {
  "projects.detail": "NEXT_PUBLIC_FEATURE_PROJECT_DETAIL",
  "projects.detail.api": "NEXT_PUBLIC_FEATURE_PROJECT_DETAIL_API",
}

const memoryOverrides = new Map<string, boolean>()

const readEnvFlag = (flag: string): boolean | undefined => {
  const envKey = ENV_FLAG_MAP[flag]
  if (!envKey) return undefined
  const raw = process.env[envKey as keyof NodeJS.ProcessEnv]
  if (typeof raw === "undefined") return undefined
  if (raw === "1" || raw?.toLowerCase() === "true" || raw === "on") return true
  if (raw === "0" || raw?.toLowerCase() === "false" || raw === "off") return false
  return undefined
}

const readStorageFlag = (flag: string): boolean | undefined => {
  if (typeof window === "undefined") return undefined
  try {
    const stored = window.localStorage.getItem(storageKey(flag))
    if (stored === null) return undefined
    if (stored === "1" || stored?.toLowerCase() === "true" || stored === "on") return true
    if (stored === "0" || stored?.toLowerCase() === "false" || stored === "off") return false
  } catch {
    return undefined
  }
  return undefined
}

const storageKey = (flag: string) => `yourever:feature:${flag}`

export const isFeatureEnabled = (flag: string, fallback = false): boolean => {
  if (memoryOverrides.has(flag)) {
    return memoryOverrides.get(flag) ?? fallback
  }

  const envValue = readEnvFlag(flag)
  if (typeof envValue === "boolean") {
    return envValue
  }

  const storageValue = readStorageFlag(flag)
  if (typeof storageValue === "boolean") {
    return storageValue
  }

  if (Object.prototype.hasOwnProperty.call(DEFAULT_FLAGS, flag)) {
    return DEFAULT_FLAGS[flag]
  }

  return fallback
}

export const setFeatureFlagOverride = (flag: string, value: boolean) => {
  memoryOverrides.set(flag, value)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(flag), value ? "true" : "false")
    } catch {
      // Ignore storage failures (e.g., private mode)
    }
  }
}

export const clearFeatureFlagOverride = (flag: string) => {
  memoryOverrides.delete(flag)
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(storageKey(flag))
    } catch {
      // Ignore storage failures
    }
  }
}

export const getFeatureFlagSnapshot = (): Record<string, boolean> => {
  const snapshot: Record<string, boolean> = {}
  const flags = new Set([...Object.keys(DEFAULT_FLAGS), ...Object.keys(ENV_FLAG_MAP), ...memoryOverrides.keys()])
  flags.forEach((flag) => {
    snapshot[flag] = isFeatureEnabled(flag)
  })
  return snapshot
}
