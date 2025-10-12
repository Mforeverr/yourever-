'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import type { ProfileStepData } from '@/lib/onboarding'
import { useCurrentUser } from '@/hooks/use-auth'

const ROLE_OPTIONS = ['Founder', 'Executive', 'Manager', 'Individual Contributor', 'Operations', 'Other']

const defaultProfile: ProfileStepData = {
  firstName: '',
  lastName: '',
  role: '',
  avatarUrl: ''
}

export default function ProfileOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, goNext, previousStep, goPrevious } = useOnboardingStep('profile')
  const [form, setForm] = useState<ProfileStepData>(data ?? defaultProfile)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)
  const hasPrefilledRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    setForm((prev) => {
      const next = {
        ...prev,
        firstName: prev.firstName || user.firstName || '',
        lastName: prev.lastName || user.lastName || '',
      }
      if (prev.firstName === next.firstName && prev.lastName === next.lastName) {
        return prev
      }
      hasPrefilledRef.current = true
      return next
    })
  }, [user])

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultProfile, ...data }
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

  const isValid = useMemo(() => {
    return Boolean(form.firstName.trim()) && Boolean(form.lastName.trim()) && Boolean(form.role.trim())
  }, [form.firstName, form.lastName, form.role])

  const handleSubmit = () => {
    if (!isValid) return
    // TODO: Replace mock persistence with real profile mutation when backend is available.
    completeStep(form)
    goNext()
  }

  return (
    <OnboardingShell
      stepId="profile"
      title="Set up your profile"
      description="Tell us who you are so teammates know who just joined."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              placeholder="Ada"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              placeholder="Lovelace"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Primary role</Label>
          <select
            id="role"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Input
            id="avatarUrl"
            value={form.avatarUrl ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll use this image in the workspace. Upload support will hook into the real API later.
          </p>
        </div>
      </div>
    </OnboardingShell>
  )
}
