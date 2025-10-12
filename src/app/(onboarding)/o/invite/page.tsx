'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { cn } from '@/lib/utils'

export default function InviteOnboardingPage() {
  const { data, completeStep, updateData, skipStep, previousStep, goPrevious, isSaving } = useOnboardingStep('invite')
  const [pendingEmail, setPendingEmail] = useState('')

  const inviteCount = data.emails.length

  const handleAddEmail = () => {
    const value = pendingEmail.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return
    if (data.emails.includes(value)) return

    updateData({
      ...data,
      emails: [...data.emails, value],
    })
    setPendingEmail('')
  }

  const handleRemoveEmail = (email: string) => {
    updateData({
      ...data,
      emails: data.emails.filter((entry) => entry !== email),
      statuses: data.statuses?.filter((status) => status.email !== email) ?? [],
    })
  }

  const handleContinue = async () => {
    if (isSaving) return
    const statuses = data.emails.map((email) => ({ email, status: 'sent' as const }))
    await completeStep({
      ...data,
      statuses,
    })
  }

  const handleSkip = async () => {
    if (isSaving) return
    await skipStep()
  }

  const canContinue = useMemo(() => {
    const messageLength = (data.message ?? '').trim().length
    return inviteCount > 0 || messageLength === 0
  }, [inviteCount, data.message])

  return (
    <OnboardingShell
      stepId="invite"
      title="Invite collaborators"
      description="Bring your teammates in now or skip and invite them later from the workspace."
      onNext={handleContinue}
      onBack={previousStep ? goPrevious : undefined}
      onSkip={handleSkip}
      canSkip
      isNextDisabled={!canContinue || isSaving}
      isSkipDisabled={isSaving}
      nextLabel={inviteCount > 0 ? 'Send invites' : 'Skip & continue'}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="invite-email">Add teammate emails</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="invite-email"
              value={pendingEmail}
              onChange={(event) => setPendingEmail(event.target.value)}
              placeholder="name@example.com"
              className="flex-1"
            />
            <Button type="button" onClick={handleAddEmail} variant="secondary">
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll deliver invites via email. You can resend or manage invites after onboarding.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default role for invitees</Label>
          <RadioGroup
            value={data.defaultRole}
            onValueChange={(value: 'admin' | 'member') => updateData({ ...data, defaultRole: value })}
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="member" />
              Member
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="admin" />
              Admin
            </label>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">You can adjust roles later in workspace settings.</p>
        </div>

        {inviteCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.emails.map((email) => (
              <Badge key={email} variant="secondary" className="flex items-center gap-2">
                {email}
                <button
                  type="button"
                  className="text-muted-foreground transition hover:text-destructive"
                  onClick={() => handleRemoveEmail(email)}
                  aria-label={`Remove ${email}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="invite-message">Message (optional)</Label>
          <textarea
            id="invite-message"
            value={data.message ?? ''}
            onChange={(event) => updateData({ ...data, message: event.target.value })}
            rows={4}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
            )}
            placeholder="Let your teammates know why you&apos;re inviting them now."
          />
        </div>

        {data.statuses && data.statuses.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Recent invitations</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {data.statuses.map((status) => (
                <div key={status.email} className="flex items-center justify-between">
                  <span>{status.email}</span>
                  <span className="font-medium text-foreground">{status.status === 'sent' ? 'Sent' : status.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
