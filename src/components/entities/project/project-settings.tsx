'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProjectEnvironment,
  useProjectSettings,
  useUpdateProjectSettings,
} from "@/modules/projects"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectSettingsProps {
  projectId: string
}

const messages = enMessages

export function ProjectSettings({ projectId }: ProjectSettingsProps) {
  const { toast } = useToast()
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()

  const settingsQuery = useProjectSettings(projectId)
  const [localSettings, setLocalSettings] = useState(settingsQuery.data?.settings)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    setLocalSettings(settingsQuery.data?.settings)
    setIsDirty(false)
  }, [settingsQuery.data?.settings])

  const updateSettings = useUpdateProjectSettings(projectId, {
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: projectQueryKeys.settings(scope, projectId) })
      const previous = queryClient.getQueryData(projectQueryKeys.settings(scope, projectId))
      const merged = {
        projectId,
        settings: {
          ...localSettings,
          ...payload,
          featureFlags: payload.featureFlags ?? localSettings?.featureFlags ?? [],
        },
      }
      queryClient.setQueryData(projectQueryKeys.settings(scope, projectId), merged)
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectQueryKeys.settings(scope, projectId), context.previous)
      }
      toast({
        variant: "destructive",
        title: "Unable to save settings",
      })
    },
    onSuccess: () => {
      toast({
        title: messages[PROJECT_I18N_KEYS.feedback.settingsSaved],
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.settings(scope, projectId) })
    },
  })

  const handleToggle = (key: "allowGuests" | "notificationsEnabled" | "autoArchiveCompletedTasks") => (value: boolean) => {
    setLocalSettings((prev) => {
      const next = {
        ...(prev ?? {
          allowGuests: false,
          notificationsEnabled: true,
          autoArchiveCompletedTasks: false,
          featureFlags: [],
        }),
        [key]: value,
      }
      setIsDirty(true)
      return next
    })
  }

  const handleSave = () => {
    if (!localSettings) return
    updateSettings.mutate(localSettings)
    setIsDirty(false)
  }

  if (settingsQuery.isLoading || !localSettings) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{messages[PROJECT_I18N_KEYS.settings.title]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{messages[PROJECT_I18N_KEYS.settings.title]}</CardTitle>
          <CardDescription>{messages[PROJECT_I18N_KEYS.settings.description]}</CardDescription>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || updateSettings.isPending}>
          {messages[PROJECT_I18N_KEYS.settings.saveButton]}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">
              {messages[PROJECT_I18N_KEYS.settings.notificationsToggle]}
            </p>
            <p className="text-xs text-muted-foreground">
              {messages[PROJECT_I18N_KEYS.settings.notificationsHint]}
            </p>
          </div>
          <Switch
            checked={localSettings.notificationsEnabled}
            onCheckedChange={handleToggle("notificationsEnabled")}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">
              {messages[PROJECT_I18N_KEYS.settings.guestAccessToggle]}
            </p>
            <p className="text-xs text-muted-foreground">
              {messages[PROJECT_I18N_KEYS.settings.guestAccessHint]}
            </p>
          </div>
          <Switch checked={localSettings.allowGuests} onCheckedChange={handleToggle("allowGuests")} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">
              {messages[PROJECT_I18N_KEYS.settings.autoArchiveToggle]}
            </p>
            <p className="text-xs text-muted-foreground">
              {messages[PROJECT_I18N_KEYS.settings.autoArchiveHint]}
            </p>
          </div>
          <Switch
            checked={localSettings.autoArchiveCompletedTasks}
            onCheckedChange={handleToggle("autoArchiveCompletedTasks")}
          />
        </div>
      </CardContent>
    </Card>
  )
}
