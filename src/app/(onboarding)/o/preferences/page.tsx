'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import type { PreferencesStepData } from '@/lib/onboarding'

const defaultPreferences: PreferencesStepData = {
  weeklySummary: true,
  enableNotifications: true,
  defaultTheme: 'dark'
}

export default function PreferencesOnboardingPage() {
  const { data, completeStep, updateData, goNext, previousStep, goPrevious } = useOnboardingStep('preferences')
  const [form, setForm] = useState<PreferencesStepData>(data ?? defaultPreferences)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultPreferences, ...data }
    const serialized = JSON.stringify(merged)
    if (previousDataRef.current === serialized) return
    previousDataRef.current = serialized
    lastSyncedRef.current = serialized
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

  const handleSubmit = () => {
    // TODO: connect preference persistence to backend settings service when available.
    completeStep(form)
    goNext()
  }

  const nextLabel = useMemo(() => 'Finish onboarding', [])

  return (
    <OnboardingShell
      stepId="preferences"
      title="Workspace preferences"
      description="Choose how you want updates and the workspace to behave."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      nextLabel={nextLabel}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Weekly summaries</p>
            <p className="text-xs text-muted-foreground">Get a digest every Monday with highlights across your teams.</p>
          </div>
          <Switch
            checked={form.weeklySummary}
            onCheckedChange={(value) => setForm((prev) => ({ ...prev, weeklySummary: Boolean(value) }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enable notifications</p>
            <p className="text-xs text-muted-foreground">Receive inbox and push notifications for important updates.</p>
          </div>
          <Switch
            checked={form.enableNotifications}
            onCheckedChange={(value) => setForm((prev) => ({ ...prev, enableNotifications: Boolean(value) }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Default theme</Label>
          <select
            id="theme"
            value={form.defaultTheme}
            onChange={(event) => setForm((prev) => ({ ...prev, defaultTheme: event.target.value as PreferencesStepData['defaultTheme'] }))}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Match system</option>
          </select>
        </div>
      </div>
    </OnboardingShell>
  )
}
