import { z } from 'zod'
import { httpRequest } from '@/lib/api/http'
import type { ProjectDetailResponse, ProjectSummary } from '@/modules/projects/contracts'

const toArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])
const toNumber = (value: number | null | undefined, fallback = 0) => (typeof value === 'number' ? value : fallback)
const toOptionalString = (value: string | null | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined

export const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progressPercent: z.number().nullable().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
  ownerId: z.string().nullable().optional(),
  divisionId: z.string().nullable(),
  organizationId: z.string(),
  visibility: z.enum(['private', 'division', 'organization']),
  badgeCount: z.number().optional(),
  tags: z.union([z.array(z.string()), z.null()]).optional(),
})

export const ProjectMemberSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().optional(),
  email: z.string(),
  role: z.enum(['owner', 'editor', 'viewer']),
  joinedAt: z.string(),
  isActive: z.boolean(),
})

export const ProjectDetailsSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  progressPercent: z.number().nullable().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
  ownerId: z.string().nullable().optional(),
  divisionId: z.string().nullable(),
  organizationId: z.string(),
  visibility: z.enum(['private', 'division', 'organization']),
  badgeCount: z.number().optional(),
  tags: z.union([z.array(z.string()), z.null()]).optional(),
  overview: z.object({
    goals: z.union([z.array(z.string()), z.null()]).optional(),
    outcomes: z.union([z.array(z.string()), z.null()]).optional(),
  }).optional(),
  defaultView: z.enum(['board', 'list', 'timeline']).optional(),
  integrations: z.union([
    z.array(z.object({
      id: z.string(),
      provider: z.string(),
      status: z.enum(['connected', 'disconnected']),
      syncedAt: z.string().optional(),
    })),
    z.null(),
  ]).optional(),
  coverImage: z.string().optional(),
  metrics: z.object({
    health: z.enum(['green', 'yellow', 'red']),
    riskNotes: z.string().optional(),
    budgetUsedPercent: z.number().nullable().optional(),
    scorecards: z.union([
      z.array(z.object({
        id: z.string(),
        label: z.string(),
        value: z.number(),
        target: z.number().optional(),
        unit: z.string().optional(),
      })),
      z.null(),
    ]).optional(),
  }).optional(),
})

export const ProjectDetailResponseSchema = z.object({
  project: ProjectDetailsSchema,
  members: z.array(ProjectMemberSchema),
  taskCounts: z.object({
    todo: z.number(),
    in_progress: z.number(),
    review: z.number(),
    done: z.number(),
  }),
})

const hydrateProjectSummary = (raw: z.infer<typeof ProjectSummarySchema>): ProjectSummary => ({
  id: raw.id,
  slug: raw.slug,
  name: raw.name,
  description: raw.description,
  status: raw.status,
  priority: raw.priority,
  progressPercent: toNumber(raw.progressPercent ?? undefined, 0),
  startDate: raw.startDate,
  targetDate: raw.targetDate,
  updatedAt: raw.updatedAt,
  createdAt: raw.createdAt,
  ownerId: raw.ownerId || '',
  divisionId: raw.divisionId,
  organizationId: raw.organizationId,
  visibility: raw.visibility,
  badgeCount: raw.badgeCount,
  tags: toArray(raw.tags ?? []),
})

const hydrateProjectDetail = (raw: z.infer<typeof ProjectDetailsSchema>) => ({
  id: raw.id,
  slug: raw.slug,
  name: raw.name,
  description: raw.description,
  status: raw.status,
  priority: raw.priority,
  progressPercent: toNumber(raw.progressPercent ?? undefined, 0),
  startDate: raw.startDate,
  targetDate: raw.targetDate,
  updatedAt: raw.updatedAt,
  createdAt: raw.createdAt,
  ownerId: raw.ownerId || '',
  divisionId: raw.divisionId,
  organizationId: raw.organizationId,
  visibility: raw.visibility,
  badgeCount: raw.badgeCount,
  tags: toArray(raw.tags ?? []),
  overview: {
    goals: toArray(raw.overview?.goals ?? []),
    outcomes: toArray(raw.overview?.outcomes ?? []),
  },
  defaultView: raw.defaultView ?? 'board',
  integrations: toArray(raw.integrations ?? []),
  coverImage: raw.coverImage,
  metrics: raw.metrics
    ? {
        health: raw.metrics.health,
        riskNotes: raw.metrics.riskNotes,
        budgetUsedPercent: raw.metrics.budgetUsedPercent ?? undefined,
        scorecards: toArray(raw.metrics.scorecards ?? []),
      }
    : undefined,
})

