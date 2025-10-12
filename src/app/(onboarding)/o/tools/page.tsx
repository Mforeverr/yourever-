'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { useOnboardingStep } from '@/hooks/use-onboarding-step'
import { toolsStepSchema } from '@/lib/onboarding-schemas'
import { deepEqual } from '@/lib/object-utils'
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
  const form = useForm({
    resolver: zodResolver(toolsStepSchema),
    mode: 'onChange',
    defaultValues: data,
  })
  const {
    control,
    formState: { isValid },
  } = form
  const selectedTools = form.watch('tools') ?? []
  const customTool = form.watch('customTool') ?? ''
  const integrations = form.watch('integrations') ?? []

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

  const hasSelection = useMemo(
    () => selectedTools.length > 0 || Boolean(customTool.trim()),
    [customTool, selectedTools.length],
  )

  const handleToggleTool = (toolId: string) => {
    const currentTools = form.getValues('tools') ?? []
    const isSelected = currentTools.includes(toolId)
    const nextTools = isSelected
      ? currentTools.filter((item: string) => item !== toolId)
      : [...currentTools, toolId]

    const currentIntegrations = form.getValues('integrations') ?? []
    const integrationExists = currentIntegrations.some((integration: { id: string }) => integration.id === toolId)
    const toolDefinition = TOOL_OPTIONS.find((option) => option.id === toolId)

    const nextIntegrations = isSelected
      ? currentIntegrations.filter((integration: { id: string }) => integration.id !== toolId)
      : integrationExists
      ? currentIntegrations
      : [
          ...currentIntegrations,
          {
            id: toolId,
            name: toolDefinition?.name ?? toolId,
            status: 'not-started' as IntegrationStatus,
          },
        ]

    form.setValue('tools', nextTools, { shouldDirty: true, shouldValidate: true })
    form.setValue('integrations', nextIntegrations, { shouldDirty: true })
  }

  const handleIntegrationStatus = (toolId: string, status: IntegrationStatus) => {
    const currentIntegrations = form.getValues('integrations') ?? []
    const nextIntegrations = currentIntegrations.map((integration: { id: string; status: IntegrationStatus }) =>
      integration.id === toolId ? { ...integration, status } : integration,
    )
    form.setValue('integrations', nextIntegrations, { shouldDirty: true })
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    if (isSaving) return
    await completeStep({
      ...values,
      tools: values.tools,
      customTool: values.customTool?.trim() ?? '',
      integrations: values.integrations ?? [],
    })
  })

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
      isNextDisabled={!isValid || isSaving}
      isSkipDisabled={isSaving}
      nextLabel={hasSelection ? 'Continue' : 'Skip & continue'}
    >
      <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOL_OPTIONS.map((tool) => {
            const Icon = tool.icon
            const checked = selectedTools.includes(tool.id)
            const integration = integrations.find((entry: { id: string }) => entry.id === tool.id)
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
          <Controller
            control={control}
            name="customTool"
            render={({ field }) => (
              <Input id="customTool" placeholder="Tool name" {...field} value={field.value ?? ''} />
            )}
          />
        </div>
      </form>
    </OnboardingShell>
  )
}
