export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "archived"

export type ProjectVisibility = "private" | "division" | "organization"

export type ProjectPriority = "low" | "medium" | "high" | "urgent"

export interface ProjectSummary {
  id: string
  slug: string
  name: string
  description?: string
  status: ProjectStatus
  priority?: ProjectPriority
  progressPercent: number
  startDate?: string
  targetDate?: string
  updatedAt: string
  createdAt: string
  ownerId: string
  divisionId: string | null  // Allow null for org-wide projects
  organizationId: string
  visibility: ProjectVisibility
  badgeCount?: number
  tags: string[]
}

export interface ProjectMetrics {
  health: "green" | "yellow" | "red"
  riskNotes?: string
  budgetUsedPercent?: number
  scorecards?: Array<{
    id: string
    label: string
    value: number
    target?: number
    unit?: string
  }>
}

export interface ProjectDetails extends ProjectSummary {
  overview: {
    goals: string[]
    outcomes: string[]
  }
  metrics?: ProjectMetrics
  coverImage?: string
  defaultView: "board" | "list" | "timeline"
  integrations: Array<{
    id: string
    provider: string
    status: "connected" | "disconnected"
    syncedAt?: string
  }>
}

export interface ProjectMember {
  userId: string
  fullName: string
  avatarUrl?: string
  email: string
  role: "owner" | "editor" | "viewer"
  joinedAt: string
  isActive: boolean
}

export interface ProjectMembersResponse {
  projectId: string
  members: ProjectMember[]
}

export interface UpsertProjectMemberRequest {
  userId: string
  role: ProjectMember["role"]
}

export interface ProjectTaskSummary {
  id: string
  name: string
  status: "todo" | "in_progress" | "review" | "done"
  priority: ProjectPriority
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  updatedAt: string
  createdAt: string
  shortId: string
}

export interface ProjectTaskListResponse {
  projectId: string
  tasks: ProjectTaskSummary[]
  pagination: {
    cursor?: string
    hasMore: boolean
  }
}

export interface ProjectTimelineEntry {
  id: string
  projectId: string
  title: string
  entryType: "milestone" | "update" | "risk" | "decision"
  happenedAt: string
  authorId: string
  authorName: string
  description?: string
  attachments?: Array<{
    id: string
    name: string
    url: string
    mimeType: string
  }>
}

export interface ProjectTimelineResponse {
  projectId: string
  entries: ProjectTimelineEntry[]
}

export interface ProjectDocSummary {
  id: string
  title: string
  shortId: string
  updatedAt: string
  ownerId: string
  ownerName: string
  status: "draft" | "published" | "archived"
}

export interface ProjectDocsResponse {
  projectId: string
  docs: ProjectDocSummary[]
}

export interface ProjectSettings {
  allowGuests: boolean
  notificationsEnabled: boolean
  autoArchiveCompletedTasks: boolean
  featureFlags: Array<{
    key: string
    enabled: boolean
  }>
}

export interface ProjectSettingsResponse {
  projectId: string
  settings: ProjectSettings
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  tags?: string[]
  targetDate?: string
  coverImage?: string
  defaultView?: ProjectDetails["defaultView"]
  metrics?: Partial<ProjectMetrics>
}

export interface UpdateProjectSettingsRequest {
  allowGuests?: boolean
  notificationsEnabled?: boolean
  autoArchiveCompletedTasks?: boolean
  featureFlags?: ProjectSettings["featureFlags"]
}

export interface ProjectDetailResponse {
  project: ProjectDetails
  members: ProjectMember[]
  taskCounts: Record<ProjectTaskSummary["status"], number>
}

export interface RemoveProjectMemberParams {
  projectId: string
  userId: string
}

export interface ProjectEndpointMeta {
  path: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  description: string
}

export const PROJECT_ENDPOINTS: Record<string, ProjectEndpointMeta> = {
  getProject: {
    path: "/api/projects/{projectId}",
    method: "GET",
    description: "Fetch a single project with overview data",
  },
  updateProject: {
    path: "/api/projects/{projectId}",
    method: "PUT",
    description: "Update core project attributes",
  },
  deleteProject: {
    path: "/api/projects/{projectId}",
    method: "DELETE",
    description: "Archive or delete a project",
  },
  listTasks: {
    path: "/api/projects/{projectId}/tasks",
    method: "GET",
    description: "List tasks scoped to the project",
  },
  listTimeline: {
    path: "/api/projects/{projectId}/timeline",
    method: "GET",
    description: "Retrieve timeline updates for the project",
  },
  listDocs: {
    path: "/api/projects/{projectId}/docs",
    method: "GET",
    description: "Retrieve docs associated with the project",
  },
  listMembers: {
    path: "/api/projects/{projectId}/members",
    method: "GET",
    description: "Fetch project membership roster",
  },
  addMember: {
    path: "/api/projects/{projectId}/members",
    method: "POST",
    description: "Add or update a project member",
  },
  removeMember: {
    path: "/api/projects/{projectId}/members/{userId}",
    method: "DELETE",
    description: "Remove a member from the project",
  },
  updateSettings: {
    path: "/api/projects/{projectId}/settings",
    method: "PUT",
    description: "Update project-level settings",
  },
}

export interface ProjectApiContract {
  getProject(projectId: string): Promise<ProjectDetailResponse>
  updateProject(projectId: string, body: UpdateProjectRequest): Promise<ProjectDetailResponse>
  deleteProject(projectId: string): Promise<void>
  listProjectTasks(projectId: string, params?: { cursor?: string; limit?: number }): Promise<ProjectTaskListResponse>
  listProjectTimeline(projectId: string): Promise<ProjectTimelineResponse>
  listProjectDocs(projectId: string): Promise<ProjectDocsResponse>
  listProjectMembers(projectId: string): Promise<ProjectMembersResponse>
  addProjectMember(projectId: string, body: UpsertProjectMemberRequest): Promise<ProjectMembersResponse>
  removeProjectMember(params: RemoveProjectMemberParams): Promise<ProjectMembersResponse>
  getProjectSettings(projectId: string): Promise<ProjectSettingsResponse>
  updateProjectSettings(projectId: string, body: UpdateProjectSettingsRequest): Promise<ProjectSettingsResponse>
}