const normalizeProjectDetailResponse = (data: unknown): ProjectDetailResponse => {
  const parsed = ProjectDetailResponseSchema.safeParse(data)
  if (!parsed.success) {
    console.error('Project API response validation failed:', parsed.error)
    throw new Error('Invalid project data received from server')
  }

  return {
    project: hydrateProjectDetail(parsed.data.project),
    members: parsed.data.members,
    taskCounts: parsed.data.taskCounts,
  }
}

const normalizeProjectListResponse = (data: unknown): ProjectSummary[] => {
  const payload = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
      ? (data as any).items
      : data

  const parsed = z.array(ProjectSummarySchema).safeParse(payload)
  if (!parsed.success) {
    console.error('Projects API response validation failed:', parsed.error)
    throw new Error('Invalid projects data received from server')
  }

  return parsed.data.map(hydrateProjectSummary)
}

// API client functions
export async function fetchProject(
  projectId: string,
  options?: { orgId?: string; signal?: AbortSignal },
): Promise<ProjectDetailResponse> {
  // Project endpoints require organization context in the backend
  if (!options?.orgId) {
    throw new Error('Organization ID is required to fetch project details')
  }

  const endpoint = `/api/organizations/${options.orgId}/projects/${projectId}`
  const data = await httpRequest<unknown>('GET', endpoint, {
    signal: options?.signal,
    meta: { endpoint, method: 'GET', scope: { orgId: options.orgId } },
  })

  return normalizeProjectDetailResponse(data)
}

export async function fetchProjectsByScope(
  orgId: string,
  divisionId: string | null,
  options?: { signal?: AbortSignal },
): Promise<ProjectSummary[]> {
  const endpoint = divisionId
    ? `/api/organizations/${orgId}/divisions/${divisionId}/projects`
    : `/api/organizations/${orgId}/projects`

  const data = await httpRequest<unknown>('GET', endpoint, {
    signal: options?.signal,
    meta: { endpoint, method: 'GET', scope: { orgId, divisionId: divisionId ?? undefined } },
  })

  return normalizeProjectListResponse(data)
}

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  divisionId: z.string().nullable().optional(),
  organizationId: z.string(),
  visibility: z.enum(['private', 'division', 'organization']).default('division'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).default('planning'),
  tags: z.array(z.string()).default([]),
  targetDate: z.string().optional(),
  defaultView: z.enum(['board', 'list', 'timeline']).default('board'),
})

export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>

export async function createProject(
  data: CreateProjectRequest,
  options?: { signal?: AbortSignal },
): Promise<ProjectDetailResponse> {
  // Project creation requires organization context in the backend
  const endpoint = data.divisionId
    ? `/api/organizations/${data.organizationId}/divisions/${data.divisionId}/projects`
    : `/api/organizations/${data.organizationId}/projects`

  const response = await httpRequest<unknown>('POST', endpoint, {
    body: data,
    signal: options?.signal,
    meta: {
      endpoint,
      method: 'POST',
      scope: { orgId: data.organizationId, divisionId: data.divisionId ?? undefined },
    },
  })

  return normalizeProjectDetailResponse(response)
}

// Enhanced project update API
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  targetDate: z.string().optional(),
  coverImage: z.string().url().optional(),
  defaultView: z.enum(['board', 'list', 'timeline']).optional(),
  visibility: z.enum(['private', 'division', 'organization']).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
})

export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>

export async function updateProject(
  projectId: string,
  updates: UpdateProjectRequest,
  options?: { orgId: string; signal?: AbortSignal },
): Promise<ProjectDetailResponse> {
  // Project update requires organization context in the backend
  if (!options?.orgId) {
    throw new Error('Organization ID is required to update project')
  }

  const endpoint = `/api/organizations/${options.orgId}/projects/${projectId}`
  const response = await httpRequest<unknown>('PATCH', endpoint, {
    body: updates,
    signal: options?.signal,
    meta: { endpoint, method: 'PATCH', scope: { orgId: options.orgId } },
  })

  return normalizeProjectDetailResponse(response)
}

// Project deletion API
export async function deleteProject(
  projectId: string,
  options?: { orgId: string; signal?: AbortSignal },
): Promise<void> {
  // Project deletion requires organization context in the backend
  if (!options?.orgId) {
    throw new Error('Organization ID is required to delete project')
  }

  const endpoint = `/api/organizations/${options.orgId}/projects/${projectId}`
  await httpRequest<void>('DELETE', endpoint, {
    signal: options?.signal,
    meta: { endpoint, method: 'DELETE', scope: { orgId: options.orgId } },
  })
}
