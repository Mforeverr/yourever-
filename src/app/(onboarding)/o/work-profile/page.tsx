'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useOnboardingValidationFeedback } from '@/hooks/use-onboarding-validation'
import { useCurrentUser } from '@/hooks/use-auth'
import type { WorkProfileStepData } from '@/lib/onboarding'
import { workProfileStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'

const TIMEZONES = ['UTC−08:00 (PT)', 'UTC−05:00 (ET)', 'UTC±00:00', 'UTC+01:00', 'UTC+05:30', 'UTC+08:00']
const TEAM_SIZES = ['1-5', '6-15', '16-50', '51-200', '200+']
const FUNCTION_OPTIONS = ['Product', 'Engineering', 'Design', 'Revenue Ops', 'Customer Success', 'Marketing', 'Finance', 'People']
const INTENT_OPTIONS = ['Plan projects', 'Run meetings', 'Coordinate async work', 'Ship releases', 'Track goals', 'Support customers']
const EXPERIENCE_LEVELS = ['New to role', '1-3 years', '4-7 years', '8+ years']

export default function WorkProfileOnboardingPage() {
  const { user } = useCurrentUser()
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
  } = useOnboardingStep('work-profile')
  const hasPrefilledRef = useRef(false)
  const form = useForm<WorkProfileStepData>({
    resolver: zodResolver(workProfileStepSchema),
    mode: 'onChange',
    defaultValues: data as WorkProfileStepData,
  })
  const { generalError } = useOnboardingValidationFeedback('work-profile', form)
  const {
    control,
    formState: { isValid, errors },
  } = form
  const watchJobTitle = form.watch('jobTitle') ?? ''
  const watchFunctions = form.watch('functions') ?? []
  const watchIntents = form.watch('intents') ?? []

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    if ((data as WorkProfileStepData).teamName || (data as WorkProfileStepData).jobTitle) {
      hasPrefilledRef.current = true
      return
    }

    const next: WorkProfileStepData = {
      ...form.getValues(),
      teamName: user.organizations[0]?.name ?? '',
      jobTitle: user.role ?? '',
      role: user.role ?? '',
    }
    form.reset(next)
    updateData(next)
    hasPrefilledRef.current = true
  }, [user, data, form, updateData])

  useEffect(() => {
    void form.trigger()
  }, [form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      updateData(values as WorkProfileStepData)
    })
    return () => subscription.unsubscribe()
  }, [form, updateData])

  useEffect(() => {
    const currentValues = form.getValues()
    if (deepEqual(currentValues, data)) {
      return
    }
    form.reset(data as WorkProfileStepData)
    void form.trigger()
  }, [data, form])

  useEffect(() => {
    const currentRole = form.getValues('role') ?? ''
    if (watchJobTitle && currentRole !== watchJobTitle) {
      form.setValue('role', watchJobTitle, { shouldDirty: false })
    }
  }, [form, watchJobTitle])

  const suggestedFunctions = useMemo(() => {
    const title = watchJobTitle.toLowerCase()
    if (!title) return [] as string[]
    if (title.includes('product')) return ['Product', 'Engineering', 'Design']
    if (title.includes('engineer')) return ['Engineering', 'Product', 'Design']
    if (title.includes('marketing')) return ['Marketing', 'Revenue Ops', 'Design']
    if (title.includes('customer')) return ['Customer Success', 'Revenue Ops']
    if (title.includes('ops')) return ['Revenue Ops', 'Finance', 'People']
    return []
  }, [watchJobTitle])

  const toggleSelection = (field: 'functions' | 'intents', value: string) => {
    const current = form.getValues(field) ?? []
    const next = current.includes(value) ? current.filter((item: string) => item !== value) : [...current, value]
    form.setValue(field, next, { shouldDirty: true, shouldValidate: true })
  }

  const applySuggestion = (suggestion: string) => {
    const current = form.getValues('functions') ?? []
    if (current.includes(suggestion)) return
    form.setValue('functions', [...current, suggestion], { shouldDirty: true, shouldValidate: true })
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!isSaving) {
      await completeStep({ ...values, role: values.jobTitle })
    }
  })

  return (
    <OnboardingShell
      stepId="work-profile"
      title="Your work profile"
      description="Share how your team works so we can tailor the workspace experience."
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
        <div className="space-y-2">
          <Label htmlFor="teamName">Team or department</Label>
          <Controller
            control={control}
            name="teamName"
            render={({ field }) => (
              <Input id="teamName" placeholder="Customer Experience" {...field} value={field.value ?? ''} />
            )}
          />
          {errors.teamName && <p className="text-xs text-destructive">{errors.teamName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">Your role title</Label>
          <Controller
            control={control}
            name="jobTitle"
            render={({ field }) => (
              <Input
                id="jobTitle"
                placeholder="Head of Operations"
                {...field}
                value={field.value ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  field.onChange(value)
                  form.setValue('role', value, { shouldDirty: false })
                }}
              />
            )}
          />
          {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Primary timezone</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <select
                  id="timezone"
                  {...field}
                  value={field.value ?? ''}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  <option value="" disabled>
                    Select timezone
                  </option>
                  {TIMEZONES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.timezone && <p className="text-xs text-destructive">{errors.timezone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamSize">Team size</Label>
            <Controller
              control={control}
              name="teamSize"
              render={({ field }) => (
                <select
                  id="teamSize"
                  {...field}
                  value={field.value ?? ''}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  <option value="" disabled>
                    Select team size
                  </option>
                  {TEAM_SIZES.map((option) => (
                    <option key={option} value={option}>
                      {option} people
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.teamSize && <p className="text-xs text-destructive">{errors.teamSize.message}</p>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Functions you collaborate with</Label>
            {suggestedFunctions.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Suggested:</span>
                {suggestedFunctions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FUNCTION_OPTIONS.map((option) => {
              const isSelected = watchFunctions.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSelection('functions', option)}
                >
                  {option}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label>What do you want to accomplish?</Label>
          <div className="flex flex-wrap gap-2">
            {INTENT_OPTIONS.map((option) => {
              const isSelected = watchIntents.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSelection('intents', option)}
                >
                  {option}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience">Experience in this role</Label>
          <Controller
            control={control}
            name="experience"
            render={({ field }) => (
              <select
                id="experience"
                {...field}
                value={field.value ?? ''}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                <option value="" disabled>
                  Select experience level
                </option>
                {EXPERIENCE_LEVELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.experience && <p className="text-xs text-destructive">{errors.experience.message}</p>}
        </div>

        {watchFunctions.length > 0 && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>We&apos;ll prioritise templates and automations for:</p>
            <div className="flex flex-wrap gap-2">
              {watchFunctions.map((fn) => (
                <Badge key={fn} variant="secondary">
                  {fn}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </form>
    </OnboardingShell>
  )
}
