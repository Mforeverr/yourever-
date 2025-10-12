'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCcw, ArrowLeft } from "lucide-react"
import {
  ProjectFeatureGate,
  ProjectHeader,
  ProjectMembers,
  ProjectOverview,
  ProjectPageSkeleton,
  ProjectSettings,
  ProjectTabs,
  ProjectTasks,
  ProjectTimeline,
  ProjectDocs,
  type ProjectTabKey,
} from "@/components/entities/project"
import {
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useProject,
  useProjectDocs,
  useProjectEnvironment,
  useProjectTasks,
  useProjectTimeline,
} from "@/modules/projects"
import { enMessages } from "@/locales/en"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useQueryClient } from "@tanstack/react-query"

const messages = enMessages

const DEFAULT_TAB_BY_VIEW: Record<string, ProjectTabKey> = {
  board: "tasks",
  list: "tasks",
  timeline: "timeline",
  docs: "docs",
}

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { scope } = useProjectEnvironment()

  const { data, isLoading, isError, refetch } = useProject(params.projectId)
  const [activeTab, setActiveTab] = useState<ProjectTabKey>("overview")

  const tasksQuery = useProjectTasks(params.projectId, { limit: 25 })
  const timelineQuery = useProjectTimeline(params.projectId)
  const docsQuery = useProjectDocs(params.projectId)

  const taskCount = tasksQuery.data?.tasks.length ?? 0
  const timelineCount = timelineQuery.data?.entries.length ?? 0
  const docsCount = docsQuery.data?.docs.length ?? 0

  const tabCounts: Partial<Record<ProjectTabKey, number>> = useMemo(
    () => ({
      tasks: taskCount,
      timeline: timelineCount,
      docs: docsCount,
    }),
    [docsCount, taskCount, timelineCount]
  )

  const project = data?.project

  useEffect(() => {
    if (project?.defaultView) {
      setActiveTab(DEFAULT_TAB_BY_VIEW[project.defaultView] ?? "overview")
    }
  }, [project?.defaultView])

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <ProjectFeatureGate>
          <ProjectPageSkeleton />
        </ProjectFeatureGate>
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="h-full overflow-auto p-6">
        <ProjectFeatureGate>
          <Alert variant="destructive">
            <AlertTitle>{messages[PROJECT_I18N_KEYS.errors.notFound]}</AlertTitle>
            <AlertDescription>
              <div className="mt-3 flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go back
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </ProjectFeatureGate>
      </div>
    )
  }

  const handleTabChange = (tab: ProjectTabKey) => {
    setActiveTab(tab)
  }

  const handleRefreshTab = (tab: ProjectTabKey) => {
    if (!project) return
    switch (tab) {
      case "tasks":
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.tasks(scope, project.id, { limit: 25 }) })
        break
      case "timeline":
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.timeline(scope, project.id) })
        break
      case "docs":
        queryClient.invalidateQueries({ queryKey: projectQueryKeys.docs(scope, project.id) })
        break
      default:
        break
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProjectFeatureGate>
        <div className="border-b border-border/70 bg-surface-panel px-6 py-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${project.organizationId}/${project.divisionId}/workspace`}>
                    {messages[PROJECT_I18N_KEYS.page.breadcrumbRoot]}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{project.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
            <ProjectHeader project={project} />

            <ProjectTabs
              activeTab={activeTab}
              onChange={handleTabChange}
              counts={tabCounts}
              rightSlot={
                <Button variant="ghost" size="sm" onClick={() => handleRefreshTab(activeTab)}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              }
            />

            <Tabs value={activeTab} className="flex-1">
              <TabsContent value="overview">
                <ProjectOverview project={project} />
              </TabsContent>

              <TabsContent value="tasks">
                <ProjectTasks projectId={project.id} limit={25} />
              </TabsContent>

              <TabsContent value="timeline">
                <ProjectTimeline projectId={project.id} />
              </TabsContent>

              <TabsContent value="docs">
                <ProjectDocs projectId={project.id} />
              </TabsContent>

              <TabsContent value="settings">
                <ProjectSettings projectId={project.id} />
              </TabsContent>
            </Tabs>

            <ProjectMembers projectId={project.id} />
          </div>
        </div>
      </ProjectFeatureGate>
    </div>
  )
}
