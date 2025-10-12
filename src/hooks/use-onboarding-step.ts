'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import {
  ONBOARDING_STEPS,
  getFirstIncompleteStep,
  getNextStep,
  getPreviousStep,
  getStepById,
  type BaseOnboardingStep,
  type OnboardingStepId,
  type StepDataMap,
  defaultOnboardingStatus,
} from '@/lib/onboarding'
import { CURRENT_ONBOARDING_STATUS_VERSION } from '@/lib/onboarding-version'
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { readOnboardingSnapshot, selectStepData, useOnboardingStore } from '@/state/onboarding.store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { persistOnboardingStatus, submitOnboardingCompletion } from '@/modules/onboarding/session'
import { toast } from '@/hooks/use-toast'

const allStepIds = ONBOARDING_STEPS.map((step) => step.id)

export const useOnboardingStep = <T extends OnboardingStepId>(stepId: T) => {
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

  const step = useMemo(() => getStepById(stepId), [stepId])
  const nextStep = useMemo(() => getNextStep(stepId), [stepId])
  const previousStep = useMemo(() => getPreviousStep(stepId), [stepId])
  const currentIndex = useMemo(() => getStepIndex(stepId), [stepId])

  const data = stepData

  useEffect(() => {
    if (status === 'pending') return
    if (!user || !onboardingStatus) return
    if (!step) {
      router.replace('/select-org')
      return
    }

    if (onboardingStatus.completed) {
      router.replace('/select-org')
      return
    }

    const completedSet = new Set(onboardingStatus.completedSteps)
    const firstIncomplete = getFirstIncompleteStep(onboardingStatus)

    if (firstIncomplete && firstIncomplete.id !== stepId && !completedSet.has(stepId)) {
      router.replace(firstIncomplete.path)
    }
  }, [onboardingStatus, router, status, step, stepId, user])

  const persistProgress = useMutation({
    mutationFn: async (status: StoredOnboardingStatus) => {
      const token = await getAccessToken()
      if (!token) {
        throw new Error('Authentication expired. Please sign in again.')
      }
      const response = await persistOnboardingStatus(token, status)
      if (!response) {
        throw new Error('Failed to sync onboarding progress.')
      }
      return status
    },
    onSuccess: (status) => {
      updateOnboardingStatus(() => status)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to save onboarding progress.'
      toast({
        title: 'Progress not saved',
        description: message,
        variant: 'destructive',
      })
    },
  })

  const updateData = (payload: StepDataMap[T]) => {
    setStepData(stepId, payload)
  }

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
      await persistProgress.mutateAsync(nextStatus)
      if (!nextStep) {
        setIsCompleting(true)
        try {
          const token = await getAccessToken()
          if (!token) {
            throw new Error('Authentication expired. Please sign in again.')
          }
          const answers = readOnboardingSnapshot()
          const response = await submitOnboardingCompletion(token, {
            status: nextStatus,
            answers,
          })
          if (!response) {
            throw new Error('Failed to finalize onboarding.')
          }
          markOnboardingComplete()
        } catch (error) {
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
      await persistProgress.mutateAsync(nextStatus)
      await invalidateUser()
      await goNext()
    } catch {
      // error handled in mutation onError
    }
  }

  const goToStep = (target?: BaseOnboardingStep) => {
    if (!target) {
      markOnboardingComplete()
      router.replace('/select-org')
      return
    }
    router.push(target.path)
  }

  const goNext = () => goToStep(nextStep)
  const goPrevious = () => {
    if (!previousStep) {
      router.replace('/select-org')
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

  const goToStepId = (targetId: OnboardingStepId) => {
    const target = getStepById(targetId)
    if (!target) return
    router.push(target.path)
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
    const targetIndex = getStepIndex(targetId)
    return targetIndex !== -1 && targetIndex <= currentIndex
  }

  const isCompleted = !!onboardingStatus?.completedSteps.includes(stepId)
  const isSkipped = !!onboardingStatus?.skippedSteps.includes(stepId)
  const isLastStep = !nextStep

  return {
    step,
    data,
    nextStep,
    previousStep,
    updateData,
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
