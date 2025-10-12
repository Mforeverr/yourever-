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
    },
  ),
)

export const selectStepData = <T extends OnboardingStepId>(stepId: T) => (state: OnboardingStoreState) => {
  const key = STEP_KEY_MAP[stepId]
  return state[key] as StepDataMap[T]
}
