'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldValues, UseFormReturn, Path } from 'react-hook-form'
import type { OnboardingStepId } from '@/lib/onboarding'
import { useOnboardingValidationStore } from '@/state/onboarding-validation.store'

export const useOnboardingValidationFeedback = <TFieldValues extends FieldValues>(
  stepId: OnboardingStepId,
  form: UseFormReturn<TFieldValues>,
) => {
  const consumeStepIssues = useOnboardingValidationStore((state) => state.consumeStepIssues)
  const stepIssues = useOnboardingValidationStore(
    useMemo(
      () => (state) => state.issues[stepId],
      [stepId],
    ),
  )
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    if (!stepIssues?.length) {
      return
    }

    let nextGeneralError: string | null = null

    stepIssues.forEach((issue) => {
      if (issue.field) {
        form.setError(issue.field as Path<TFieldValues>, {
          type: 'server',
          message: issue.message,
        })
      } else if (!nextGeneralError) {
        nextGeneralError = issue.message
      }
    })

    setGeneralError(nextGeneralError)
    consumeStepIssues(stepId)
  }, [consumeStepIssues, form, stepId, stepIssues])

  const dismissGeneralError = useCallback(() => setGeneralError(null), [])

  return { generalError, dismissGeneralError }
}
