'use client'

import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useOnboardingValidationFeedback } from '@/hooks/use-onboarding-validation'
import type { ProfileStepData } from '@/lib/onboarding'
import { useCurrentUser } from '@/hooks/use-auth'
import { profileStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'

const ROLE_OPTIONS = ['Founder', 'Executive', 'Manager', 'Individual Contributor', 'Operations', 'Other']

export default function ProfileOnboardingPage() {
  const { user } = useCurrentUser()
  const {
    data,
    completeStep,
    updateData,
    debouncedUpdateData,
    previousStep,
    goPrevious,
    isSaving,
    completedSteps,
    skippedSteps,
    goToStepId,
    canNavigateToStep,
  } = useOnboardingStep('profile')
  const hasPrefilledRef = useRef(false)
  const form = useForm<ProfileStepData>({
    resolver: zodResolver(profileStepSchema),
    mode: 'onChange',
    defaultValues: data as ProfileStepData,
  })
  const { generalError } = useOnboardingValidationFeedback('profile', form)
  const {
    control,
    formState: { isValid, errors },
  } = form

  useEffect(() => {
    void form.trigger()
  }, [form])

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    if ((data as ProfileStepData).firstName || (data as ProfileStepData).lastName) {
      hasPrefilledRef.current = true
      return
    }

    const next: ProfileStepData = {
      ...form.getValues(),
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    }
    updateData(next)
    hasPrefilledRef.current = true
  }, [user, data, form, updateData])

  useEffect(() => {
    const subscription = form.watch((values) => {
      debouncedUpdateData(values as ProfileStepData)
    })
    return () => subscription.unsubscribe()
  }, [form, debouncedUpdateData])

  useEffect(() => {
    const currentValues = form.getValues()
    if (deepEqual(currentValues, data)) {
      return
    }
    form.reset(data as ProfileStepData)
    void form.trigger()
  }, [data, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isSaving) return
    await completeStep(values)
  })

  return (
    <OnboardingShell
      stepId="profile"
      title="Set up your profile"
      description="Tell us who you are so teammates know who just joined."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid || isSaving}
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
      <form className="grid grid-cols-1 gap-6" onSubmit={(event) => event.preventDefault()}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Controller
              control={control}
              name="firstName"
              render={({ field }) => (
                <Input
                  id="firstName"
                  placeholder="Ada"
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Controller
              control={control}
              name="lastName"
              render={({ field }) => (
                <Input id="lastName" placeholder="Lovelace" {...field} value={field.value ?? ''} />
              )}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Primary role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <select
                id="role"
                {...field}
                value={field.value ?? ''}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                <option value="" disabled>
                  Select your role
                </option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Controller
            control={control}
            name="avatarUrl"
            render={({ field }) => (
              <Input id="avatarUrl" placeholder="https://..." {...field} value={field.value ?? ''} />
            )}
          />
          {errors.avatarUrl && (
            <p className="text-xs text-destructive">{errors.avatarUrl.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll use this image in the workspace. Upload support will hook into the real API later.
          </p>
        </div>
      </form>
    </OnboardingShell>
  )
}
