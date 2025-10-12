// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { projectMemoryStore,
  getProjectDetailOrThrow,
  buildProjectMembersResponse,
  buildProjectTasksResponse,
  buildProjectTimelineResponse,
  buildProjectDocsResponse,
  getProjectSettingsOrDefault,
  upsertProjectMembers,
  upsertProjectSettings,
  upsertProjectDetails,
  archiveProjectById,
} from "./mock-data"
import {
  type ProjectApiContract,
  type ProjectDetailResponse,
  type ProjectMembersResponse,
  type ProjectSettingsResponse,
  type ProjectTaskListResponse,
  type ProjectTimelineResponse,
  type ProjectDocsResponse,
  type UpdateProjectRequest,
  type UpdateProjectSettingsRequest,
  type UpsertProjectMemberRequest,
  type RemoveProjectMemberParams,
  type ProjectTaskSummary,
} from "./contracts"

const buildTaskCounts = (tasks: ProjectTaskSummary[]) => {
  return tasks.reduce<Record<ProjectTaskSummary["status"], number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1
      return acc
    },
    {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    },
  )
}

const buildProjectDetailResponse = (projectId: string): ProjectDetailResponse => {
  const project = getProjectDetailOrThrow(projectId)
  const members = projectMemoryStore.members[projectId] ?? []
  const tasks = projectMemoryStore.tasks[projectId] ?? []

  return {
    project: { ...project },
    members: [...members],
    taskCounts: buildTaskCounts(tasks),
  }
}

class MockProjectApi implements ProjectApiContract {
  async getProject(projectId: string): Promise<ProjectDetailResponse> {
    return buildProjectDetailResponse(projectId)
  }

  async updateProject(projectId: string, body: UpdateProjectRequest): Promise<ProjectDetailResponse> {
    const existing = getProjectDetailOrThrow(projectId)
    const updated = {
      ...existing,
      ...body,
      metrics: body.metrics ? { ...existing.metrics, ...body.metrics } : existing.metrics,
      tags: body.tags ?? existing.tags,
      updatedAt: new Date().toISOString(),
    }

    upsertProjectDetails(projectId, updated)
    return buildProjectDetailResponse(projectId)
  }

  async deleteProject(projectId: string): Promise<void> {
    getProjectDetailOrThrow(projectId)
    archiveProjectById(projectId)
  }

  async listProjectTasks(
    projectId: string,
    params?: { cursor?: string | undefined; limit?: number | undefined },
  ): Promise<ProjectTaskListResponse> {
    getProjectDetailOrThrow(projectId)
    return buildProjectTasksResponse(projectId, params?.cursor, params?.limit)
  }

  async listProjectTimeline(projectId: string): Promise<ProjectTimelineResponse> {
    getProjectDetailOrThrow(projectId)
    return buildProjectTimelineResponse(projectId)
  }

  async listProjectDocs(projectId: string): Promise<ProjectDocsResponse> {
    getProjectDetailOrThrow(projectId)
    return buildProjectDocsResponse(projectId)
  }

  async listProjectMembers(projectId: string): Promise<ProjectMembersResponse> {
    getProjectDetailOrThrow(projectId)
    return buildProjectMembersResponse(projectId)
  }

  async addProjectMember(projectId: string, body: UpsertProjectMemberRequest): Promise<ProjectMembersResponse> {
    const project = getProjectDetailOrThrow(projectId)
    const members = [...(projectMemoryStore.members[projectId] ?? [])]
    const index = members.findIndex((member) => member.userId === body.userId)

    if (index >= 0) {
      members[index] = { ...members[index], role: body.role, isActive: true }
    } else {
      members.push({
        userId: body.userId,
        fullName: body.userId,
        email: `${body.userId}@example.com`,
        role: body.role,
        joinedAt: new Date().toISOString(),
        isActive: true,
      })
    }

    upsertProjectMembers(project.id, members)
    return buildProjectMembersResponse(projectId)
  }

  async removeProjectMember(params: RemoveProjectMemberParams): Promise<ProjectMembersResponse> {
    getProjectDetailOrThrow(params.projectId)
    const members = [...(projectMemoryStore.members[params.projectId] ?? [])].filter(
      (member) => member.userId !== params.userId,
    )
    upsertProjectMembers(params.projectId, members)
    return buildProjectMembersResponse(params.projectId)
  }

  async getProjectSettings(projectId: string): Promise<ProjectSettingsResponse> {
    getProjectDetailOrThrow(projectId)
    return {
      projectId,
      settings: getProjectSettingsOrDefault(projectId),
    }
  }

  async updateProjectSettings(
    projectId: string,
    body: UpdateProjectSettingsRequest,
  ): Promise<ProjectSettingsResponse> {
    getProjectDetailOrThrow(projectId)
    const existing = getProjectSettingsOrDefault(projectId)
    const updated = {
      ...existing,
      ...body,
      featureFlags: body.featureFlags ?? existing.featureFlags,
    }
    upsertProjectSettings(projectId, updated)
    return {
      projectId,
      settings: updated,
    }
  }
}

export const projectApi: ProjectApiContract = new MockProjectApi()
