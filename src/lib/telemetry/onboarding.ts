'use client'

import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { getCachedOnboardingSteps, type OnboardingStepId } from '@/lib/onboarding'
import { emitTelemetryEvent } from './telemetry'

// Memoization cache for status metrics
const statusMetricsCache = new WeakMap<StoredOnboardingStatus, ReturnType<typeof memoizedBuildStatusMetrics>>()

// Memoized version of memoizedBuildStatusMetrics to prevent object reference instability
const memoizedBuildStatusMetrics = (status: StoredOnboardingStatus) => {
  if (statusMetricsCache.has(status)) {
    return statusMetricsCache.get(status)!
  }

  const metrics = buildStatusMetrics(status)
  statusMetricsCache.set(status, metrics)
  return metrics
}

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

interface OnboardingSaveRetryPayload extends OnboardingSavePayload {
  failureCount: number
}

interface OnboardingStepViewPayload {
  status: StoredOnboardingStatus
  stepId: OnboardingStepId
  stepIndex: number
  totalSteps: number
  required: boolean
  canSkip: boolean
  isCompleted: boolean
  isSkipped: boolean
  manifestVariant?: string | null
}

type ValidationIssueRecord = Record<
  OnboardingStepId,
  Array<{ field: string | null; message: string; code?: string | null }>
>

interface OnboardingValidationBlockedPayload {
  status: StoredOnboardingStatus
  currentStepId: OnboardingStepId
  blockingStepId: OnboardingStepId
  blockingStepTitle?: string | null
  issuesByStep: ValidationIssueRecord
}

interface OnboardingConflictDetectedPayload {
  status: StoredOnboardingStatus
  stepId: OnboardingStepId
  changedFields?: string[]
  retries?: number
  currentRevision?: string
  submittedRevision?: string
  currentChecksum?: string
  submittedChecksum?: string
}

interface OnboardingResumePayload {
  status: StoredOnboardingStatus
  source: 'remote-session' | 'remote-default' | 'local-cache' | 'local-default'
  mode: 'mock' | 'supabase'
  reason?: 'resume' | 'seed' | 'version-reset'
  sessionStartedAt?: string | null
  sessionCompletedAt?: string | null
}

const getTotalSteps = () => Math.max(getCachedOnboardingSteps().length, 1)

// Original buildStatusMetrics function - renamed for clarity
const buildStatusMetrics = (status: StoredOnboardingStatus) => {
  const completedCount = status.completedSteps.length
  const skippedCount = status.skippedSteps.length
  const totalSteps = getTotalSteps()
  const completionRatio = Number((completedCount / totalSteps).toFixed(3))

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
      ...memoizedBuildStatusMetrics(status),
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
      ...memoizedBuildStatusMetrics(status),
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
      ...memoizedBuildStatusMetrics(status),
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
      ...memoizedBuildStatusMetrics(status),
      source,
      mode,
      reason: reason ?? null,
      sessionStartedAt: sessionStartedAt ?? null,
      sessionCompletedAt: sessionCompletedAt ?? null,
    },
  })
}

export const trackOnboardingSaveRetried = ({
  status,
  stepId,
  intent,
  failureCount,
  retries,
  queued,
}: OnboardingSaveRetryPayload) => {
  emitTelemetryEvent({
    name: 'onboarding_save_retry',
    category: 'onboarding',
    properties: {
      ...memoizedBuildStatusMetrics(status),
      intent,
      stepId,
      failureCount,
      retries: retries ?? 0,
      queued: queued ?? false,
    },
  })
}

export const trackOnboardingStepViewed = ({
  status,
  stepId,
  stepIndex,
  totalSteps,
  required,
  canSkip,
  isCompleted,
  isSkipped,
  manifestVariant,
}: OnboardingStepViewPayload) => {
  emitTelemetryEvent({
    name: 'onboarding_step_viewed',
    category: 'onboarding',
    properties: {
      ...memoizedBuildStatusMetrics(status),
      stepId,
      stepIndex,
      totalSteps,
      required,
      canSkip,
      isCompleted,
      isSkipped,
      manifestVariant: manifestVariant ?? null,
    },
  })
}

export const trackOnboardingValidationBlocked = ({
  status,
  currentStepId,
  blockingStepId,
  blockingStepTitle,
  issuesByStep,
}: OnboardingValidationBlockedPayload) => {
  const issues = Object.entries(issuesByStep)
  const issueCount = issues.reduce((count, [, group]) => count + group.length, 0)
  const affectedSteps = issues.length
  const codes = Array.from(
    new Set(
      issues.flatMap(([, group]) =>
        group.map((issue) => (typeof issue.code === 'string' && issue.code.length > 0 ? issue.code : null)),
      ),
    ),
  ).filter((code): code is string => typeof code === 'string' && code.length > 0)

  emitTelemetryEvent({
    name: 'onboarding_validation_blocked',
    category: 'onboarding',
    properties: {
      ...memoizedBuildStatusMetrics(status),
      currentStepId,
      blockingStepId,
      blockingStepTitle: blockingStepTitle ?? null,
      affectedSteps,
      issueCount,
      issueCodes: codes,
      issues: issues.map(([stepId, group]) => ({
        stepId,
        fields: group.map((issue) => issue.field ?? null),
        codes: group
          .map((issue) => issue.code)
          .filter((code): code is string => typeof code === 'string' && code.length > 0),
        total: group.length,
      })),
    },
  })
}

export const trackOnboardingConflictDetected = ({
  status,
  stepId,
  changedFields,
  retries,
  currentRevision,
  submittedRevision,
  currentChecksum,
  submittedChecksum,
}: OnboardingConflictDetectedPayload) => {
  emitTelemetryEvent({
    name: 'onboarding_conflict_detected',
    category: 'onboarding',
    properties: {
      ...memoizedBuildStatusMetrics(status),
      stepId,
      changedFields: Array.isArray(changedFields) ? changedFields : [],
      changedFieldCount: Array.isArray(changedFields) ? changedFields.length : 0,
      retries: retries ?? 0,
      currentRevision: currentRevision ?? null,
      submittedRevision: submittedRevision ?? null,
      currentChecksum: currentChecksum ?? null,
      submittedChecksum: submittedChecksum ?? null,
    },
  })
}

