'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useMemo } from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { useScope } from "@/contexts/scope-context"
import { getApiBaseUrl } from "@/lib/api/endpoints"
import { isFeatureEnabled } from "@/lib/feature-flags"
import {
  type ProjectDetailResponse,
  type ProjectDocsResponse,
  type ProjectMembersResponse,
  type ProjectSettingsResponse,
  type ProjectTaskListResponse,
  type ProjectTimelineResponse,
  type RemoveProjectMemberParams,
  type UpdateProjectRequest,
  type UpdateProjectSettingsRequest,
  type UpsertProjectMemberRequest,
} from "./contracts"
import { projectApi } from "./mock-service"
import { createFastProjectApi } from "./projects.api"

export interface ProjectScopeKey {
  orgId: string | null
  divisionId: string | null
}

const API_BASE_URL = getApiBaseUrl()
const PROJECT_DETAIL_FLAG = "projects.detail"
const PROJECT_DETAIL_API_FLAG = "projects.detail.api"

export const makeProjectScopeKey = (orgId: string | null, divisionId: string | null): ProjectScopeKey => ({
  orgId,
  divisionId,
})

export const projectScopeSegments = (scope: ProjectScopeKey) => [
  scope.orgId ?? "org:all",
  scope.divisionId ?? "division:all",
] as const

export const projectQueryKeys = {
  base: (scope: ProjectScopeKey) => ["projects", ...projectScopeSegments(scope)] as const,
  detail: (scope: ProjectScopeKey, projectId: string) =>
    ["projects", ...projectScopeSegments(scope), "detail", projectId] as const,
  tasks: (scope: ProjectScopeKey, projectId: string, params?: { cursor?: string; limit?: number }) =>
    [
      "projects",
      ...projectScopeSegments(scope),
      "tasks",
      projectId,
      params?.cursor ?? null,
      params?.limit ?? null,
    ] as const,
  members: (scope: ProjectScopeKey, projectId: string) =>
    ["projects", ...projectScopeSegments(scope), "members", projectId] as const,
  timeline: (scope: ProjectScopeKey, projectId: string) =>
    ["projects", ...projectScopeSegments(scope), "timeline", projectId] as const,
  docs: (scope: ProjectScopeKey, projectId: string) =>
    ["projects", ...projectScopeSegments(scope), "docs", projectId] as const,
  settings: (scope: ProjectScopeKey, projectId: string) =>
    ["projects", ...projectScopeSegments(scope), "settings", projectId] as const,
}

type DetailQueryKey = ReturnType<typeof projectQueryKeys.detail>
type TasksQueryKey = ReturnType<typeof projectQueryKeys.tasks>
type MembersQueryKey = ReturnType<typeof projectQueryKeys.members>
type TimelineQueryKey = ReturnType<typeof projectQueryKeys.timeline>
type DocsQueryKey = ReturnType<typeof projectQueryKeys.docs>
type SettingsQueryKey = ReturnType<typeof projectQueryKeys.settings>

type ProjectQueryOptions<TData> = Omit<UseQueryOptions<TData, Error, TData, DetailQueryKey>, "queryKey" | "queryFn">

export const useProjectEnvironment = () => {
  const { currentOrgId, currentDivisionId, isReady } = useScope()

  const scope = useMemo<ProjectScopeKey>(
    () => makeProjectScopeKey(currentOrgId ?? null, currentDivisionId ?? null),
    [currentOrgId, currentDivisionId]
  )

  const detailFeatureEnabled = isFeatureEnabled(PROJECT_DETAIL_FLAG, process.env.NODE_ENV !== "production")
  const realApiEnabled = isFeatureEnabled(PROJECT_DETAIL_API_FLAG, false)

  const api = useMemo(() => {
    if (!realApiEnabled) {
      return projectApi
    }
    return createFastProjectApi({
      baseUrl: API_BASE_URL,
      scope: {
        orgId: scope.orgId ?? undefined,
        divisionId: scope.divisionId ?? undefined,
      },
    })
  }, [realApiEnabled, scope])

  return {
    scope,
    api,
    detailFeatureEnabled,
    isScopeReady: isReady,
  }
}

