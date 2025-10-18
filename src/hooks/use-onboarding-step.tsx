'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import { useOnboardingManifest } from '@/hooks/use-onboarding-manifest'
import {
  getFirstIncompleteStep,
  getNextStep,
  getPreviousStep,
  getStepById,
  getStepIndex,
  type BaseOnboardingStep,
  type KnownOnboardingStepId,
  type OnboardingStepId,
  type StepDataMap,
  defaultOnboardingStatus,
} from '@/lib/onboarding'
import { CURRENT_ONBOARDING_STATUS_VERSION } from '@/lib/onboarding-version'
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { readOnboardingSnapshot, selectStepData, useOnboardingStore } from '@/state/onboarding.store'
import { useOnboardingValidationStore } from '@/state/onboarding-validation.store'
import { useQueryClient } from '@tanstack/react-query'
import {
  fetchOrCreateOnboardingSession,
  persistOnboardingStatus,
  submitOnboardingCompletion,
} from '@/modules/onboarding/session'
import type { OnboardingValidationSummary } from '@/modules/onboarding/session'
import { toast } from '@/hooks/use-toast'
import { useResilientMutation } from '@/lib/react-query/resilient-mutation'
import { ApiError } from '@/lib/api/http'
import {
  trackOnboardingConflictDetected,
  trackOnboardingSaveFailed,
  trackOnboardingSaveRetried,
  trackOnboardingSaveStarted,
  trackOnboardingSaveSucceeded,
  trackOnboardingStepViewed,
  trackOnboardingValidationBlocked,
} from '@/lib/telemetry/onboarding'
import { useOnboardingOfflineQueue } from '@/lib/offline/onboarding-queue'

type PersistProgressIntent = 'complete-step' | 'skip-step'

type PersistProgressVariables = {
  status: StoredOnboardingStatus
  originStepId: OnboardingStepId
  intent: PersistProgressIntent
}

type ValidationDispatchPayload = {
  blockingStepId: OnboardingStepId
  issuesByStep: Record<OnboardingStepId, Array<{ field: string | null; message: string; code?: string | null }>>
}

type ConflictDetails = {
  currentRevision?: string
  submittedRevision?: string
  currentChecksum?: string
  submittedChecksum?: string
  changedFields: string[]
}

// Simple debounce utility
const debounce = <T extends (...args: any[]) => void>(func: T, delay: number): T => {
  let timeoutId: NodeJS.Timeout
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

const parseConflictDetails = (input: unknown): ConflictDetails | null => {
  if (!input || typeof input !== 'object') {
    return null
  }

  const source = input as Record<string, unknown>

  const toStringOrUndefined = (value: unknown) => (typeof value === 'string' ? value : undefined)
  const changedFields = Array.isArray(source.changedFields)
    ? Array.from(
        new Set(
          source.changedFields
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0),
        ),
      )
    : []

  return {
    currentRevision: toStringOrUndefined(source.currentRevision),
    submittedRevision: toStringOrUndefined(source.submittedRevision),
    currentChecksum: toStringOrUndefined(source.currentChecksum),
    submittedChecksum: toStringOrUndefined(source.submittedChecksum),
    changedFields,
  }
}

const humanizeSegment = (segment: string): string => {
  const normalized = segment
    .replace(/\[(\d+)\]/g, ' $1 ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return 'Field'
  }

  return normalized
    .split(' ')
    .filter((token) => token.length > 0)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(' ')
}

