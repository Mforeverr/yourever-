'use client'

import { useEffect, useMemo } from 'react'
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
  type StepDataMap
} from '@/lib/onboarding'

const allStepIds = ONBOARDING_STEPS.map((step) => step.id)

export const useOnboardingStep = <T extends OnboardingStepId>(stepId: T) => {
  const { onboardingStatus, updateOnboardingStatus, markOnboardingComplete, user } = useCurrentUser()
  const router = useRouter()

  const step = useMemo(() => getStepById(stepId), [stepId])
  const nextStep = useMemo(() => getNextStep(stepId), [stepId])
  const previousStep = useMemo(() => getPreviousStep(stepId), [stepId])

  const data = useMemo(() => {
    if (!onboardingStatus) return undefined
    return onboardingStatus.data?.[stepId] as StepDataMap[T] | undefined
  }, [onboardingStatus, stepId])

  useEffect(() => {
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
  }, [onboardingStatus, router, step, stepId, user])

  const updateData = (payload: StepDataMap[T]) => {
    updateOnboardingStatus((current) => ({
      ...current,
      data: {
        ...current.data,
        [stepId]: payload
      },
      lastStep: stepId
    }))
  }

  const completeStep = (payload: StepDataMap[T]) => {
    updateOnboardingStatus((current) => {
      const completedSteps = Array.from(new Set([...current.completedSteps, stepId]))
      return {
        ...current,
        data: {
          ...current.data,
          [stepId]: payload
        },
        completedSteps,
        skippedSteps: current.skippedSteps.filter((id) => id !== stepId),
        lastStep: stepId
      }
    })
  }

  const skipStep = () => {
    updateOnboardingStatus((current) => {
      const completedSteps = Array.from(new Set([...current.completedSteps, stepId]))
      const skippedSteps = Array.from(new Set([...current.skippedSteps, stepId]))
      return {
        ...current,
        completedSteps,
        skippedSteps,
        lastStep: stepId
      }
    })
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
    allStepIds
  }
}