export const useProject = (projectId: string | undefined, options?: ProjectQueryOptions<ProjectDetailResponse>) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.detail(scope, projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.getProject(projectId)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

export const useProjectTasks = (
  projectId: string | undefined,
  params?: { cursor?: string; limit?: number },
  options?: Omit<UseQueryOptions<ProjectTaskListResponse, Error, ProjectTaskListResponse, TasksQueryKey>, "queryKey" | "queryFn">
) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.tasks(scope, projectId ?? "", params),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.listProjectTasks(projectId, params)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

export const useProjectMembers = (
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<ProjectMembersResponse, Error, ProjectMembersResponse, MembersQueryKey>, "queryKey" | "queryFn">
) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.members(scope, projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.listProjectMembers(projectId)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

export const useProjectTimeline = (
  projectId: string | undefined,
  options?: Omit<
    UseQueryOptions<ProjectTimelineResponse, Error, ProjectTimelineResponse, TimelineQueryKey>,
    "queryKey" | "queryFn"
  >,
) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.timeline(scope, projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.listProjectTimeline(projectId)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

export const useProjectDocs = (
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<ProjectDocsResponse, Error, ProjectDocsResponse, DocsQueryKey>, "queryKey" | "queryFn">
) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.docs(scope, projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.listProjectDocs(projectId)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

export const useProjectSettings = (
  projectId: string | undefined,
  options?: Omit<
    UseQueryOptions<ProjectSettingsResponse, Error, ProjectSettingsResponse, SettingsQueryKey>,
    "queryKey" | "queryFn"
  >,
) => {
  const { scope, api, detailFeatureEnabled, isScopeReady } = useProjectEnvironment()

  return useQuery({
    queryKey: projectQueryKeys.settings(scope, projectId ?? ""),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("projectId is required")
      }
      return api.getProjectSettings(projectId)
    },
    enabled: Boolean(projectId) && detailFeatureEnabled && isScopeReady && (options?.enabled ?? true),
    ...options,
  })
}

type UpdateProjectMutationOptions = UseMutationOptions<
  ProjectDetailResponse,
  Error,
  UpdateProjectRequest,
  unknown
>

export const useUpdateProject = (projectId: string, options?: UpdateProjectMutationOptions) => {
  const { scope, api } = useProjectEnvironment()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProjectRequest) => api.updateProject(projectId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(scope, projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.base(scope) })
      options?.onSuccess?.(data, variables, context, { variables } as any)
    },
    ...options,
  })
}

type UpdateProjectSettingsMutationOptions = UseMutationOptions<
  ProjectSettingsResponse,
  Error,
  UpdateProjectSettingsRequest,
  unknown
>

export const useUpdateProjectSettings = (projectId: string, options?: UpdateProjectSettingsMutationOptions) => {
  const { scope, api } = useProjectEnvironment()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateProjectSettingsRequest) => api.updateProjectSettings(projectId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.settings(scope, projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.base(scope) })
      options?.onSuccess?.(data, variables, context, { variables } as any)
    },
    ...options,
  })
}

type AddProjectMemberMutationOptions = UseMutationOptions<
  ProjectMembersResponse,
  Error,
  UpsertProjectMemberRequest,
  unknown
>

export const useAddProjectMember = (projectId: string, options?: AddProjectMemberMutationOptions) => {
  const { scope, api } = useProjectEnvironment()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertProjectMemberRequest) => api.addProjectMember(projectId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.members(scope, projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(scope, projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.base(scope) })
      options?.onSuccess?.(data, variables, context, { variables } as any)
    },
    ...options,
  })
}

type RemoveProjectMemberMutationOptions = UseMutationOptions<
  ProjectMembersResponse,
  Error,
  RemoveProjectMemberParams,
  unknown
>

export const useRemoveProjectMember = (options?: RemoveProjectMemberMutationOptions) => {
  const { scope, api } = useProjectEnvironment()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RemoveProjectMemberParams) => api.removeProjectMember(params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.members(scope, variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(scope, variables.projectId) })
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.base(scope) })
      options?.onSuccess?.(data, variables, context, { variables } as any)
    },
    ...options,
  })
}

export const useProjectFeatureGate = () => {
  const { detailFeatureEnabled, isScopeReady } = useProjectEnvironment()
  return { detailFeatureEnabled, isScopeReady }
}
