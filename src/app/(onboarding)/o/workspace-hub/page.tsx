'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'
import { workspaceHubStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'

const templates = [
  {
    id: 'product-launch',
    name: 'Product launch',
    description: 'Pre-built dashboards, standups, and launch checklists for go-to-market teams.',
  },
  {
    id: 'customer-success',
    name: 'Customer success',
    description: 'Track renewals, CSAT, and customer escalations in one hub.',
  },
  {
    id: 'agency-ops',
    name: 'Agency operations',
    description: 'Coordinate delivery, billing, and client updates across squads.',
  },
]

export default function WorkspaceHubOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, previousStep, goPrevious, isSaving } = useOnboardingStep('workspace-hub')
  const form = useForm({
    resolver: zodResolver(workspaceHubStepSchema),
    mode: 'onChange',
    defaultValues: data,
  })
  const {
    control,
    formState: { isValid, errors },
  } = form

  const userOrgs = user?.organizations ?? []
  const watchChoice = form.watch('choice') ?? 'join-existing'
  const selectedTemplate = form.watch('template')

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

  const canContinue = useMemo(() => {
    if (watchChoice === 'join-existing') {
      return userOrgs.length > 0
    }
    return Boolean((form.getValues('organizationName') ?? '').trim())
  }, [form, userOrgs.length, watchChoice])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!canContinue || isSaving) return

    if (values.choice === 'join-existing' && userOrgs.length > 0) {
      const targetOrg = userOrgs[0]
      authStorage.setActiveOrganizationId(targetOrg.id)
      if (targetOrg.divisions[0]) {
        authStorage.setActiveDivisionId(targetOrg.divisions[0].id)
      }
    }

    await completeStep(values)
  })

  return (
    <OnboardingShell
      stepId="workspace-hub"
      title="Create or join your workspace"
      description="Pick the workspace that fits you best. You can switch organizations anytime."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!canContinue || !isValid || isSaving}
      nextLabel={watchChoice === 'create-new' ? 'Create workspace' : 'Continue'}
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">How do you want to get started?</Label>
          <Controller
            control={control}
            name="choice"
            render={({ field }) => (
              <RadioGroup {...field} onValueChange={(value: 'join-existing' | 'create-new') => field.onChange(value)}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                  <RadioGroupItem value="join-existing" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Join an existing organization</p>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll take you to the organization list so you can start collaborating right away.
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
                  <RadioGroupItem value="create-new" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Create a new organization</p>
                    <p className="text-xs text-muted-foreground">
                      Spin up a fresh workspace, invite teammates, and optionally start from a template.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            )}
          />
        </div>

        {watchChoice === 'create-new' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Controller
                control={control}
                name="organizationName"
                render={({ field }) => (
                  <Input id="org-name" placeholder="Acme Co." {...field} value={field.value ?? ''} />
                )}
              />
              {errors.organizationName && (
                <p className="text-xs text-destructive">{errors.organizationName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="division-name">Division or team</Label>
              <Controller
                control={control}
                name="divisionName"
                render={({ field }) => (
                  <Input id="division-name" placeholder="Product Operations" {...field} value={field.value ?? ''} />
                )}
              />
            </div>
            <div className="space-y-3">
              <Label>Select a template (optional)</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer border transition hover:border-primary/70 ${
                      selectedTemplate === template.id ? 'border-primary/70 bg-primary/5' : 'border-border/60'
                    }`}
                    onClick={() => {
                      const nextValue = selectedTemplate === template.id ? undefined : template.id
                      form.setValue('template', nextValue, { shouldDirty: true })
                    }}
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {watchChoice === 'join-existing' && userOrgs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            No organizations yet. You can create one on the next screen once onboarding wraps up.
          </div>
        )}
      </form>
    </OnboardingShell>
  )
}
