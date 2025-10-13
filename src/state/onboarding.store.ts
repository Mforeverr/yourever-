'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageService } from '@/lib/storage'
import type {
  OnboardingStepId,
  StepDataMap,
} from '@/lib/onboarding'
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { CURRENT_ONBOARDING_STATUS_VERSION } from '@/lib/onboarding-version'

const STEP_IDS: OnboardingStepId[] = [
  'profile',
  'work-profile',
  'tools',
  'invite',
  'preferences',
]

const LEGACY_KEYS: Record<OnboardingStepId, string[]> = {
  profile: ['profile'],
  'work-profile': ['work-profile', 'workProfile'],
  tools: ['tools'],
  invite: ['invite'],
  preferences: ['preferences'],
}

const createDefaults = (): StepDataMap => ({
  profile: {
    firstName: '',
    lastName: '',
    role: '',
    avatarUrl: '',
  },
  'work-profile': {
    teamName: '',
    jobTitle: '',
    timezone: '',
    teamSize: '',
    functions: [],
    intents: [],
    experience: '',
    role: '',
  },
  tools: {
    tools: [],
    customTool: '',
    integrations: [],
  },
  invite: {
    emails: [],
    message: '',
    defaultRole: 'member',
    statuses: [],
  },
  preferences: {
    weeklySummary: true,
    enableNotifications: true,
    defaultTheme: 'dark',
  },
})

type OnboardingStoreState = {
  steps: StepDataMap
  version: number
  featureFlags: Record<string, boolean>
  setStepData: <T extends keyof StepDataMap>(stepId: T, data: StepDataMap[T]) => void
  updateStepData: <T extends keyof StepDataMap>(stepId: T, updater: (prev: StepDataMap[T]) => StepDataMap[T]) => void
  hydrateFromStatus: (status: StoredOnboardingStatus | null) => void
  reset: () => void
  setFeatureFlags: (flags: Record<string, boolean>) => void
  isFeatureEnabled: (flag: string) => boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidStepId = (stepId: OnboardingStepId): stepId is keyof StepDataMap =>
  typeof stepId === 'string' && STEP_IDS.includes(stepId as keyof StepDataMap)

const sanitizeFeatureFlagMap = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) {
    return {}
  }

  const result: Record<string, boolean> = {}
  Object.entries(value).forEach(([flag, enabled]) => {
    if (typeof enabled === 'boolean') {
      result[flag] = enabled
    }
  })

  return result
}

interface FeatureContract<T extends keyof StepDataMap> {
  flag: string
  stepId: T
  disable: (data: StepDataMap[T], defaults: StepDataMap[T]) => StepDataMap[T]
}

const FEATURE_CONTRACTS: ReadonlyArray<FeatureContract<keyof StepDataMap>> = [
]

const sanitizeStepForFlags = <T extends keyof StepDataMap>(
  stepId: T,
  data: StepDataMap[T],
  flags: Record<string, boolean>,
  defaults: StepDataMap,
): StepDataMap[T] => {
  let next = data

  for (const contract of FEATURE_CONTRACTS) {
    if (contract.stepId !== stepId) continue
    if (flags[contract.flag]) continue

    next = contract.disable({ ...next }, defaults[stepId]) as StepDataMap[T]
  }

  return next
}

const cloneWithDefaults = <T extends keyof StepDataMap>(
  defaults: StepDataMap[T],
  candidate: Record<string, unknown>,
): StepDataMap[T] => {
  const copy: Record<string, unknown> = {}

  Object.entries(defaults).forEach(([field, defaultValue]) => {
    copy[field] = Array.isArray(defaultValue) ? [...defaultValue] : defaultValue
  })

  Object.entries(candidate).forEach(([field, fieldValue]) => {
    if (!(field in defaults) || fieldValue === undefined) {
      return
    }

    copy[field] = Array.isArray(fieldValue) ? [...fieldValue] : fieldValue
  })

  return copy as unknown as StepDataMap[T]
}

const createVersionedDefaults = () => ({
  steps: createDefaults(),
  version: CURRENT_ONBOARDING_STATUS_VERSION,
  featureFlags: {} as Record<string, boolean>,
})

const sanitizePersistedVersion = (version: unknown): number => {
  if (typeof version === 'number' && Number.isFinite(version)) {
    return version
  }

  return 0
}

const findLegacyStepInData = (data: unknown, stepId: OnboardingStepId) => {
  if (!isRecord(data)) return undefined
  for (const key of LEGACY_KEYS[stepId]) {
    const value = data[key]
    if (isRecord(value)) {
      return value
    }
  }
  return undefined
}

const readStatusStep = <T extends keyof StepDataMap>(
  status: StoredOnboardingStatus | null,
  stepId: T,
  defaults: StepDataMap,
): StepDataMap[T] => {
  const candidate = findLegacyStepInData(status?.data ?? null, stepId)
  if (!candidate) {
    return defaults[stepId]
  }
  return cloneWithDefaults(defaults[stepId], candidate)
}

const findLegacyStep = (persisted: Record<string, unknown>, stepId: OnboardingStepId) => {
  for (const key of LEGACY_KEYS[stepId]) {
    const value = persisted[key]
    if (isRecord(value)) {
      return value
    }
  }
  return undefined
}

