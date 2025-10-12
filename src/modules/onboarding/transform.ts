import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { defaultOnboardingStatus, type OnboardingStepId } from '@/lib/onboarding'

export interface OnboardingSessionRow {
  id: string
  user_id: string
  current_step: string | null
  is_completed: boolean | null
  data: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
}

export interface OnboardingSession {
  id: string
  userId: string
  status: StoredOnboardingStatus
  currentStep: OnboardingStepId
  isCompleted: boolean
  startedAt: string | null
  completedAt: string | null
}

const parseStatus = (raw: Record<string, unknown> | null | undefined): StoredOnboardingStatus => {
  const fallback = defaultOnboardingStatus()
  if (!raw) return fallback
  const status = raw.status as Partial<StoredOnboardingStatus> | undefined
  if (!status) return fallback
  return {
    ...fallback,
    ...status,
    completedSteps: status.completedSteps ?? fallback.completedSteps,
    skippedSteps: status.skippedSteps ?? fallback.skippedSteps,
    data: status.data ?? fallback.data,
    completed: status.completed ?? fallback.completed,
    lastStep: status.lastStep ?? fallback.lastStep,
  }
}

export const toOnboardingSession = (row: OnboardingSessionRow): OnboardingSession => {
  const status = parseStatus(row.data as Record<string, unknown> | null)
  const currentStep = (row.current_step as OnboardingStepId | null) ?? status.lastStep ?? 'profile'
  return {
    id: row.id,
    userId: row.user_id,
    status: {
      ...status,
      completed: row.is_completed ?? status.completed,
      lastStep: status.lastStep ?? currentStep,
    },
    currentStep,
    isCompleted: Boolean(row.is_completed),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}
