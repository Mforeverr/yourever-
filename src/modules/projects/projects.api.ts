// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { httpRequest, type HttpMethod } from "@/lib/api/http"
import {
  PROJECT_ENDPOINTS,
  type ProjectApiContract,
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

type EndpointKey = keyof typeof PROJECT_ENDPOINTS

interface RequestScopeMeta {
  orgId?: string
  divisionId?: string
}

interface RequestConfig {
  scope?: RequestScopeMeta
}

const applyPathParams = (pathTemplate: string, params: Record<string, string>) =>
  Object.entries(params).reduce(
    (path, [key, value]) => path.replace(new RegExp(`{${key}}`, "g"), encodeURIComponent(value)),
    pathTemplate
  )

const buildMeta = (key: EndpointKey, method: HttpMethod, scope?: RequestScopeMeta) => ({
  endpoint: PROJECT_ENDPOINTS[key].path,
  method,
  scope,
})

const appendQueryParams = (path: string, params?: Record<string, string | undefined>) => {
  if (!params) return path
  const search = new URLSearchParams()
  Object.entries(params).forEach(([paramKey, value]) => {
    if (value !== undefined && value !== null) {
      search.set(paramKey, value)
    }
  })
  const queryString = search.toString()
  if (!queryString) return path
  return `${path}?${queryString}`
}

export const createFastProjectApi = ({ baseUrl = "", scope }: { baseUrl?: string; scope?: RequestScopeMeta } = {}) => {
  const withBase = (path: string) => `${baseUrl}${path}`

  const getProjectPath = (projectId: string) =>
    withBase(applyPathParams(PROJECT_ENDPOINTS.getProject.path, { projectId }))
  const getProjectTasksPath = (projectId: string, params?: { cursor?: string; limit?: number }) =>
    withBase(
      appendQueryParams(
        applyPathParams(PROJECT_ENDPOINTS.listTasks.path, { projectId }),
        params
          ? {
              cursor: params.cursor,
              limit: params.limit ? String(params.limit) : undefined,
            }
          : undefined
      )
    )
  const getProjectTimelinePath = (projectId: string) =>
    withBase(applyPathParams(PROJECT_ENDPOINTS.listTimeline.path, { projectId }))
  const getProjectDocsPath = (projectId: string) =>
    withBase(applyPathParams(PROJECT_ENDPOINTS.listDocs.path, { projectId }))
  const getProjectMembersPath = (projectId: string) =>
    withBase(applyPathParams(PROJECT_ENDPOINTS.listMembers.path, { projectId }))
  const getProjectMemberPath = (projectId: string, userId: string) =>
    withBase(
      applyPathParams(PROJECT_ENDPOINTS.removeMember.path, {
        projectId,
        userId,
      })
    )
  const getProjectSettingsPath = (projectId: string) =>
    withBase(applyPathParams(PROJECT_ENDPOINTS.updateSettings.path, { projectId }))

  const getProjectDetailResponse = async (projectId: string): Promise<ProjectDetailResponse> =>
    httpRequest("GET", getProjectPath(projectId), {
      meta: buildMeta("getProject", "GET", scope),
    })

  const api: ProjectApiContract = {
    async getProject(projectId: string): Promise<ProjectDetailResponse> {
      return getProjectDetailResponse(projectId)
    },
    async updateProject(projectId: string, body: UpdateProjectRequest): Promise<ProjectDetailResponse> {
      return httpRequest("PUT", getProjectPath(projectId), {
        body,
        meta: buildMeta("updateProject", "PUT", scope),
      })
    },
    async deleteProject(projectId: string): Promise<void> {
      await httpRequest<void>("DELETE", getProjectPath(projectId), {
        meta: buildMeta("deleteProject", "DELETE", scope),
      })
    },
    async listProjectTasks(
      projectId: string,
      params?: { cursor?: string | undefined; limit?: number | undefined }
    ): Promise<ProjectTaskListResponse> {
      return httpRequest("GET", getProjectTasksPath(projectId, params), {
        meta: buildMeta("listTasks", "GET", scope),
      })
    },
    async listProjectTimeline(projectId: string): Promise<ProjectTimelineResponse> {
      return httpRequest("GET", getProjectTimelinePath(projectId), {
        meta: buildMeta("listTimeline", "GET", scope),
      })
    },
    async listProjectDocs(projectId: string): Promise<ProjectDocsResponse> {
      return httpRequest("GET", getProjectDocsPath(projectId), {
        meta: buildMeta("listDocs", "GET", scope),
      })
    },
    async listProjectMembers(projectId: string): Promise<ProjectMembersResponse> {
      return httpRequest("GET", getProjectMembersPath(projectId), {
        meta: buildMeta("listMembers", "GET", scope),
      })
    },
    async addProjectMember(projectId: string, body: UpsertProjectMemberRequest): Promise<ProjectMembersResponse> {
      return httpRequest("POST", getProjectMembersPath(projectId), {
        body,
        meta: buildMeta("addMember", "POST", scope),
      })
    },
    async removeProjectMember(params: RemoveProjectMemberParams): Promise<ProjectMembersResponse> {
      return httpRequest("DELETE", getProjectMemberPath(params.projectId, params.userId), {
        meta: buildMeta("removeMember", "DELETE", scope),
      })
    },
    async getProjectSettings(projectId: string): Promise<ProjectSettingsResponse> {
      return httpRequest("GET", getProjectSettingsPath(projectId), {
        meta: buildMeta("updateSettings", "GET", scope),
      })
    },
    async updateProjectSettings(
      projectId: string,
      body: UpdateProjectSettingsRequest
    ): Promise<ProjectSettingsResponse> {
      return httpRequest("PUT", getProjectSettingsPath(projectId), {
        body,
        meta: buildMeta("updateSettings", "PUT", scope),
      })
    },
  }

  return api
}

export const fastProjectApi = createFastProjectApi()
