import type { StoredOnboardingStatus } from '@/lib/auth-utils'

export type OnboardingStepId =
  | 'profile'
  | 'work-profile'
  | 'tools'
  | 'invite'
  | 'preferences'
  | 'workspace-hub'

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

export const ONBOARDING_STEPS: BaseOnboardingStep[] = [
  {
    id: 'profile',
    title: 'Set up your profile',
    description: 'Tell us who you are so teammates know who just joined.',
    path: '/o/profile',
    required: true,
    canSkip: false
  },
  {
    id: 'work-profile',
    title: 'Your work profile',
    description: 'Share how you work so we can tailor the workspace.',
    path: '/o/work-profile',
    required: true,
    canSkip: false
  },
  {
    id: 'tools',
    title: 'Tools you rely on',
    description: 'Select the tools your team already uses.',
    path: '/o/tools',
    required: false,
    canSkip: true
  },
  {
    id: 'invite',
    title: 'Invite teammates',
    description: 'Bring collaborators in now or skip and invite later.',
    path: '/o/invite',
    required: false,
    canSkip: true
  },
  {
    id: 'preferences',
    title: 'Workspace preferences',
    description: 'Choose the preferences that fit how you like to work.',
    path: '/o/preferences',
    required: true,
    canSkip: false
  },
  {
    id: 'workspace-hub',
    title: 'Workspace hub',
    description: 'Create or join a workspace to finish onboarding.',
    path: '/o/workspace-hub',
    required: true,
    canSkip: false
  }
]

export const getStepIndex = (stepId: OnboardingStepId) =>
  ONBOARDING_STEPS.findIndex((step) => step.id === stepId)

export const getStepById = (stepId: OnboardingStepId) => ONBOARDING_STEPS.find((step) => step.id === stepId)

export const getNextStep = (stepId: OnboardingStepId) => {
  const index = getStepIndex(stepId)
  if (index === -1) return undefined
  return ONBOARDING_STEPS[index + 1]
}

export const getPreviousStep = (stepId: OnboardingStepId) => {
  const index = getStepIndex(stepId)
  if (index <= 0) return undefined
  return ONBOARDING_STEPS[index - 1]
}

export const getFirstIncompleteStep = (status: StoredOnboardingStatus | null) => {
  if (!status) {
    return ONBOARDING_STEPS[0]
  }

  const completedSet = new Set(status.completedSteps)
  for (const step of ONBOARDING_STEPS) {
    if (!completedSet.has(step.id)) {
      return step
    }
  }

  return undefined
}

export const defaultOnboardingStatus = (): StoredOnboardingStatus => ({
  completed: false,
  completedSteps: [],
  skippedSteps: [],
  data: {},
  lastStep: undefined
})
