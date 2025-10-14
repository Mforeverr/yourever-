'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useOnboardingValidationFeedback } from '@/hooks/use-onboarding-validation'
import { preferencesStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'

export default function PreferencesOnboardingPage() {
  const {
    data,
    completeStep,
    updateData,
    previousStep,
    goPrevious,
    isSaving,
    completedSteps,
    skippedSteps,
    goToStepId,
    canNavigateToStep,
  } = useOnboardingStep('preferences')
  const form = useForm({
    resolver: zodResolver(preferencesStepSchema),
    mode: 'onChange',
    defaultValues: data,
  })
  const { generalError } = useOnboardingValidationFeedback('preferences', form)
  const {
    control,
    formState: { isValid },
  } = form

  useEffect(() => {
    void form.trigger()
  }, [form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      updateData(values as typeof data)
    })
    return () => subscription.unsubscribe()
  }, [form, updateData])

  useEffect(() => {
    const currentValues = form.getValues()
    if (deepEqual(currentValues, data)) {
      return
    }
    form.reset(data)
    void form.trigger()
  }, [data, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isSaving) return
    await completeStep(values)
  })

  const nextLabel = useMemo(() => 'Continue to workspace setup', [])

  return (
    <OnboardingShell
      stepId="preferences"
      title="Workspace preferences"
      description="Choose how you want updates and the workspace to behave."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid || isSaving}
      nextLabel={nextLabel}
      isBackDisabled={isSaving}
      completedSteps={completedSteps}
      skippedSteps={skippedSteps}
      onStepSelect={goToStepId}
      canNavigateToStep={canNavigateToStep}
    >
      {generalError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>We need a quick update</AlertTitle>
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Weekly summaries</p>
            <p className="text-xs text-muted-foreground">Get a digest every Monday with highlights across your teams.</p>
          </div>
          <Controller
            control={control}
            name="weeklySummary"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
            )}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enable notifications</p>
            <p className="text-xs text-muted-foreground">Receive inbox and push notifications for important updates.</p>
          </div>
          <Controller
            control={control}
            name="enableNotifications"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Default theme</Label>
          <Controller
            control={control}
            name="defaultTheme"
            render={({ field }) => (
              <select
                id="theme"
                {...field}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">Match system</option>
              </select>
            )}
          />
        </div>
      </form>
    </OnboardingShell>
  )
}
