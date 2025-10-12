'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'

export default function PreferencesOnboardingPage() {
  const { data, completeStep, updateData, previousStep, goPrevious, isSaving } = useOnboardingStep('preferences')

  const handleSubmit = async () => {
    if (isSaving) return
    await completeStep(data)
  }

  const nextLabel = useMemo(() => 'Finish onboarding', [])

  return (
    <OnboardingShell
      stepId="preferences"
      title="Workspace preferences"
      description="Choose how you want updates and the workspace to behave."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={isSaving}
      nextLabel={nextLabel}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Weekly summaries</p>
            <p className="text-xs text-muted-foreground">Get a digest every Monday with highlights across your teams.</p>
          </div>
          <Switch
            checked={data.weeklySummary}
            onCheckedChange={(value) => updateData({ ...data, weeklySummary: Boolean(value) })}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Enable notifications</p>
            <p className="text-xs text-muted-foreground">Receive inbox and push notifications for important updates.</p>
          </div>
          <Switch
            checked={data.enableNotifications}
            onCheckedChange={(value) => updateData({ ...data, enableNotifications: Boolean(value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme">Default theme</Label>
          <select
            id="theme"
            value={data.defaultTheme}
            onChange={(event) => updateData({ ...data, defaultTheme: event.target.value as typeof data.defaultTheme })}
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
