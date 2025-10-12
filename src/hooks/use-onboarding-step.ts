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
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { selectStepData, useOnboardingStore } from '@/state/onboarding.store'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { persistOnboardingStatus } from '@/modules/onboarding/session'
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
  const stepData = useOnboardingStore(selectStepData(stepId))
  const setStepData = useOnboardingStore((state) => state.setStepData)

  const step = useMemo(() => getStepById(stepId), [stepId])
  const nextStep = useMemo(() => getNextStep(stepId), [stepId])
  const previousStep = useMemo(() => getPreviousStep(stepId), [stepId])

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

  const buildNextStatus = (payload: StepDataMap[T]) => {
    const base = onboardingStatus ?? defaultOnboardingStatus()
    const completedSteps = Array.from(new Set([...base.completedSteps, stepId]))
    return {
      ...base,
      data: {
        ...base.data,
        [stepId]: payload,
      },
      completedSteps,
      skippedSteps: base.skippedSteps.filter((id) => id !== stepId),
      lastStep: stepId,
    }
  }

  const buildSkippedStatus = () => {
    const base = onboardingStatus ?? defaultOnboardingStatus()
    const completedSteps = Array.from(new Set([...base.completedSteps, stepId]))
    const skippedSteps = Array.from(new Set([...base.skippedSteps, stepId]))
    return {
      ...base,
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
    if (persistProgress.isPending || isInvalidatingUser) return
    setStepData(stepId, payload)
    const nextStatus = buildNextStatus(payload)
    try {
      await persistProgress.mutateAsync(nextStatus)
      await invalidateUser()
      await goNext()
    } catch {
      // error handled in mutation onError
    }
  }

  const skipStep = async () => {
    if (persistProgress.isPending || isInvalidatingUser) return
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
    isCompleted,
    isSkipped,
    isLastStep,
    onboardingStatus,
    allStepIds,
    isSaving: persistProgress.isPending || isInvalidatingUser,
  }
}
