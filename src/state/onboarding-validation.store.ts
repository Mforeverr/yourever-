'use client'

import { create } from 'zustand'
import type { OnboardingStepId } from '@/lib/onboarding'

export type StepValidationIssue = {
  field?: string | null
  message: string
  code?: string | null
}

interface OnboardingValidationState {
  issues: Partial<Record<OnboardingStepId, StepValidationIssue[]>>
  setStepIssues: (stepId: OnboardingStepId, issues: StepValidationIssue[]) => void
  consumeStepIssues: (stepId: OnboardingStepId) => StepValidationIssue[] | undefined
  clearAll: () => void
}

export const useOnboardingValidationStore = create<OnboardingValidationState>((set, get) => ({
  issues: {},
  setStepIssues: (stepId, issues) => {
    set((state) => ({
      issues: {
        ...state.issues,
        [stepId]: issues,
      },
    }))
  },
  consumeStepIssues: (stepId) => {
    const currentIssues = get().issues[stepId]
    if (!currentIssues?.length) {
      return undefined
    }

    set((state) => {
      const next = { ...state.issues }
      delete next[stepId]
      return { issues: next }
    })

    return currentIssues
  },
  clearAll: () => set({ issues: {} }),
}))