const rebuildFromPersistedState = (
  persistedState: unknown,
): Pick<OnboardingStoreState, 'steps' | 'version' | 'featureFlags'> => {
  const defaults = createDefaults()
  const base = createVersionedDefaults()

  if (!isRecord(persistedState)) {
    return base
  }

  const featureFlags = sanitizeFeatureFlagMap((persistedState as { featureFlags?: unknown }).featureFlags)
  const steps: StepDataMap = createDefaults()

  STEP_IDS.forEach((stepId) => {
    if (!isValidStepId(stepId)) return

    const candidate = findLegacyStep(persistedState, stepId)
    if (candidate) {
      const merged = cloneWithDefaults(defaults[stepId], candidate)
      ;(steps as any)[stepId] = sanitizeStepForFlags(stepId, merged, featureFlags, defaults)
    } else {
      ;(steps as any)[stepId] = sanitizeStepForFlags(stepId, defaults[stepId], featureFlags, defaults)
    }
  })

  return {
    steps,
    version: CURRENT_ONBOARDING_STATUS_VERSION,
    featureFlags,
  }
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      steps: createDefaults(),
      version: CURRENT_ONBOARDING_STATUS_VERSION,
      featureFlags: {},
      setStepData: <T extends keyof StepDataMap>(stepId: T, data: StepDataMap[T]) => {
        set((state) => {
          const defaults = createDefaults()
          const sanitized = sanitizeStepForFlags(stepId, data, state.featureFlags, defaults)
          return {
            steps: {
              ...state.steps,
              [stepId]: sanitized,
            },
          }
        })
      },
      updateStepData: <T extends keyof StepDataMap>(stepId: T, updater: (prev: StepDataMap[T]) => StepDataMap[T]) => {
        set((state) => {
          const current = state.steps[stepId]
          const defaults = createDefaults()
          const updated = updater(current)
          const sanitized = sanitizeStepForFlags(stepId, updated, state.featureFlags, defaults)
          return {
            steps: {
              ...state.steps,
              [stepId]: sanitized,
            },
          }
        })
      },
      hydrateFromStatus: (status) => {
        set((state) => {
          if (!status?.data) {
            return state
          }

          const defaults = createDefaults()
          const nextSteps: StepDataMap = { ...state.steps }

          STEP_IDS.forEach((stepId) => {
            if (!isValidStepId(stepId)) return

            const stepData = readStatusStep(status, stepId, defaults)
            ;(nextSteps as any)[stepId] = sanitizeStepForFlags(stepId, stepData, state.featureFlags, defaults)
          })

          return {
            ...state,
            steps: nextSteps,
            version: CURRENT_ONBOARDING_STATUS_VERSION,
          }
        })
      },
      reset: () => {
        set((state) => {
          const defaults = createDefaults()
          const steps: StepDataMap = createDefaults()

          STEP_IDS.forEach((stepId) => {
            if (!isValidStepId(stepId)) return

            ;(steps as any)[stepId] = sanitizeStepForFlags(stepId, defaults[stepId], state.featureFlags, defaults)
          })

          return {
            steps,
            version: CURRENT_ONBOARDING_STATUS_VERSION,
            featureFlags: state.featureFlags,
          }
        })
      },
      setFeatureFlags: (flags) => {
        const normalized = sanitizeFeatureFlagMap(flags)
        set((state) => {
          const defaults = createDefaults()
          const steps: StepDataMap = { ...state.steps }

          STEP_IDS.forEach((stepId) => {
            if (!isValidStepId(stepId)) return

            ;(steps as any)[stepId] = sanitizeStepForFlags(stepId, steps[stepId], normalized, defaults)
          })

          return {
            featureFlags: normalized,
            steps,
          }
        })
      },
      isFeatureEnabled: (flag) => get().featureFlags[flag] ?? false,
    }),
    {
      name: 'onboarding-store',
      storage: createJSONStorage(() => localStorageService.toStorageAdapter()),
      version: CURRENT_ONBOARDING_STATUS_VERSION,
      migrate: (persistedState, persistedVersion) => {
        const version = sanitizePersistedVersion(persistedVersion)

        if (version <= 0 || version > CURRENT_ONBOARDING_STATUS_VERSION) {
          return createVersionedDefaults()
        }

        if (!persistedState) {
          return createVersionedDefaults()
        }

        return rebuildFromPersistedState(persistedState)
      },
    },
  ),
)

export const selectStepData = <T extends keyof StepDataMap>(stepId: T) => (state: OnboardingStoreState) =>
  state.steps[stepId]

export const readOnboardingSnapshot = () => {
  const { steps } = useOnboardingStore.getState()
  return {
    profile: { ...steps.profile },
    'work-profile': { ...steps['work-profile'] },
    tools: {
      ...steps.tools,
      tools: [...steps.tools.tools],
      integrations: steps.tools.integrations ? [...steps.tools.integrations] : [],
    },
    invite: {
      ...steps.invite,
      emails: [...steps.invite.emails],
      statuses: steps.invite.statuses ? [...steps.invite.statuses] : [],
    },
    preferences: { ...steps.preferences },
  } satisfies StepDataMap
}

export type OnboardingSnapshot = StepDataMap
