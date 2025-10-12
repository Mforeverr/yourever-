'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { useCurrentUser } from '@/hooks/use-auth'
import { authStorage } from '@/lib/auth-utils'
import type { WorkspaceHubStepData } from '@/lib/onboarding'

const templates = [
  {
    id: 'product-launch',
    name: 'Product launch',
    description: 'Pre-built dashboards, standups, and launch checklists for go-to-market teams.'
  },
  {
    id: 'customer-success',
    name: 'Customer success',
    description: 'Track renewals, CSAT, and customer escalations in one hub.'
  },
  {
    id: 'agency-ops',
    name: 'Agency operations',
    description: 'Coordinate delivery, billing, and client updates across squads.'
  }
]

const defaultData: WorkspaceHubStepData = {
  choice: 'join-existing'
}

export default function WorkspaceHubOnboardingPage() {
  const { user } = useCurrentUser()
  const { data, completeStep, updateData, goNext, previousStep, goPrevious } = useOnboardingStep('workspace-hub')
  const [form, setForm] = useState<WorkspaceHubStepData>(data ?? defaultData)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultData, ...data }
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

  const userOrgs = user?.organizations ?? []
  const canContinue = useMemo(() => {
    if (form.choice === 'join-existing') {
      return userOrgs.length > 0
    }
    return Boolean(form.organizationName?.trim())
  }, [form.choice, form.organizationName, userOrgs.length])

  const handleSubmit = () => {
    if (!canContinue) return

    if (form.choice === 'join-existing' && userOrgs.length > 0) {
      const targetOrg = userOrgs[0]
      authStorage.setActiveOrganizationId(targetOrg.id)
      if (targetOrg.divisions[0]) {
        authStorage.setActiveDivisionId(targetOrg.divisions[0].id)
      }
    }

    // TODO: When backend is available, call POST /api/organizations and /api/organizations/{orgId}/divisions for "create" choice.
    completeStep({
      ...form
    })
    goNext()
  }

  return (
    <OnboardingShell
      stepId="workspace-hub"
      title="Create or join your workspace"
      description="Pick the workspace that fits you best. You can switch organizations anytime."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      isNextDisabled={!canContinue}
      nextLabel={form.choice === 'create-new' ? 'Create workspace' : 'Continue'}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">How do you want to get started?</Label>
          <RadioGroup
            value={form.choice}
            onValueChange={(value: 'join-existing' | 'create-new') => setForm((prev) => ({ ...prev, choice: value }))}
          >
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
        </div>

        {form.choice === 'create-new' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization name</Label>
              <Input
                id="org-name"
                value={form.organizationName ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, organizationName: event.target.value }))}
                placeholder="Acme Co."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="division-name">Division or team</Label>
              <Input
                id="division-name"
                value={form.divisionName ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, divisionName: event.target.value }))}
                placeholder="Product Operations"
              />
            </div>
            <div className="space-y-3">
              <Label>Select a template (optional)</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer border transition hover:border-primary/70 ${form.template === template.id ? 'border-primary/70 bg-primary/5' : 'border-border/60'}`}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        template: prev.template === template.id ? undefined : template.id
                      }))
                    }
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

        {form.choice === 'join-existing' && userOrgs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            No organizations yet. You can create one on the next screen once onboarding wraps up.
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
