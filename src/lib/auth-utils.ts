const USER_STORAGE_KEY = 'mock_auth_user_id'
const ORGANIZATION_STORAGE_KEY = 'mock_active_org_id'
const DIVISION_STORAGE_KEY = 'mock_active_division_id'
const LAST_ROUTE_STORAGE_KEY = 'mock_last_authed_route'
const ONBOARDING_STATUS_STORAGE_KEY = 'mock_onboarding_status'
const WORKSPACE_WELCOME_SEEN_KEY = 'mock_workspace_welcome_seen'

import {
  CURRENT_ONBOARDING_STATUS_VERSION,
  coerceOnboardingStatusVersion,
} from '@/lib/onboarding-version'

export interface StoredOnboardingStatus {
  version: number
  completed: boolean
  completedSteps: string[]
  skippedSteps: string[]
  data: Record<string, unknown>
  lastStep?: string
  revision?: string | null
  checksum?: string | null
}

const normalizeOnboardingStatus = (
  status: Partial<StoredOnboardingStatus> | null | undefined,
): StoredOnboardingStatus | null => {
  if (!status) return null

  const completedSteps = Array.isArray(status.completedSteps)
    ? status.completedSteps.map((value) => String(value))
    : []
  const skippedSteps = Array.isArray(status.skippedSteps)
    ? status.skippedSteps.map((value) => String(value))
    : []
  const revision = typeof status.revision === 'string' ? status.revision : undefined
  const checksum = typeof status.checksum === 'string' ? status.checksum : undefined

  return {
    version: coerceOnboardingStatusVersion(status.version),
    completed: Boolean(status.completed),
    completedSteps,
    skippedSteps,
    data: typeof status.data === 'object' && status.data !== null ? status.data : {},
    lastStep: typeof status.lastStep === 'string' ? status.lastStep : undefined,
    revision,
    checksum,
  }
}

const isBrowser = () => typeof window !== 'undefined'

const getStorage = (): Storage | undefined => {
  if (!isBrowser()) {
    return undefined
  }

  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

const readItem = (key: string): string | null => {
  const storage = getStorage()
  return storage ? storage.getItem(key) : null
}

const writeItem = (key: string, value: string) => {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(key, value)
}

const removeItem = (key: string) => {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(key)
}

const parseJson = <T>(value: string | null): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const stringify = (value: unknown): string => JSON.stringify(value)

const getOnboardingStatusMap = (): Record<string, StoredOnboardingStatus> =>
  parseJson<Record<string, StoredOnboardingStatus>>(readItem(ONBOARDING_STATUS_STORAGE_KEY)) ?? {}

const setOnboardingStatusMap = (map: Record<string, StoredOnboardingStatus>) => {
  writeItem(ONBOARDING_STATUS_STORAGE_KEY, stringify(map))
}

export const authStorage = {
  getUserId: (): string | null => readItem(USER_STORAGE_KEY),
  setUserId: (userId: string) => writeItem(USER_STORAGE_KEY, userId),
  clearUserId: () => removeItem(USER_STORAGE_KEY),

  getActiveOrganizationId: (): string | null => readItem(ORGANIZATION_STORAGE_KEY),
  setActiveOrganizationId: (orgId: string) => writeItem(ORGANIZATION_STORAGE_KEY, orgId),
  clearActiveOrganizationId: () => removeItem(ORGANIZATION_STORAGE_KEY),

  getActiveDivisionId: (): string | null => readItem(DIVISION_STORAGE_KEY),
  setActiveDivisionId: (divisionId: string) => writeItem(DIVISION_STORAGE_KEY, divisionId),
  clearActiveDivisionId: () => removeItem(DIVISION_STORAGE_KEY),

  getLastRoute: (): string | null => readItem(LAST_ROUTE_STORAGE_KEY),
  setLastRoute: (route: string) => writeItem(LAST_ROUTE_STORAGE_KEY, route),
  clearLastRoute: () => removeItem(LAST_ROUTE_STORAGE_KEY),

  getOnboardingStatus: (userId: string): StoredOnboardingStatus | null => {
    if (!userId) return null
    const map = getOnboardingStatusMap()
    return normalizeOnboardingStatus(map[userId])
  },
  setOnboardingStatus: (userId: string, status: StoredOnboardingStatus) => {
    if (!userId) return
    const map = getOnboardingStatusMap()
    map[userId] = {
      ...status,
      version: coerceOnboardingStatusVersion(status.version ?? CURRENT_ONBOARDING_STATUS_VERSION),
      revision: typeof status.revision === 'string' ? status.revision : null,
      checksum: typeof status.checksum === 'string' ? status.checksum : null,
    }
    setOnboardingStatusMap(map)
  },
  clearOnboardingStatus: (userId: string) => {
    if (!userId) return
    const map = getOnboardingStatusMap()
    if (map[userId]) {
      delete map[userId]
      setOnboardingStatusMap(map)
    }
  },

  hasSeenWorkspaceWelcome: (): boolean => readItem(WORKSPACE_WELCOME_SEEN_KEY) === 'true',
  setWorkspaceWelcomeSeen: () => writeItem(WORKSPACE_WELCOME_SEEN_KEY, 'true'),
  clearWorkspaceWelcomeSeen: () => removeItem(WORKSPACE_WELCOME_SEEN_KEY),

  clearAll: () => {
    const storage = getStorage()
    if (!storage) return
    storage.removeItem(USER_STORAGE_KEY)
    storage.removeItem(ORGANIZATION_STORAGE_KEY)
    storage.removeItem(DIVISION_STORAGE_KEY)
    storage.removeItem(LAST_ROUTE_STORAGE_KEY)
    storage.removeItem(ONBOARDING_STATUS_STORAGE_KEY)
    storage.removeItem(WORKSPACE_WELCOME_SEEN_KEY)
  }
}

export const isAuthenticated = () => !!authStorage.getUserId()

export const rememberRoute = (route: string) => {
  if (!route || route === '/') return
  authStorage.setLastRoute(route)
}
