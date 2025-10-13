'use client'

import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { ONBOARDING_STEPS, type OnboardingStepId } from '@/lib/onboarding'
import { emitTelemetryEvent } from './telemetry'

type OnboardingSaveIntent = 'complete-step' | 'skip-step' | 'version-reset'

interface OnboardingSavePayload {
  status: StoredOnboardingStatus
  stepId: OnboardingStepId
  intent: OnboardingSaveIntent
  durationMs?: number
  retries?: number
  errorName?: string
  errorMessage?: string
  errorStatus?: number | null
  queued?: boolean
}

interface OnboardingResumePayload {
  status: StoredOnboardingStatus
  source: 'remote-session' | 'remote-default' | 'local-cache' | 'local-default'
  mode: 'mock' | 'supabase'
  reason?: 'resume' | 'seed' | 'version-reset'
  sessionStartedAt?: string | null
  sessionCompletedAt?: string | null
}

const TOTAL_STEPS = Math.max(ONBOARDING_STEPS.length, 1)

const buildStatusMetrics = (status: StoredOnboardingStatus) => {
  const completedCount = status.completedSteps.length
  const skippedCount = status.skippedSteps.length
  const completionRatio = Number((completedCount / TOTAL_STEPS).toFixed(3))

  return {
    statusVersion: status.version,
    completed: status.completed,
    completedCount,
    skippedCount,
    completionRatio,
    lastStep: status.lastStep ?? null,
  }
}

export const trackOnboardingSaveStarted = ({ status, stepId, intent }: OnboardingSavePayload) => {
  emitTelemetryEvent({
    name: 'onboarding_save_started',
    category: 'onboarding',
    properties: {
      ...buildStatusMetrics(status),
      intent,
      stepId,
    },
  })
}

export const trackOnboardingSaveSucceeded = ({
  status,
  stepId,
  intent,
  durationMs,
  retries,
  queued,
}: OnboardingSavePayload) => {
  emitTelemetryEvent({
    name: 'onboarding_save_succeeded',
    category: 'onboarding',
    properties: {
      ...buildStatusMetrics(status),
      intent,
      stepId,
      durationMs: durationMs ?? null,
      retries: retries ?? 0,
      queued: queued ?? false,
    },
  })
}

export const trackOnboardingSaveFailed = ({
  status,
  stepId,
  intent,
  durationMs,
  retries,
  errorName,
  errorMessage,
  errorStatus,
  queued,
}: OnboardingSavePayload) => {
  emitTelemetryEvent({
    name: 'onboarding_save_failed',
    category: 'onboarding',
    properties: {
      ...buildStatusMetrics(status),
      intent,
      stepId,
      durationMs: durationMs ?? null,
      retries: retries ?? 0,
      errorName: errorName ?? null,
      errorMessage: errorMessage ?? null,
      errorStatus: errorStatus ?? null,
      queued: queued ?? false,
    },
  })
}

export const trackOnboardingResume = ({
  status,
  source,
  mode,
  reason,
  sessionStartedAt,
  sessionCompletedAt,
}: OnboardingResumePayload) => {
  emitTelemetryEvent({
    name: 'onboarding_session_resumed',
    category: 'onboarding',
    properties: {
      ...buildStatusMetrics(status),
      source,
      mode,
      reason: reason ?? null,
      sessionStartedAt: sessionStartedAt ?? null,
      sessionCompletedAt: sessionCompletedAt ?? null,
    },
  })
}

