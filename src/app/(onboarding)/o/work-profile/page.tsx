'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

const defaultWorkProfile: WorkProfileStepData = {
  teamName: '',
  jobTitle: '',
  timezone: '',
  teamSize: '',
  functions: [],
  intents: [],
  experience: '',
  role: ''
}

export default function WorkProfileOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, goNext, previousStep, goPrevious } = useOnboardingStep('work-profile')
  const [form, setForm] = useState<WorkProfileStepData>(data ?? defaultWorkProfile)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)
  const hasPrefilledRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    setForm((prev) => {
      const next = {
        ...prev,
        teamName: prev.teamName || (user.organizations[0]?.name ?? ''),
        jobTitle: prev.jobTitle || (user.role ?? ''),
      }
      if (prev.teamName === next.teamName && prev.jobTitle === next.jobTitle) {
        return prev
      }
      hasPrefilledRef.current = true
      return next
    })
  }, [user])

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultWorkProfile, ...data }
    const serialized = JSON.stringify(merged)
    if (previousDataRef.current === serialized) return
    previousDataRef.current = serialized
    lastSyncedRef.current = serialized
    hasPrefilledRef.current = true
    setForm((prev) => {
      if (JSON.stringify(prev) === serialized) {
        return prev
      }
      return merged
    })
  }, [data])

  useEffect(() => {
    const serialized = JSON.stringify(form)
    if (lastSyncedRef.current === serialized) return
    lastSyncedRef.current = serialized
    updateData(form)
  }, [form, updateData])

  const suggestedFunctions = useMemo(() => {
    const title = form.jobTitle.toLowerCase()
    if (!title) return []
    if (title.includes('product')) return ['Product', 'Engineering', 'Design']
    if (title.includes('engineer')) return ['Engineering', 'Product', 'Design']
    if (title.includes('marketing')) return ['Marketing', 'Revenue Ops', 'Design']
    if (title.includes('customer')) return ['Customer Success', 'Revenue Ops']
    if (title.includes('ops')) return ['Revenue Ops', 'Finance', 'People']
    return []
  }, [form.jobTitle])

  const isValid = useMemo(() => {
    return (
      Boolean(form.teamName.trim()) &&
      Boolean(form.jobTitle.trim()) &&
      Boolean(form.timezone) &&
      Boolean(form.teamSize) &&
      form.functions.length > 0 &&
      form.intents.length > 0 &&
      Boolean(form.experience)
    )
  }, [form.experience, form.functions.length, form.intents.length, form.jobTitle, form.teamName, form.teamSize, form.timezone])

  const toggleSelection = (list: string[], value: string) => {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  const applySuggestion = (suggestion: string) => {
    setForm((prev) => ({ ...prev, functions: Array.from(new Set([...prev.functions, suggestion])) }))
  }

  const handleSubmit = () => {
    if (!isValid) return
    // TODO: Wire this submission to the real onboarding profile endpoint when available.
    completeStep({
      ...form,
      role: form.jobTitle
    })
    goNext()
  }

  return (
    <OnboardingShell
      stepId="work-profile"
      title="Your work profile"
      description="Share how your team works so we can tailor the workspace experience."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <Label htmlFor="teamName">Team or department</Label>
          <Input
            id="teamName"
            value={form.teamName}
            onChange={(event) => setForm((prev) => ({ ...prev, teamName: event.target.value }))}
            placeholder="Customer Experience"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">Your role title</Label>
          <Input
            id="jobTitle"
            value={form.jobTitle}
            onChange={(event) => {
              const value = event.target.value
              setForm((prev) => ({ ...prev, jobTitle: value, role: value }))
            }}
            placeholder="Head of Operations"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="timezone">Primary timezone</Label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
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
              value={form.teamSize}
              onChange={(event) => setForm((prev) => ({ ...prev, teamSize: event.target.value }))}
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
              const isSelected = form.functions.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, functions: toggleSelection(prev.functions, option) }))}
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
              const isSelected = form.intents.includes(option)
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, intents: toggleSelection(prev.intents, option) }))}
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
            value={form.experience}
            onChange={(event) => setForm((prev) => ({ ...prev, experience: event.target.value }))}
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

        {form.functions.length > 0 && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>We&apos;ll prioritise templates and automations for:</p>
            <div className="flex flex-wrap gap-2">
              {form.functions.map((fn) => (
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
