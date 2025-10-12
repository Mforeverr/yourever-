'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useCurrentUser } from '@/hooks/use-auth'
import type { WorkProfileStepData } from '@/lib/onboarding'

const TIMEZONES = ['UTC−08:00 (PT)', 'UTC−05:00 (ET)', 'UTC±00:00', 'UTC+01:00', 'UTC+05:30', 'UTC+08:00']
const TEAM_SIZES = ['1-5', '6-15', '16-50', '51-200', '200+']
const FUNCTION_OPTIONS = ['Product', 'Engineering', 'Design', 'Revenue Ops', 'Customer Success', 'Marketing', 'Finance', 'People']
const INTENT_OPTIONS = ['Plan projects', 'Run meetings', 'Coordinate async work', 'Ship releases', 'Track goals', 'Support customers']
const EXPERIENCE_LEVELS = ['New to role', '1-3 years', '4-7 years', '8+ years']

export default function WorkProfileOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, previousStep, goPrevious, isSaving } = useOnboardingStep('work-profile')
  const hasPrefilledRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    if (data.teamName || data.jobTitle) {
      hasPrefilledRef.current = true
      return
    }

    updateData({
      ...data,
      teamName: user.organizations[0]?.name ?? '',
      jobTitle: user.role ?? '',
      role: user.role ?? '',
    })
    hasPrefilledRef.current = true
  }, [user, data, updateData])

  const suggestedFunctions = useMemo(() => {
    const title = data.jobTitle.toLowerCase()
    if (!title) return [] as string[]
    if (title.includes('product')) return ['Product', 'Engineering', 'Design']
    if (title.includes('engineer')) return ['Engineering', 'Product', 'Design']
    if (title.includes('marketing')) return ['Marketing', 'Revenue Ops', 'Design']
    if (title.includes('customer')) return ['Customer Success', 'Revenue Ops']
    if (title.includes('ops')) return ['Revenue Ops', 'Finance', 'People']
    return []
  }, [data.jobTitle])

  const isValid = useMemo(() => {
    return (
      Boolean(data.teamName.trim()) &&
      Boolean(data.jobTitle.trim()) &&
      Boolean(data.timezone) &&
      Boolean(data.teamSize) &&
      data.functions.length > 0 &&
      data.intents.length > 0 &&
      Boolean(data.experience)
    )
  }, [data.experience, data.functions.length, data.intents.length, data.jobTitle, data.teamName, data.teamSize, data.timezone])

  const handleInputChange = (field: keyof WorkProfileStepData) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    updateData({
      ...data,
      [field]: event.target.value,
    })
  }

  const toggleSelection = (field: 'functions' | 'intents', value: string) => {
    const current = data[field]
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    updateData({
      ...data,
      [field]: next,
    })
  }

  const applySuggestion = (suggestion: string) => {
    if (data.functions.includes(suggestion)) return
    updateData({
      ...data,
      functions: [...data.functions, suggestion],
    })
  }

  const handleJobTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    updateData({
      ...data,
      jobTitle: value,
      role: value,
    })
  }

  const handleSubmit = async () => {
    if (!isValid || isSaving) return
    await completeStep({
      ...data,
      role: data.jobTitle,
    })
  }

  return (
    <OnboardingShell
      stepId="work-profile"
      title="Your work profile"
      description="Share how your team works so we can tailor the workspace experience."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid || isSaving}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team or department</Label>
          <Input
            id="teamName"
            value={data.teamName}
            onChange={handleInputChange('teamName')}
            placeholder="Customer Experience"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">Your role title</Label>
          <Input
            id="jobTitle"
            value={data.jobTitle}
            onChange={handleJobTitleChange}
            placeholder="Head of Operations"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Primary timezone</Label>
            <select
              id="timezone"
              value={data.timezone}
              onChange={handleInputChange('timezone')}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamSize">Team size</Label>
            <select
              id="teamSize"
              value={data.teamSize}
              onChange={handleInputChange('teamSize')}
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
              const isSelected = data.functions.includes(option)
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
              const isSelected = data.intents.includes(option)
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
          <select
            id="experience"
            value={data.experience}
            onChange={handleInputChange('experience')}
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
        </div>

        {data.functions.length > 0 && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>We&apos;ll prioritise templates and automations for:</p>
            <div className="flex flex-wrap gap-2">
              {data.functions.map((fn) => (
                <Badge key={fn} variant="secondary">
                  {fn}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