const buildValidationDispatchPayload = (
  input: OnboardingValidationSummary | null | undefined | unknown,
  isValidStepId: (value: unknown) => value is OnboardingStepId,
): ValidationDispatchPayload | null => {
  if (!input || typeof input !== 'object') {
    return null
  }

  const candidate = input as Partial<OnboardingValidationSummary> & { issues?: unknown }
  const issuesSource = Array.isArray(candidate.issues) ? candidate.issues : []
  const issuesByStep: ValidationDispatchPayload['issuesByStep'] = {
    profile: [],
    'work-profile': [],
    tools: [],
    invite: [],
    preferences: [],
  }

  for (const rawIssue of issuesSource) {
    if (!rawIssue || typeof rawIssue !== 'object') continue
    const issueLike = rawIssue as { stepId?: unknown; message?: unknown; field?: unknown; code?: unknown }
    if (!isValidStepId(issueLike.stepId)) continue

    const message = typeof issueLike.message === 'string' ? issueLike.message.trim() : ''
    if (!message) continue

    const normalizedIssue = {
      field: typeof issueLike.field === 'string' ? issueLike.field : null,
      message,
      code: typeof issueLike.code === 'string' ? issueLike.code : undefined,
    }

    issuesByStep[issueLike.stepId] = [...(issuesByStep[issueLike.stepId] ?? []), normalizedIssue]
  }

  const stepIds = Object.keys(issuesByStep) as OnboardingStepId[]
  if (!stepIds.length) {
    return null
  }

  const blockingCandidate = (candidate as { blockingStepId?: unknown }).blockingStepId
  const blockingStepId = isValidStepId(blockingCandidate) ? blockingCandidate : stepIds[0]

  return { blockingStepId, issuesByStep }
}

