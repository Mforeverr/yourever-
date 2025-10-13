import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import {
  CURRENT_ONBOARDING_STATUS_VERSION,
  coerceOnboardingStatusVersion,
} from '@/lib/onboarding-version'

export type KnownOnboardingStepId =
  | 'profile'
  | 'work-profile'
  | 'tools'
  | 'invite'
  | 'preferences'
  | 'workspace-hub'

export type OnboardingStepId = KnownOnboardingStepId | (string & {})

export interface BaseOnboardingStep {
  id: OnboardingStepId
  title: string
  description: string
  path: string
  required: boolean
  canSkip: boolean
}

export interface ProfileStepData {
  firstName: string
  lastName: string
  role: string
  avatarUrl?: string
}

export interface WorkProfileStepData {
  teamName: string
  jobTitle: string
  timezone: string
  teamSize: string
  role: string
  functions: string[]
  intents: string[]
  experience: string
}

export interface ToolsStepData {
  tools: string[]
  customTool?: string
  integrations?: Array<{
    id: string
    name: string
    status: 'not-started' | 'in-progress' | 'connected'
  }>
}

export interface InviteStepData {
  emails: string[]
  defaultRole: 'admin' | 'member'
  message?: string
  statuses?: Array<{ email: string; status: 'pending' | 'sent' | 'failed' }>
}

export interface PreferencesStepData {
  weeklySummary: boolean
  enableNotifications: boolean
  defaultTheme: 'dark' | 'light' | 'system'
}

export interface WorkspaceHubStepData {
  choice: 'join-existing' | 'create-new'
  organizationName?: string
  divisionName?: string
  template?: string
}

export interface OnboardingData {
  profile?: ProfileStepData
  'work-profile'?: WorkProfileStepData
  tools?: ToolsStepData
  invite?: InviteStepData
  preferences?: PreferencesStepData
  'workspace-hub'?: WorkspaceHubStepData
}

export type StepDataMap = {
  profile: ProfileStepData
  'work-profile': WorkProfileStepData
  tools: ToolsStepData
  invite: InviteStepData
  preferences: PreferencesStepData
  'workspace-hub': WorkspaceHubStepData
}

export interface OnboardingManifest {
  version: string
  variant?: string | null
  updatedAt?: string | null
  steps: BaseOnboardingStep[]
}

export const DEFAULT_ONBOARDING_STEPS: BaseOnboardingStep[] = [
  {
    id: 'profile',
    title: 'Set up your profile',
    description: 'Tell us who you are so teammates know who just joined.',
    path: '/o/profile',
    required: true,
    canSkip: false,
  },
  {
    id: 'work-profile',
    title: 'Your work profile',
    description: 'Share how you work so we can tailor the workspace.',
    path: '/o/work-profile',
    required: true,
    canSkip: false,
  },
  {
    id: 'tools',
    title: 'Tools you rely on',
    description: 'Select the tools your team already uses.',
    path: '/o/tools',
    required: false,
    canSkip: true,
  },
  {
    id: 'invite',
    title: 'Invite teammates',
    description: 'Bring collaborators in now or skip and invite later.',
    path: '/o/invite',
    required: false,
    canSkip: true,
  },
  {
    id: 'preferences',
    title: 'Workspace preferences',
    description: 'Choose the preferences that fit how you like to work.',
    path: '/o/preferences',
    required: true,
    canSkip: false,
  },
  {
    id: 'workspace-hub',
    title: 'Workspace hub',
    description: 'Create or join a workspace to finish onboarding.',
    path: '/o/workspace-hub',
    required: true,
    canSkip: false,
  },
]

export const DEFAULT_ONBOARDING_MANIFEST: OnboardingManifest = {
  version: '2024-10-11',
  variant: 'default',
  updatedAt: '2024-10-11T00:00:00.000Z',
  steps: DEFAULT_ONBOARDING_STEPS,
}

