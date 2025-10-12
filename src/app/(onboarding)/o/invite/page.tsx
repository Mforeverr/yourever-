'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import type { InviteStepData } from '@/lib/onboarding'
import { cn } from '@/lib/utils'

const defaultInvite: InviteStepData = {
  emails: [],
  message: '',
  defaultRole: 'member',
  statuses: []
}

export default function InviteOnboardingPage() {
  const { data, completeStep, updateData, skipStep, goNext, previousStep, goPrevious } = useOnboardingStep('invite')
  const [form, setForm] = useState<InviteStepData>(data ?? defaultInvite)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState('')

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultInvite, ...data }
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

  const inviteCount = form.emails.length

  const handleAddEmail = () => {
    const value = pendingEmail.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return
    if (form.emails.includes(value)) return

    setForm((prev) => ({ ...prev, emails: [...prev.emails, value] }))
    setPendingEmail('')
  }

  const handleRemoveEmail = (email: string) => {
    setForm((prev) => ({ ...prev, emails: prev.emails.filter((entry) => entry !== email) }))
  }

  const handleContinue = () => {
    const statuses = form.emails.map((email) => ({ email, status: 'sent' as const }))
    // TODO: replace with POST /api/invitations/bulk and track real invitation status updates.
    completeStep({
      ...form,
      statuses
    })
    goNext()
  }

  const handleSkip = () => {
    skipStep()
    goNext()
  }

  const canContinue = useMemo(() => {
    const messageLength = (form.message ?? '').trim().length
    return inviteCount > 0 || messageLength === 0
  }, [inviteCount, form.message])

  return (
    <OnboardingShell
      stepId="invite"
      title="Invite collaborators"
      description="Bring your teammates in now or skip and invite them later from the workspace."
      onNext={handleContinue}
      onBack={previousStep ? goPrevious : undefined}
      onSkip={handleSkip}
      canSkip
      isNextDisabled={!canContinue}
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
            value={form.defaultRole}
            onValueChange={(value: 'admin' | 'member') => setForm((prev) => ({ ...prev, defaultRole: value }))}
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
          <p className="text-xs text-muted-foreground">
            You can adjust roles later in workspace settings.
          </p>
        </div>

        {inviteCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.emails.map((email) => (
              <Badge
                key={email}
                variant="secondary"
                className="flex items-center gap-2"
              >
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
            value={form.message ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            rows={4}
            className={cn(
              'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary'
            )}
            placeholder="Let your teammates know why you&apos;re inviting them now."
          />
        </div>

        {form.statuses && form.statuses.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Recent invitations</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {form.statuses.map((status) => (
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
