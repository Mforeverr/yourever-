'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import type { ProfileStepData } from '@/lib/onboarding'
import { useCurrentUser } from '@/hooks/use-auth'

const ROLE_OPTIONS = ['Founder', 'Executive', 'Manager', 'Individual Contributor', 'Operations', 'Other']

export default function ProfileOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, previousStep, goPrevious, isSaving } = useOnboardingStep('profile')
  const hasPrefilledRef = useRef(false)

  useEffect(() => {
    if (!user) return
    if (hasPrefilledRef.current) return
    if (data.firstName || data.lastName) {
      hasPrefilledRef.current = true
      return
    }

    updateData({
      ...data,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    })
    hasPrefilledRef.current = true
  }, [user, data, updateData])

  const isValid = useMemo(() => {
    return Boolean(data.firstName.trim()) && Boolean(data.lastName.trim()) && Boolean(data.role.trim())
  }, [data.firstName, data.lastName, data.role])

  const handleInputChange = (field: keyof ProfileStepData) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    updateData({
      ...data,
      [field]: event.target.value,
    })
  }

  const handleSubmit = async () => {
    if (!isValid || isSaving) return
    await completeStep(data)
  }

  return (
    <OnboardingShell
      stepId="profile"
      title="Set up your profile"
      description="Tell us who you are so teammates know who just joined."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!isValid || isSaving}
    >
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={handleInputChange('firstName')}
              placeholder="Ada"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={handleInputChange('lastName')}
              placeholder="Lovelace"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Primary role</Label>
          <select
            id="role"
            value={data.role}
            onChange={handleInputChange('role')}
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
            value={data.avatarUrl ?? ''}
            onChange={handleInputChange('avatarUrl')}
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
