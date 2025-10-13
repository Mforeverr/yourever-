'use client'

import { type ReactNode, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useOnboardingManifest } from '@/hooks/use-onboarding-manifest'
import { getStepIndex, type OnboardingStepId } from '@/lib/onboarding'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, CircleDot } from 'lucide-react'

interface OnboardingShellProps {
  stepId: OnboardingStepId
  title: string
  description: string
  children: ReactNode
  onNext: () => void | Promise<void>
  onBack?: () => void | Promise<void>
  onSkip?: () => void | Promise<void>
  isNextDisabled?: boolean
  canSkip?: boolean
  isSkipDisabled?: boolean
  nextLabel?: string
  completedSteps?: OnboardingStepId[]
  skippedSteps?: OnboardingStepId[]
  onStepSelect?: (stepId: OnboardingStepId) => void
  canNavigateToStep?: (stepId: OnboardingStepId) => boolean
  isBackDisabled?: boolean
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
  isSkipDisabled,
  nextLabel = 'Continue',
  completedSteps,
  skippedSteps,
  onStepSelect,
  canNavigateToStep,
  isBackDisabled,
}: OnboardingShellProps) {
  const { steps: manifestSteps } = useOnboardingManifest()
  const stepIndex = useMemo(() => Math.max(getStepIndex(stepId, manifestSteps), 0), [manifestSteps, stepId])
  const totalSteps = manifestSteps.length
  const safeTotalSteps = Math.max(totalSteps, 1)
  const clampedIndex = Math.min(stepIndex, safeTotalSteps - 1)
  const progressValue = ((clampedIndex + 1) / safeTotalSteps) * 100
  const completedSet = useMemo(() => new Set(completedSteps ?? []), [completedSteps])
  const skippedSet = useMemo(() => new Set(skippedSteps ?? []), [skippedSteps])

  const stepLabel = useMemo(() => {
    const step = manifestSteps[stepIndex]
    return step?.title ?? ''
  }, [manifestSteps, stepIndex])

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

        <nav className="mb-8">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {manifestSteps.map((step) => {
              const isCurrent = step.id === stepId
              const isComplete = completedSet.has(step.id)
              const isSkipped = skippedSet.has(step.id)
              const StepIcon = isComplete ? CheckCircle2 : isCurrent ? CircleDot : Circle
              const statusLabel = isCurrent
                ? 'In progress'
                : isComplete
                  ? 'Completed'
                  : isSkipped
                    ? 'Skipped'
                    : 'Pending'
              const canNavigate =
                !!onStepSelect && (canNavigateToStep ? canNavigateToStep(step.id) : isCurrent || isComplete)

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (canNavigate) {
                      onStepSelect(step.id)
                    }
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isCurrent
                      ? 'border-primary/70 bg-primary/10 text-primary'
                      : 'border-border/60 bg-card hover:border-primary/40',
                    !canNavigate && 'cursor-default opacity-70 hover:border-border/60',
                  )}
                  disabled={!canNavigate}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-xs text-muted-foreground">{statusLabel}</span>
                  </div>
                  <StepIcon
                    aria-hidden
                    className={cn(
                      'ml-3 h-5 w-5 flex-shrink-0',
                      isComplete
                        ? 'text-emerald-500'
                        : isCurrent
                          ? 'text-primary'
                          : 'text-muted-foreground',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </nav>

        <main className="flex-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {children}
          </div>
        </main>

        <footer className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {onBack && (
              <Button variant="ghost" onClick={onBack} disabled={isBackDisabled}>
                Back
              </Button>
            )}
            {canSkip && onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={isSkipDisabled}>
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
