'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import type { OnboardingStepId } from '@/lib/onboarding'
import { useOnboardingValidationStore } from '@/state/onboarding-validation.store'

export const useOnboardingValidationFeedback = <TFieldValues extends FieldValues>(
  stepId: OnboardingStepId,
  form: UseFormReturn<TFieldValues>,
) => {
  const consumeStepIssues = useOnboardingValidationStore((state) => state.consumeStepIssues)
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    const issues = consumeStepIssues(stepId)
    if (!issues?.length) {
      return
    }

    let nextGeneralError: string | null = null

    issues.forEach((issue) => {
      if (issue.field) {
        form.setError(issue.field as keyof TFieldValues, {
          type: 'server',
          message: issue.message,
        })
      } else if (!nextGeneralError) {
        nextGeneralError = issue.message
      }
    })

    setGeneralError(nextGeneralError)
  }, [consumeStepIssues, form, stepId])

  const dismissGeneralError = useCallback(() => setGeneralError(null), [])

  return { generalError, dismissGeneralError }
}
