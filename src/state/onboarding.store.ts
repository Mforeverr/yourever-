'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { localStorageService } from '@/lib/storage'
import type {
  InviteStepData,
  OnboardingStepId,
  ProfileStepData,
  StepDataMap,
  ToolsStepData,
  WorkProfileStepData,
  PreferencesStepData,
  WorkspaceHubStepData,
} from '@/lib/onboarding'
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { CURRENT_ONBOARDING_STATUS_VERSION } from '@/lib/onboarding-version'

type StepKey = 'profile' | 'workProfile' | 'tools' | 'invite' | 'preferences' | 'workspaceHub'

type OnboardingStoreState = {
  profile: ProfileStepData
  workProfile: WorkProfileStepData
  tools: ToolsStepData
  invite: InviteStepData
  preferences: PreferencesStepData
  workspaceHub: WorkspaceHubStepData
  version: number
  setStepData: <T extends OnboardingStepId>(stepId: T, data: StepDataMap[T]) => void
  updateStepData: <T extends OnboardingStepId>(stepId: T, updater: (prev: StepDataMap[T]) => StepDataMap[T]) => void
  hydrateFromStatus: (status: StoredOnboardingStatus | null) => void
  reset: () => void
}

const STEP_KEY_MAP: Record<OnboardingStepId, StepKey> = {
  profile: 'profile',
  'work-profile': 'workProfile',
  tools: 'tools',
  invite: 'invite',
  preferences: 'preferences',
  'workspace-hub': 'workspaceHub',
}

const defaultProfile: ProfileStepData = {
  firstName: '',
  lastName: '',
  role: '',
  avatarUrl: '',
}

const defaultWorkProfile: WorkProfileStepData = {
  teamName: '',
  jobTitle: '',
  timezone: '',
  teamSize: '',
  functions: [],
  intents: [],
  experience: '',
  role: '',
}

const defaultTools: ToolsStepData = {
  tools: [],
  customTool: '',
  integrations: [],
}

const defaultInvite: InviteStepData = {
  emails: [],
  message: '',
  defaultRole: 'member',
  statuses: [],
}

const defaultPreferences: PreferencesStepData = {
  weeklySummary: true,
  enableNotifications: true,
  defaultTheme: 'dark',
}

const defaultWorkspaceHub: WorkspaceHubStepData = {
  choice: 'join-existing',
}

const createDefaults = () => ({
  profile: { ...defaultProfile },
  workProfile: { ...defaultWorkProfile },
  tools: { ...defaultTools },
  invite: { ...defaultInvite },
  preferences: { ...defaultPreferences },
  workspaceHub: { ...defaultWorkspaceHub },
})

type StepDefaults = ReturnType<typeof createDefaults>

const STEP_IDS = Object.keys(STEP_KEY_MAP) as OnboardingStepId[]

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const cloneWithDefaults = <T extends StepKey>(defaults: StepDefaults[T], candidate: Record<string, unknown>) => {
  const next: Record<string, unknown> = {}

  Object.entries(defaults).forEach(([field, defaultValue]) => {
    next[field] = Array.isArray(defaultValue) ? [...defaultValue] : defaultValue
  })

  Object.entries(candidate).forEach(([field, fieldValue]) => {
    if (!(field in defaults) || fieldValue === undefined) {
      return
    }

    next[field] = Array.isArray(fieldValue) ? [...fieldValue] : fieldValue
  })

  return next as StepDefaults[T]
}

const createVersionedDefaults = (): OnboardingStoreState => ({
  ...createDefaults(),
  version: CURRENT_ONBOARDING_STATUS_VERSION,
})

const rebuildFromPersistedState = (persistedState: unknown): OnboardingStoreState => {
  if (!isRecord(persistedState)) {
    return createVersionedDefaults()
  }

  const defaults = createDefaults()
  const next: Record<StepKey, StepDataMap[OnboardingStepId]> = {
    profile: { ...defaults.profile },
    workProfile: { ...defaults.workProfile },
    tools: { ...defaults.tools },
    invite: { ...defaults.invite },
    preferences: { ...defaults.preferences },
    workspaceHub: { ...defaults.workspaceHub },
  }

  STEP_IDS.forEach((stepId) => {
    const key = STEP_KEY_MAP[stepId]
    const candidate = (persistedState[key] ?? persistedState[stepId]) as Record<string, unknown> | undefined

    if (candidate && isRecord(candidate)) {
      next[key] = cloneWithDefaults(defaults[key], candidate)
    }
  })

  return {
    ...next,
    version: CURRENT_ONBOARDING_STATUS_VERSION,
  }
}

const sanitizePersistedVersion = (version: unknown): number => {
  if (typeof version === 'number' && Number.isFinite(version)) {
    return version
  }

  return 0
}

const readStatusStep = <T extends OnboardingStepId>(
  status: StoredOnboardingStatus | null,
  stepId: T,
): StepDataMap[T] => {
  const defaults = createDefaults()
  const camelKey = STEP_KEY_MAP[stepId]
  const payload = status?.data?.[stepId] ?? status?.data?.[camelKey]
  return payload ? { ...defaults[camelKey], ...(payload as StepDataMap[T]) } : (defaults[camelKey] as StepDataMap[T])
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      ...createDefaults(),
      version: CURRENT_ONBOARDING_STATUS_VERSION,
      setStepData: (stepId, data) => {
        const key = STEP_KEY_MAP[stepId]
        set({ [key]: data } as Partial<OnboardingStoreState>)
      },
      updateStepData: (stepId, updater) => {
        const key = STEP_KEY_MAP[stepId]
        set((state) => {
          const current = state[key] as StepDataMap[typeof stepId]
          return {
            [key]: updater(current),
          } as Partial<OnboardingStoreState>
        })
      },
      hydrateFromStatus: (status) => {
        set((state) => {
          if (!status?.data) {
            return state
          }

          const next = createDefaults()
          ;(Object.keys(STEP_KEY_MAP) as OnboardingStepId[]).forEach((stepId) => {
            const key = STEP_KEY_MAP[stepId]
            next[key] = readStatusStep(status, stepId)
          })

          return {
            ...state,
            ...next,
            version: CURRENT_ONBOARDING_STATUS_VERSION,
          }
        })
      },
      reset: () => {
        set({
          ...createDefaults(),
          version: CURRENT_ONBOARDING_STATUS_VERSION,
        })
      },
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

export const selectStepData = <T extends OnboardingStepId>(stepId: T) => (state: OnboardingStoreState) => {
  const key = STEP_KEY_MAP[stepId]
  return state[key] as StepDataMap[T]
}

export const readOnboardingSnapshot = () => {
  const state = useOnboardingStore.getState()
  return {
    profile: { ...state.profile },
    workProfile: { ...state.workProfile },
    tools: { ...state.tools },
    invite: { ...state.invite },
    preferences: { ...state.preferences },
    workspaceHub: { ...state.workspaceHub },
  }
}

export type OnboardingSnapshot = ReturnType<typeof readOnboardingSnapshot>
