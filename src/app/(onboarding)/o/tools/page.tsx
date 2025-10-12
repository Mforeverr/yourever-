'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import type { ToolsStepData } from '@/lib/onboarding'
import {
  Slack,
  Github,
  Workflow,
  NotebookText,
  Zap,
  PanelsTopLeft,
  FileText,
  Cloud
} from 'lucide-react'

const TOOL_OPTIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Sync channels and automate standup recaps.',
    icon: Slack
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Bring pull requests and deployments into one view.',
    icon: Github
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Link issues and sprint progress to your workspace.',
    icon: PanelsTopLeft
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Embed docs and sync meeting notes automatically.',
    icon: NotebookText
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Mirror projects and tasks without duplicate updates.',
    icon: Workflow
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Bring in issue timelines and cycle analytics.',
    icon: Zap
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Attach docs and proposals without context switching.',
    icon: Cloud
  },
  {
    id: 'docs',
    name: 'Confluence / Docs',
    description: 'Stay aligned with synced pages and decision logs.',
    icon: FileText
  }
]

const defaultTools: ToolsStepData = {
  tools: [],
  customTool: '',
  integrations: []
}

type IntegrationStatus = 'not-started' | 'in-progress' | 'connected'

export default function ToolsOnboardingPage() {
  const { data, completeStep, updateData, skipStep, goNext, previousStep, goPrevious } = useOnboardingStep('tools')
  const [form, setForm] = useState<ToolsStepData>(data ?? defaultTools)
  const previousDataRef = useRef<string | null>(null)
  const lastSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    const merged = { ...defaultTools, ...data }
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

  const handleToggleTool = (toolId: string, checked: boolean) => {
    setForm((prev) => {
      const nextTools = checked
        ? Array.from(new Set([...prev.tools, toolId]))
        : prev.tools.filter((item) => item !== toolId)

      const existingIntegrations = prev.integrations ?? []
      const integrationExists = existingIntegrations.some((integration) => integration.id === toolId)

      const toolDefinition = TOOL_OPTIONS.find((option) => option.id === toolId)
      const nextIntegrations = checked
        ? integrationExists
          ? existingIntegrations
          : [
              ...existingIntegrations,
              {
                id: toolId,
                name: toolDefinition?.name ?? toolId,
                status: 'not-started' as IntegrationStatus
              }
            ]
        : existingIntegrations.filter((integration) => integration.id !== toolId)

      return { ...prev, tools: nextTools, integrations: nextIntegrations }
    })
  }

  const hasSelection = useMemo(
    () => form.tools.length > 0 || Boolean(form.customTool?.trim()),
    [form.customTool, form.tools]
  )

  const handleIntegrationStatus = (toolId: string, status: IntegrationStatus) => {
    setForm((prev) => ({
      ...prev,
      integrations: (prev.integrations ?? []).map((integration) =>
        integration.id === toolId ? { ...integration, status } : integration
      )
    }))
  }

  const handleSubmit = () => {
    // Optional step: allow advancing even without selection
    completeStep({
      ...form,
      tools: form.tools,
      customTool: form.customTool?.trim() ?? '',
      integrations: form.integrations ?? []
    })
    goNext()
  }

  const handleSkip = () => {
    // TODO: Swap this mock skip logic with backend signal when onboarding API is in place.
    skipStep()
    goNext()
  }

  return (
    <OnboardingShell
      stepId="tools"
      title="Tools your team already uses"
      description="We&apos;ll personalise integrations based on what you select here."
      onNext={handleSubmit}
      onBack={previousStep ? goPrevious : undefined}
      onSkip={handleSkip}
      canSkip
      nextLabel={hasSelection ? 'Continue' : 'Skip & continue'}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOL_OPTIONS.map((tool) => {
            const Icon = tool.icon
            const checked = form.tools.includes(tool.id)
            const integration = form.integrations?.find((entry) => entry.id === tool.id)
            return (
              <Card
                key={tool.id}
                className={
                  'border transition hover:border-primary/70 ' +
                  (checked ? 'border-primary/70 bg-primary/5' : 'border-border/60')
                }
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle className="text-base font-semibold">{tool.name}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={checked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleTool(tool.id, !checked)}
                  >
                    {checked ? 'Selected' : 'Select'}
                  </Button>
                </CardHeader>
                {checked && (
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll walk you through authentication after onboarding. Mark anything you want to set up now.
                    </p>
                    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                      <span>
                        Status: {integration?.status === 'connected' ? 'Connected' : integration?.status === 'in-progress' ? 'In progress' : 'Not started'}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIntegrationStatus(tool.id, 'in-progress')}
                        >
                          Set up now
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleIntegrationStatus(tool.id, 'not-started')}
                        >
                          Later
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customTool">Other tools</Label>
          <Input
            id="customTool"
            value={form.customTool ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, customTool: event.target.value }))}
            placeholder="Add other tools you rely on"
          />
          <p className="text-xs text-muted-foreground">
            We&apos;ll reach out to connect these once integrations are available.
          </p>
        </div>
      </div>
    </OnboardingShell>
  )
}
