'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { cn } from '@/lib/utils'
import { inviteStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'

export default function InviteOnboardingPage() {
  const { data, completeStep, updateData, skipStep, previousStep, goPrevious, isSaving } = useOnboardingStep('invite')
  const [pendingEmail, setPendingEmail] = useState('')
  const form = useForm({
    resolver: zodResolver(inviteStepSchema),
    mode: 'onChange',
    defaultValues: data,
  })
  const {
    control,
    formState: { isValid, errors },
  } = form

  useEffect(() => {
    void form.trigger()
  }, [form])

  useEffect(() => {
    const subscription = form.watch((values) => {
      updateData(values as typeof data)
    })
    return () => subscription.unsubscribe()
  }, [form, updateData])

  useEffect(() => {
    const currentValues = form.getValues()
    if (deepEqual(currentValues, data)) {
      return
    }
    form.reset(data)
    void form.trigger()
  }, [data, form])

  const inviteCount = (form.watch('emails') ?? []).length

  const handleAddEmail = () => {
    const value = pendingEmail.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      form.setError('emails', { type: 'manual', message: 'Enter a valid email address' })
      return
    }

    const currentEmails = form.getValues('emails') ?? []
    if (currentEmails.includes(value)) {
      form.setError('emails', { type: 'manual', message: 'This email is already added' })
      return
    }

    const nextEmails = [...currentEmails, value]
    form.setValue('emails', nextEmails, { shouldDirty: true, shouldValidate: true })
    form.clearErrors('emails')
    setPendingEmail('')
  }

  const handleRemoveEmail = (email: string) => {
    const currentEmails = form.getValues('emails') ?? []
    const nextEmails = currentEmails.filter((entry: string) => entry !== email)
    const currentStatuses = form.getValues('statuses') ?? []
    const nextStatuses = currentStatuses.filter((status: { email: string }) => status.email !== email)
    form.setValue('emails', nextEmails, { shouldDirty: true, shouldValidate: true })
    form.setValue('statuses', nextStatuses, { shouldDirty: true })
  }

  const handleContinue = form.handleSubmit(async (values) => {
    if (isSaving) return
    const statuses = values.emails.map((email) => ({ email, status: 'sent' as const }))
    await completeStep({
      ...values,
      statuses,
    })
  })

  const handleSkip = async () => {
    if (isSaving) return
    await skipStep()
  }

  const canContinue = useMemo(() => {
    const messageLength = (form.getValues('message') ?? '').trim().length
    return inviteCount > 0 || messageLength === 0
  }, [form, inviteCount])

  return (
    <OnboardingShell
      stepId="invite"
      title="Invite collaborators"
      description="Bring your teammates in now or skip and invite them later from the workspace."
      onNext={handleContinue}
      onBack={previousStep ? goPrevious : undefined}
      onSkip={handleSkip}
      canSkip
      isNextDisabled={!canContinue || !isValid || isSaving}
      isSkipDisabled={isSaving}
      nextLabel={inviteCount > 0 ? 'Send invites' : 'Skip & continue'}
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
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
          {errors.emails && <p className="text-xs text-destructive">{errors.emails.message}</p>}
          <p className="text-xs text-muted-foreground">
            We&apos;ll deliver invites via email. You can resend or manage invites after onboarding.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default role for invitees</Label>
          <Controller
            control={control}
            name="defaultRole"
            render={({ field }) => (
              <RadioGroup
                {...field}
                onValueChange={(value: 'admin' | 'member') => field.onChange(value)}
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
            )}
          />
          <p className="text-xs text-muted-foreground">You can adjust roles later in workspace settings.</p>
        </div>

        {inviteCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {(form.watch('emails') ?? []).map((email: string) => (
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
          <Controller
            control={control}
            name="message"
            render={({ field }) => (
              <textarea
                id="invite-message"
                {...field}
                value={field.value ?? ''}
                rows={4}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
                )}
                placeholder="Let your teammates know why you&apos;re inviting them now."
              />
            )}
          />
          {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
        </div>

        {(form.watch('statuses') ?? []).length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Recent invitations</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {(form.watch('statuses') ?? []).map((status: { email: string; status: string }) => (
                <div key={status.email} className="flex items-center justify-between">
                  <span>{status.email}</span>
                  <span className="font-medium text-foreground">{status.status === 'sent' ? 'Sent' : status.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </OnboardingShell>
  )
}
