'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import {
  Slack,
  Github,
  Workflow,
  NotebookText,
  Zap,
  PanelsTopLeft,
  FileText,
  Cloud,
} from 'lucide-react'

const TOOL_OPTIONS = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Sync channels and automate standup recaps.',
    icon: Slack,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Bring pull requests and deployments into one view.',
    icon: Github,
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Link issues and sprint progress to your workspace.',
    icon: PanelsTopLeft,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Embed docs and sync meeting notes automatically.',
    icon: NotebookText,
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Mirror projects and tasks without duplicate updates.',
    icon: Workflow,
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Bring in issue timelines and cycle analytics.',
    icon: Zap,
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    description: 'Attach docs and proposals without context switching.',
    icon: Cloud,
  },
  {
    id: 'docs',
    name: 'Confluence / Docs',
    description: 'Stay aligned with synced pages and decision logs.',
    icon: FileText,
  },
]

type IntegrationStatus = 'not-started' | 'in-progress' | 'connected'

export default function ToolsOnboardingPage() {
  const { data, completeStep, updateData, skipStep, previousStep, goPrevious, isSaving } = useOnboardingStep('tools')

  const hasSelection = useMemo(
    () => data.tools.length > 0 || Boolean(data.customTool?.trim()),
    [data.customTool, data.tools.length],
  )

  const handleToggleTool = (toolId: string) => {
    const isSelected = data.tools.includes(toolId)
    const nextTools = isSelected ? data.tools.filter((item) => item !== toolId) : [...data.tools, toolId]

    const existingIntegrations = data.integrations ?? []
    const integrationExists = existingIntegrations.some((integration) => integration.id === toolId)
    const toolDefinition = TOOL_OPTIONS.find((option) => option.id === toolId)

    const nextIntegrations = isSelected
      ? existingIntegrations.filter((integration) => integration.id !== toolId)
      : integrationExists
      ? existingIntegrations
      : [
          ...existingIntegrations,
          {
            id: toolId,
            name: toolDefinition?.name ?? toolId,
            status: 'not-started' as IntegrationStatus,
          },
        ]

    updateData({
      ...data,
      tools: nextTools,
      integrations: nextIntegrations,
    })
  }

  const handleIntegrationStatus = (toolId: string, status: IntegrationStatus) => {
    const integrations = (data.integrations ?? []).map((integration) =>
      integration.id === toolId ? { ...integration, status } : integration,
    )
    updateData({
      ...data,
      integrations,
    })
  }

  const handleSubmit = async () => {
    if (isSaving) return
    await completeStep({
      ...data,
      tools: data.tools,
      customTool: data.customTool?.trim() ?? '',
      integrations: data.integrations ?? [],
    })
  }

  const handleSkip = async () => {
    if (isSaving) return
    await skipStep()
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
      isNextDisabled={isSaving}
      isSkipDisabled={isSaving}
      nextLabel={hasSelection ? 'Continue' : 'Skip & continue'}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOL_OPTIONS.map((tool) => {
            const Icon = tool.icon
            const checked = data.tools.includes(tool.id)
            const integration = (data.integrations ?? []).find((entry) => entry.id === tool.id)
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
                    onClick={() => handleToggleTool(tool.id)}
                  >
                    {checked ? 'Selected' : 'Select'}
                  </Button>
                </CardHeader>
                {checked && (
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll walk you through authentication after onboarding. Mark anything you want to set up now.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">Status:</span>
                      <div className="flex gap-2">
                        {(['not-started', 'in-progress', 'connected'] as IntegrationStatus[]).map((statusOption) => (
                          <Button
                            key={statusOption}
                            type="button"
                            variant={integration?.status === statusOption ? 'default' : 'outline'}
                            size="xs"
                            onClick={() => handleIntegrationStatus(tool.id, statusOption)}
                          >
                            {statusOption.replace('-', ' ')}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        <div className="space-y-3">
          <Label htmlFor="customTool">Is there any other tool we should know about?</Label>
          <Input
            id="customTool"
            value={data.customTool ?? ''}
            onChange={(event) => updateData({ ...data, customTool: event.target.value })}
            placeholder="Tool name"
          />
        </div>
      </div>
    </OnboardingShell>
  )
}
