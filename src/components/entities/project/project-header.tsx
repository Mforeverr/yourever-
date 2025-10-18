'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useEffect, useMemo, useState } from "react"
import { Pencil, Check, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  type ProjectDetailResponse,
  type ProjectMetrics,
  type ProjectPriority,
  type ProjectStatus,
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProjectEnvironment,
  useUpdateProject,
} from "@/modules/projects"
import { ProjectHeader as ProjectSummaryCard } from "@/components/ui/project-header"
import { cn } from "@/lib/utils"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

const statusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
]

const priorityOptions: Array<{ value: ProjectPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

const toHyphenStatus = (status: ProjectStatus): "planning" | "active" | "on-hold" | "completed" | "archived" => {
  if (status === "on_hold") return "on-hold"
  return status as Exclude<ProjectStatus, "on_hold">
}

const messages = enMessages

interface InlineStatusSelectorProps {
  value: ProjectStatus
  onChange: (value: ProjectStatus) => void
  disabled?: boolean
}

function InlineStatusSelector({ value, onChange, disabled }: InlineStatusSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {statusOptions.map((option) => (
        <Badge
          key={option.value}
          variant={option.value === value ? "default" : "outline"}
          className={cn(
            "cursor-pointer capitalize",
            option.value === value ? "bg-brand text-brand-foreground" : "hover:bg-muted"
          )}
          onClick={() => !disabled && onChange(option.value)}
        >
          {option.label}
        </Badge>
      ))}
    </div>
  )
}

interface InlinePrioritySelectorProps {
  value?: ProjectPriority
  onChange: (value: ProjectPriority) => void
  disabled?: boolean
}

function InlinePrioritySelector({ value, onChange, disabled }: InlinePrioritySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {priorityOptions.map((option) => (
        <Badge
          key={option.value}
          variant={option.value === value ? "default" : "outline"}
          className={cn(
            "cursor-pointer capitalize",
            option.value === value ? "bg-orange-500 text-white" : "hover:bg-muted"
          )}
          onClick={() => !disabled && onChange(option.value)}
        >
          {option.label}
        </Badge>
      ))}
    </div>
  )
}

interface ProjectHeaderProps {
  project: ProjectDetailResponse["project"]
}

interface UpdateProjectContext {
  previous?: ProjectDetailResponse
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const { toast } = useToast()
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(project.name)
  const [statusDraft, setStatusDraft] = useState<ProjectStatus>(project.status)
  const [priorityDraft, setPriorityDraft] = useState<ProjectPriority | undefined>(project.priority)

  useEffect(() => {
    setNameDraft(project.name)
    setStatusDraft(project.status)
    setPriorityDraft(project.priority)
  }, [project.name, project.status, project.priority])

  const updateProject = useUpdateProject(project.id, {
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: projectQueryKeys.detail(scope, project.id) })
      const previous = queryClient.getQueryData<ProjectDetailResponse>(projectQueryKeys.detail(scope, project.id))

      if (previous) {
        // Create updated project by spreading all non-metrics properties from payload
        const { metrics: payloadMetrics, ...otherPayloadProperties } = payload
        let updatedProject = {
          ...previous.project,
          ...otherPayloadProperties,
          updatedAt: new Date().toISOString(),
        }

        // Handle metrics merge separately if present in payload
        if (payloadMetrics) {
          if (previous.project.metrics) {
            // Merge partial metrics with existing metrics - this ensures all required fields are present
            updatedProject.metrics = {
              ...previous.project.metrics,
              ...payloadMetrics,
            }
          } else {
            // If no existing metrics, we need to create a complete ProjectMetrics object
            // For optimistic updates, we create a safe default with the partial data
            const defaultMetrics: ProjectMetrics = {
              health: "green", // Default health
              ...payloadMetrics,
            }
            updatedProject.metrics = defaultMetrics
          }
        }

        const optimistic: ProjectDetailResponse = {
          ...previous,
          project: updatedProject,
        }
        queryClient.setQueryData(projectQueryKeys.detail(scope, project.id), optimistic)
      }

      return { previous }
    },
    onError: (_error, _vars, context) => {
      const typedContext = context as UpdateProjectContext
      if (typedContext?.previous) {
        queryClient.setQueryData(projectQueryKeys.detail(scope, project.id), typedContext.previous)
      }
      toast({
        variant: "destructive",
        title: "Could not update project",
        description: "Please try again in a moment.",
      })
    },
    onSuccess: () => {
      toast({
        title: messages[PROJECT_I18N_KEYS.feedback.updateSuccess],
      })
    },
  })

  const isMutating = updateProject.isPending

  const handleNameSave = () => {
    if (!nameDraft.trim() || nameDraft === project.name) {
      setIsEditingName(false)
      return
    }
    updateProject.mutate({ name: nameDraft.trim() })
    setIsEditingName(false)
  }

  const handleStatusChange = (value: ProjectStatus) => {
    setStatusDraft(value)
    updateProject.mutate({ status: value })
  }

  const handlePriorityChange = (value: ProjectPriority) => {
    setPriorityDraft(value)
    updateProject.mutate({ priority: value })
  }

  const headerDescription = useMemo(() => project.description ?? "", [project.description])

  return (
    <Card className="border-border/70 shadow-sm">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    className="h-10 w-72"
                    autoFocus
                    disabled={isMutating}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleNameSave()
                      }
                      if (event.key === "Escape") {
                        event.preventDefault()
                        setNameDraft(project.name)
                        setIsEditingName(false)
                      }
                    }}
                  />
                  <Button size="icon" variant="outline" onClick={handleNameSave} disabled={isMutating}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setNameDraft(project.name)
                      setIsEditingName(false)
                    }}
                    disabled={isMutating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setIsEditingName(true)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {messages[PROJECT_I18N_KEYS.header.editNameTooltip]}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
            {headerDescription && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{headerDescription}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {messages[PROJECT_I18N_KEYS.header.statusLabel]}
            </p>
            <InlineStatusSelector value={statusDraft} onChange={handleStatusChange} disabled={isMutating} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {messages[PROJECT_I18N_KEYS.header.priorityLabel]}
            </p>
            <InlinePrioritySelector value={priorityDraft} onChange={handlePriorityChange} disabled={isMutating} />
          </div>
        </div>
      </div>

      <ProjectSummaryCard
        id={project.id}
        name={nameDraft}
        description={headerDescription}
        status={toHyphenStatus(statusDraft)}
        progress={project.progressPercent}
        startDate={project.startDate}
        endDate={project.targetDate}
        tags={project.tags}
        priority={priorityDraft}
        className="border-t border-border/70 shadow-none"
        showActions={false}
      />
    </Card>
  )
}