let cachedManifest: OnboardingManifest = {
  ...DEFAULT_ONBOARDING_MANIFEST,
  steps: [...DEFAULT_ONBOARDING_STEPS],
}

const toNonEmptyString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

const sanitizeStep = (step: BaseOnboardingStep): BaseOnboardingStep => {
  const id = (typeof step.id === 'string' && step.id.length > 0 ? step.id : 'unknown') as OnboardingStepId
  const title = toNonEmptyString(step.title, 'Untitled step')
  const description = toNonEmptyString(step.description, '')
  const rawPath = toNonEmptyString(step.path, '/o/unknown')
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  return {
    id,
    title,
    description,
    path: normalizedPath,
    required: Boolean(step.required),
    canSkip: Boolean(step.canSkip),
  }
}

export const getCachedOnboardingManifest = (): OnboardingManifest => cachedManifest

export const getCachedOnboardingSteps = (): BaseOnboardingStep[] => cachedManifest.steps

export const setCachedOnboardingManifest = (manifest: OnboardingManifest | null | undefined) => {
  if (!manifest || !Array.isArray(manifest.steps) || manifest.steps.length === 0) {
    cachedManifest = {
      ...DEFAULT_ONBOARDING_MANIFEST,
      steps: [...DEFAULT_ONBOARDING_STEPS],
    }
    return cachedManifest
  }

  const steps = manifest.steps.map(sanitizeStep)

  cachedManifest = {
    version: manifest.version || DEFAULT_ONBOARDING_MANIFEST.version,
    variant: manifest.variant ?? DEFAULT_ONBOARDING_MANIFEST.variant,
    updatedAt: manifest.updatedAt ?? DEFAULT_ONBOARDING_MANIFEST.updatedAt ?? null,
    steps,
  }

  return cachedManifest
}

export const getStepIndex = (
  stepId: OnboardingStepId,
  steps: BaseOnboardingStep[] = getCachedOnboardingSteps(),
) => steps.findIndex((step) => step.id === stepId)

export const getStepById = (
  stepId: OnboardingStepId,
  steps: BaseOnboardingStep[] = getCachedOnboardingSteps(),
) => steps.find((step) => step.id === stepId)

export const getNextStep = (
  stepId: OnboardingStepId,
  steps: BaseOnboardingStep[] = getCachedOnboardingSteps(),
) => {
  const index = getStepIndex(stepId, steps)
  if (index === -1) return undefined
  return steps[index + 1]
}

export const getPreviousStep = (
  stepId: OnboardingStepId,
  steps: BaseOnboardingStep[] = getCachedOnboardingSteps(),
) => {
  const index = getStepIndex(stepId, steps)
  if (index <= 0) return undefined
  return steps[index - 1]
}

export const getFirstIncompleteStep = (
  status: StoredOnboardingStatus | null,
  steps: BaseOnboardingStep[] = getCachedOnboardingSteps(),
) => {
  if (!steps.length) {
    return undefined
  }

  if (!status) {
    return steps[0]
  }

  const completedSet = new Set(status.completedSteps)
  for (const step of steps) {
    if (!completedSet.has(step.id)) {
      return step
    }
  }

  return undefined
}

export const defaultOnboardingStatus = (): StoredOnboardingStatus => ({
  version: CURRENT_ONBOARDING_STATUS_VERSION,
  completed: false,
  completedSteps: [],
  skippedSteps: [],
  data: {},
  lastStep: undefined,
  revision: null,
  checksum: null,
})

export const getOnboardingStatusVersion = (status: StoredOnboardingStatus | null | undefined) => {
  return coerceOnboardingStatusVersion(status?.version)
}

export const isLegacyOnboardingStatus = (status: StoredOnboardingStatus | null | undefined) => {
  if (!status) return false
  return getOnboardingStatusVersion(status) < CURRENT_ONBOARDING_STATUS_VERSION
}
