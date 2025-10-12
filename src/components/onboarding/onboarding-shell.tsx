'use client'

import { type ReactNode } from 'react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ONBOARDING_STEPS, getStepIndex, type OnboardingStepId } from '@/lib/onboarding'

interface OnboardingShellProps {
  stepId: OnboardingStepId
  title: string
  description: string
  children: ReactNode
  onNext: () => void
  onBack?: () => void
  onSkip?: () => void
  isNextDisabled?: boolean
  canSkip?: boolean
  nextLabel?: string
}

export function OnboardingShell({
  stepId,
  title,
  description,
  children,
  onNext,
  onBack,
  onSkip,
  isNextDisabled,
  canSkip,
  nextLabel = 'Continue'
}: OnboardingShellProps) {
  const stepIndex = useMemo(() => Math.max(getStepIndex(stepId), 0), [stepId])
  const totalSteps = ONBOARDING_STEPS.length
  const progressValue = ((stepIndex + 1) / totalSteps) * 100

  const stepLabel = useMemo(() => {
    const step = ONBOARDING_STEPS[stepIndex]
    return step?.title ?? ''
  }, [stepIndex])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
        <header className="mb-10 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Step {stepIndex + 1} of {totalSteps}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-base text-muted-foreground">{description}</p>
          </div>
          <div>
            <Progress value={progressValue} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{stepLabel}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {children}
          </div>
        </main>

        <footer className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                Back
              </Button>
            )}
            {canSkip && onSkip && (
              <Button variant="ghost" onClick={onSkip}>
                Skip for now
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onNext} disabled={isNextDisabled}>
              {nextLabel}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