export const useOnboardingStep = <T extends KnownOnboardingStepId>(stepId: T) => {
  const { manifest, steps: manifestSteps } = useOnboardingManifest()
  const {
    onboardingStatus,
    updateOnboardingStatus,
    markOnboardingComplete,
    user,
    getAccessToken,
    status,
  } = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isInvalidatingUser, setIsInvalidatingUser] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const stepData = useOnboardingStore(selectStepData(stepId))
  const setStepData = useOnboardingStore((state) => state.setStepData)
  const setValidationIssues = useOnboardingValidationStore((state) => state.setStepIssues)
  const clearValidationIssues = useOnboardingValidationStore((state) => state.clearAll)
  const persistAttemptRef = useRef({
    startedAt: 0,
    retries: 0,
    intent: 'complete-step' as PersistProgressIntent,
    originStepId: stepId as OnboardingStepId,
    queued: false,
    statusSnapshot: (onboardingStatus ?? defaultOnboardingStatus()) as StoredOnboardingStatus,
  })

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

  const computeDurationMs = () => {
    const startedAt = persistAttemptRef.current.startedAt
    if (!startedAt) return undefined
    return Math.max(0, Math.round(now() - startedAt))
  }

  const step = useMemo(() => getStepById(stepId, manifestSteps), [manifestSteps, stepId])
  const nextStep = useMemo(() => getNextStep(stepId, manifestSteps), [manifestSteps, stepId])
  const previousStep = useMemo(
    () => getPreviousStep(stepId, manifestSteps),
    [manifestSteps, stepId],
  )
  const currentIndex = useMemo(() => getStepIndex(stepId, manifestSteps), [manifestSteps, stepId])

  const stepIdSet = useMemo(() => new Set(manifestSteps.map((s) => s.id as OnboardingStepId)), [manifestSteps])
  const allStepIds = useMemo(() => manifestSteps.map((s) => s.id as OnboardingStepId), [manifestSteps])

  const isOnboardingStepId = useCallback(
    (value: unknown): value is OnboardingStepId =>
      typeof value === 'string' && stepIdSet.has(value as OnboardingStepId),
    [stepIdSet],
  )

  const buildConflictToastDescription = useCallback(
    (details: ConflictDetails | null): ReactNode => {
      const changedFields = details?.changedFields ?? []

      const defaultMessage = (
        <div className="space-y-1">
          <p>
            Another session updated your onboarding answers. We refreshed the latest data so you can review before
            continuing.
          </p>
        </div>
      )

      if (!changedFields.length) {
        return defaultMessage
      }

      const groupsMap = new Map<string, { title: string; fields: string[] }>()

      changedFields.forEach((path) => {
        if (typeof path !== 'string' || !path.trim()) {
          return
        }
        const segments = path.split('.').filter(Boolean)
        if (!segments.length) {
          return
        }

        const [stepSegment, ...fieldSegments] = segments
        const step = getStepById(stepSegment as OnboardingStepId, manifestSteps)
        const mapKey = step ? step.id : stepSegment
        const existing = groupsMap.get(mapKey)
        const entry =
          existing ?? {
            title: step?.title ?? humanizeSegment(stepSegment || 'Step'),
            fields: [] as string[],
          }

        if (fieldSegments.length) {
          const label = fieldSegments.map(humanizeSegment).join(' › ')
          if (!entry.fields.includes(label)) {
            entry.fields.push(label)
          }
        }

        groupsMap.set(mapKey, entry)
      })

      const groups = Array.from(groupsMap.entries()).map(([key, entry]) => ({
        key,
        title: entry.title,
        fields: entry.fields.length ? entry.fields : ['Step answers updated elsewhere'],
      }))

      if (!groups.length) {
        return defaultMessage
      }

      return (
        <div className="space-y-2">
          <p>Another session updated your onboarding answers. Review the following before continuing:</p>
          <ul className="list-disc space-y-1 pl-4">
            {groups.map((group) => (
              <li key={group.key}>
                <span className="font-medium">{group.title}</span>
                {group.fields.length ? (
                  <ul className="list-disc space-y-1 pl-4">
                    {group.fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )
    },
    [manifestSteps],
  )

  const data = stepData

  const goToStepId = useCallback(
    (targetId: OnboardingStepId) => {
      const target = getStepById(targetId, manifestSteps)
      if (!target) return
      router.push(target.path)
    },
    [manifestSteps, router],
  )

  const dispatchValidationSummary = useCallback(
    (summary: unknown) => {
      const payload = buildValidationDispatchPayload(summary, isOnboardingStepId)
      if (!payload) {
        return false
      }

      Object.entries(payload.issuesByStep).forEach(([targetId, issues]) => {
        setValidationIssues(targetId as OnboardingStepId, issues)
      })

      const blockingStep = payload.blockingStepId
      const blockingMeta = getStepById(blockingStep, manifestSteps)
      toast({
        title: 'Review required',
        description: blockingMeta
          ? `Please update “${blockingMeta.title}” before finishing onboarding.`
          : 'Please review the highlighted step before finishing onboarding.',
        variant: 'destructive',
      })

      if (blockingStep !== stepId) {
        goToStepId(blockingStep)
      }

      trackOnboardingValidationBlocked({
        status: onboardingStatus ?? defaultOnboardingStatus(),
        currentStepId: stepId,
        blockingStepId: blockingStep,
        blockingStepTitle: blockingMeta?.title,
        issuesByStep: payload.issuesByStep,
      })

      return true
    },
    [
      goToStepId,
      isOnboardingStepId,
      manifestSteps,
      onboardingStatus,
      setValidationIssues,
      stepId,
      toast,
    ],
  )

  useEffect(() => {
    if (status === 'pending') return
    if (!user || !onboardingStatus) return
    if (!step) {
      router.replace('/workspace-hub')
      return
    }

    if (onboardingStatus.completed) {
      router.replace('/workspace-hub')
      return
    }

    const completedSet = new Set(onboardingStatus.completedSteps)
    const firstIncomplete = getFirstIncompleteStep(onboardingStatus, manifestSteps)

    if (firstIncomplete && firstIncomplete.id !== stepId && !completedSet.has(stepId)) {
      router.replace(firstIncomplete.path)
    }
  }, [manifestSteps, onboardingStatus, router, status, step, stepId, user])

  const { enqueue: enqueueOfflinePersist, isSupported: isOfflineQueueSupported, addListener: addOfflineListener } =
    useOnboardingOfflineQueue()

  useEffect(() => {
    if (!isOfflineQueueSupported) {
      return undefined
    }

    const cleanup = addOfflineListener((event) => {
      if (event.type === 'onboarding.persist.failed') {
        toast({
          title: 'Progress could not sync',
          description: 'Please check your connection and update your onboarding answers again.',
          variant: 'destructive',
        })
      }
    })

    // Ensure cleanup function returns void
    return () => {
      cleanup?.()
    }
  }, [addOfflineListener, isOfflineQueueSupported, toast])

  const attemptPersistStatus = useCallback(
    async (status: StoredOnboardingStatus) => {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Authentication expired. Please sign in again.')
      }

      const shouldQueueImmediately =
        isOfflineQueueSupported && typeof navigator !== 'undefined' && navigator.onLine === false

      const enqueueAndReturn = async () => {
        const enqueued = await enqueueOfflinePersist(token, status, stepId)
        if (enqueued) {
          persistAttemptRef.current.queued = true
          return status
        }
        throw new Error('Failed to enqueue onboarding progress for offline sync.')
      }

      if (shouldQueueImmediately) {
        return enqueueAndReturn()
      }

      try {
        const response = await persistOnboardingStatus(token, status)
        if (!response?.status) {
          throw new Error('Failed to sync onboarding progress.')
        }
        return response.status
      } catch (error) {
        const retryableNetworkFailure =
          error instanceof ApiError &&
          (error.status === 0 || error.status === 408 || (error.status >= 500 && error.status < 600))

        if (isOfflineQueueSupported && retryableNetworkFailure) {
          return enqueueAndReturn()
        }
        throw error
      }
    },
    [enqueueOfflinePersist, getAccessToken, isOfflineQueueSupported, stepId],
  )

  const persistProgress = useResilientMutation<StoredOnboardingStatus, unknown, PersistProgressVariables>({
    mutationFn: async ({ status }) => attemptPersistStatus(status),
    onMutate: (variables) => {
      persistAttemptRef.current = {
        startedAt: now(),
        retries: 0,
        intent: variables.intent,
        originStepId: variables.originStepId,
        queued: false,
        statusSnapshot: variables.status,
      }
      trackOnboardingSaveStarted({
        status: variables.status,
        stepId: variables.originStepId,
        intent: variables.intent,
      })
    },
    onRetry: (failureCount) => {
      persistAttemptRef.current = {
        ...persistAttemptRef.current,
        retries: failureCount,
      }
      trackOnboardingSaveRetried({
        status: persistAttemptRef.current.statusSnapshot,
        stepId: persistAttemptRef.current.originStepId,
        intent: persistAttemptRef.current.intent,
        failureCount,
        retries: failureCount,
        queued: persistAttemptRef.current.queued,
      })
    },
    onSuccess: (status, variables) => {
      trackOnboardingSaveSucceeded({
        status,
        stepId: variables.originStepId,
        intent: variables.intent,
        durationMs: computeDurationMs(),
        retries: persistAttemptRef.current.retries,
        queued: persistAttemptRef.current.queued,
      })
      persistAttemptRef.current.statusSnapshot = status
      updateOnboardingStatus(() => status)
    },
    onError: (error, variables) => {
      trackOnboardingSaveFailed({
        status: variables.status,
        stepId: variables.originStepId,
        intent: variables.intent,
        durationMs: computeDurationMs(),
        retries: persistAttemptRef.current.retries,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : undefined,
        errorStatus: error instanceof ApiError ? error.status : null,
        queued: persistAttemptRef.current.queued,
      })
      if (error instanceof ApiError && error.status === 409) {
        const conflict = parseConflictDetails(error.body?.conflict)
        trackOnboardingConflictDetected({
          status: variables.status,
          stepId: variables.originStepId,
          changedFields: conflict?.changedFields,
          retries: persistAttemptRef.current.retries,
          currentRevision: conflict?.currentRevision,
          submittedRevision: conflict?.submittedRevision,
          currentChecksum: conflict?.currentChecksum,
          submittedChecksum: conflict?.submittedChecksum,
        })
        void resyncFromServer()
      }
    },
    messages: {
      pending: () => ({
        title: 'Saving your progress…',
        description: 'We will keep trying in the background if the connection is unstable.',
      }),
      retrying: (failureCount, maxAttempts) => ({
        title: 'Still working on it…',
        description: `Retrying to sync (${failureCount}/${maxAttempts}). Your answers are safe locally.`,
      }),
      success: () => ({
        title: 'Progress synced',
        description: 'All onboarding updates are now saved.',
      }),
      error: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          const conflict = parseConflictDetails(error.body?.conflict)
          return {
            title: 'Answers updated elsewhere',
            description: buildConflictToastDescription(conflict),
            variant: 'default',
          }
        }

        const message =
          error instanceof Error
            ? `${error.message} We kept your latest answers locally.`
            : 'Unable to save onboarding progress. We kept your latest answers locally.'

        return {
          title: 'Progress not saved',
          description: message,
          variant: 'destructive',
        }
      },
    },
    maxRetryAttempts: 3,
    baseRetryDelayMs: 1_500,
    maxRetryDelayMs: 10_000,
  })

  const resyncFromServer = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) return
    try {
      const session = await fetchOrCreateOnboardingSession(token)
      if (session?.status) {
        // Only sync the status if it's not completed, to avoid false completion
        // due to conflict resolution race conditions
        if (!session.isCompleted) {
          updateOnboardingStatus(() => session.status)
          useOnboardingStore.getState().hydrateFromStatus(session.status)
        }
      }
    } catch (error) {
      console.error('[onboarding] failed to refresh session after conflict', error)
    }
  }, [getAccessToken, updateOnboardingStatus])

  const updateData = useCallback((payload: StepDataMap[T]) => {
    setStepData(stepId, payload)
  }, [stepId, setStepData])

  // Create debounced version for form keystrokes (500ms delay)
  const debouncedUpdateData = useCallback(
    debounce((payload: StepDataMap[T]) => {
      setStepData(stepId, payload)
    }, 500),
    [stepId, setStepData]
  )

  const buildNextStatus = (payload: StepDataMap[T], { markCompleted }: { markCompleted?: boolean } = {}) => {
    const base = onboardingStatus ?? defaultOnboardingStatus()
    const completedSteps = Array.from(new Set([...base.completedSteps, stepId]))
    return {
      ...base,
      version: CURRENT_ONBOARDING_STATUS_VERSION,
      data: {
        ...base.data,
        [stepId]: payload,
      },
      completedSteps,
      skippedSteps: base.skippedSteps.filter((id) => id !== stepId),
      lastStep: stepId,
      completed: markCompleted ? true : base.completed,
    }
  }

  const buildSkippedStatus = () => {
    const base = onboardingStatus ?? defaultOnboardingStatus()
    const completedSteps = Array.from(new Set([...base.completedSteps, stepId]))
    const skippedSteps = Array.from(new Set([...base.skippedSteps, stepId]))
    return {
      ...base,
      version: CURRENT_ONBOARDING_STATUS_VERSION,
      completedSteps,
      skippedSteps,
      lastStep: stepId,
    }
  }

  const invalidateUser = async () => {
    setIsInvalidatingUser(true)
    try {
      await queryClient.invalidateQueries({ queryKey: ['user'] })
    } finally {
      setIsInvalidatingUser(false)
    }
  }

  const completeStep = async (payload: StepDataMap[T]) => {
    if (persistProgress.isPending || isInvalidatingUser || isCompleting) return
    setStepData(stepId, payload)
    const nextStatus = buildNextStatus(payload, { markCompleted: !nextStep })
    try {
      const syncedStatus = await persistProgress.mutateAsync({
        status: nextStatus,
        originStepId: stepId,
        intent: 'complete-step',
      })
      if (!nextStep) {
        setIsCompleting(true)
        try {
          const token = await getAccessToken()
          if (!token) {
            throw new Error('Authentication expired. Please sign in again.')
          }
          const answers = readOnboardingSnapshot()
          const response = await submitOnboardingCompletion(token, {
            status: syncedStatus,
            answers,
          })
          if (dispatchValidationSummary(response?.validation)) {
            return
          }
          if (!response?.session) {
            throw new Error('Failed to finalize onboarding.')
          }
          clearValidationIssues()
          markOnboardingComplete()
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) {
            const conflict = parseConflictDetails(error.body?.conflict)
            toast({
              title: 'Answers updated elsewhere',
              description: buildConflictToastDescription(conflict),
              variant: 'default',
            })
            trackOnboardingConflictDetected({
              status: syncedStatus,
              stepId,
              changedFields: conflict?.changedFields,
              retries: persistAttemptRef.current.retries,
              currentRevision: conflict?.currentRevision,
              submittedRevision: conflict?.submittedRevision,
              currentChecksum: conflict?.currentChecksum,
              submittedChecksum: conflict?.submittedChecksum,
            })
            void resyncFromServer()
            return
          }
          if (error instanceof ApiError && dispatchValidationSummary(error.body?.validation)) {
            return
          }
          const message = error instanceof Error ? error.message : 'Unable to finish onboarding.'
          toast({
            title: 'Unable to finish',
            description: message,
            variant: 'destructive',
          })
          throw error
        } finally {
          setIsCompleting(false)
        }
      }
      await invalidateUser()
      await goNext()
    } catch {
      // error handled in mutation onError
    }
  }

  const skipStep = async () => {
    if (persistProgress.isPending || isInvalidatingUser || isCompleting) return
    const nextStatus = buildSkippedStatus()
    try {
      await persistProgress.mutateAsync({
        status: nextStatus,
        originStepId: stepId,
        intent: 'skip-step',
      })
      await invalidateUser()
      await goNext()
    } catch {
      // error handled in mutation onError
    }
  }

  const goToStep = (target?: BaseOnboardingStep) => {
    if (!target) {
      markOnboardingComplete()
      router.replace('/welcome')
      return
    }
    router.push(target.path)
  }

  const goNext = () => goToStep(nextStep)
  const goPrevious = () => {
    if (!previousStep) {
      router.replace('/workspace-hub')
      return
    }
    updateOnboardingStatus((current) => {
      const completedSteps = current.completedSteps.filter((id) => id !== stepId)
      return {
        ...current,
        completedSteps,
        lastStep: previousStep.id,
      }
    })
    router.push(previousStep.path)
  }

  const completedSteps = onboardingStatus?.completedSteps ?? []
  const skippedSteps = onboardingStatus?.skippedSteps ?? []

  const canNavigateToStep = (targetId: OnboardingStepId) => {
    if (persistProgress.isPending || isInvalidatingUser || isCompleting) return false
    if (targetId === stepId) return true
    const completedSet = new Set(completedSteps)
    const skippedSet = new Set(skippedSteps)
    if (completedSet.has(targetId) || skippedSet.has(targetId)) {
      return true
    }
    const targetIndex = getStepIndex(targetId, manifestSteps)
    return targetIndex !== -1 && targetIndex <= currentIndex
  }

  const isCompleted = !!onboardingStatus?.completedSteps.includes(stepId)
  const isSkipped = !!onboardingStatus?.skippedSteps.includes(stepId)
  const isLastStep = !nextStep

  const hasTrackedStepViewRef = useRef(false)

  useEffect(() => {
    if (hasTrackedStepViewRef.current) return
    if (!step) return

    hasTrackedStepViewRef.current = true

    trackOnboardingStepViewed({
      status: onboardingStatus ?? defaultOnboardingStatus(),
      stepId,
      stepIndex: currentIndex,
      totalSteps: manifestSteps.length,
      required: step.required,
      canSkip: step.canSkip,
      isCompleted,
      isSkipped,
      manifestVariant: manifest.variant ?? null,
    })
  }, [
    currentIndex,
    isCompleted,
    isSkipped,
    manifest.variant,
    manifestSteps.length,
    onboardingStatus,
    step,
    stepId,
  ])

  return {
    step,
    data,
    nextStep,
    previousStep,
    updateData,
    debouncedUpdateData,
    completeStep,
    skipStep,
    goNext,
    goPrevious,
    goToStep,
    goToStepId,
    canNavigateToStep,
    isCompleted,
    isSkipped,
    isLastStep,
    onboardingStatus,
    allStepIds,
    completedSteps,
    skippedSteps,
    isSaving: persistProgress.isPending || isInvalidatingUser || isCompleting,
  }
}
