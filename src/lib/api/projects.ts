import { z } from 'zod'
import { httpRequest } from '@/lib/api/http'
import type { ProjectDetailResponse, ProjectSummary, ProjectWorkspaceSnapshot } from '@/modules/projects/contracts'

const toArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])
const toNumber = (value: number | null | undefined, fallback = 0) => (typeof value === 'number' ? value : fallback)

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const
const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const PROJECT_VISIBILITIES = ['private', 'division', 'organization'] as const

const isStatus = (value: unknown): value is (typeof PROJECT_STATUSES)[number] =>
  typeof value === 'string' && PROJECT_STATUSES.includes(value as (typeof PROJECT_STATUSES)[number])

const isPriority = (value: unknown): value is (typeof PROJECT_PRIORITIES)[number] =>
  typeof value === 'string' && PROJECT_PRIORITIES.includes(value as (typeof PROJECT_PRIORITIES)[number])

const isVisibility = (value: unknown): value is (typeof PROJECT_VISIBILITIES)[number] =>
  typeof value === 'string' && PROJECT_VISIBILITIES.includes(value as (typeof PROJECT_VISIBILITIES)[number])

const deriveSlug = (rawSlug: string | undefined, name: string | undefined, id: string): string => {
  const base = rawSlug ?? name ?? id
  return base
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `project-${id}`
}

const API_PROJECT_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'archived', 'cancelled'] as const
const API_PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const

type AppProjectStatus = (typeof PROJECT_STATUSES)[number]
type ApiProjectStatus = (typeof API_PROJECT_STATUSES)[number]
type AppProjectPriority = (typeof PROJECT_PRIORITIES)[number]
type ApiProjectPriority = (typeof API_PROJECT_PRIORITIES)[number]

const STATUS_TO_API_MAP: Record<AppProjectStatus, ApiProjectStatus> = {
  planning: 'draft',
  active: 'active',
  on_hold: 'on_hold',
  completed: 'completed',
  archived: 'archived',
}

const PRIORITY_TO_API_MAP: Record<AppProjectPriority, ApiProjectPriority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'critical',
}

const toOptionalTrimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeStatusForApi = (status: AppProjectStatus | undefined): ApiProjectStatus | undefined => {
  if (!status) return undefined
  return STATUS_TO_API_MAP[status] ?? undefined
}

const normalizePriorityForApi = (priority: AppProjectPriority | undefined): ApiProjectPriority | undefined => {
  if (!priority) return undefined
  return PRIORITY_TO_API_MAP[priority] ?? undefined
}

type MetadataInput = {
  visibility?: (typeof PROJECT_VISIBILITIES)[number]
  tags?: string[] | null
  targetDate?: string | null | undefined
}

const buildMetadataPayload = ({ visibility, tags, targetDate }: MetadataInput): Record<string, unknown> | undefined => {
  const metadata: Record<string, unknown> = {}

  if (visibility) {
    metadata.visibility = visibility
  }

  if (Array.isArray(tags)) {
    metadata.tags = tags
  }

  const normalizedTargetDate = toOptionalTrimmed(targetDate ?? undefined)
  if (normalizedTargetDate) {
    metadata.target_date = normalizedTargetDate
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const buildSettingsPayload = (defaultView: string | undefined): Record<string, unknown> | undefined => {
  const normalizedDefaultView = toOptionalTrimmed(defaultView ?? undefined)
  if (!normalizedDefaultView) return undefined

  return { default_view: normalizedDefaultView }
}

export const ProjectSummarySchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  progressPercent: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional(),
  ownerId: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  organizationId: z.string().optional(),
  orgId: z.string().optional(),
  visibility: z.string().optional(),
  badgeCount: z.number().optional(),
  tags: z.union([z.array(z.string()), z.null(), z.undefined()]).optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
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
  slug: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  progressPercent: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  createdAt: z.string().optional(),
  ownerId: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  organizationId: z.string().optional(),
  orgId: z.string().optional(),
  visibility: z.string().optional(),
  badgeCount: z.number().optional(),
  tags: z.union([z.array(z.string()), z.null(), z.undefined()]).optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  overview: z.object({
    goals: z.union([z.array(z.string()), z.null(), z.undefined()]).optional(),
    outcomes: z.union([z.array(z.string()), z.null(), z.undefined()]).optional(),
  }).optional(),
  defaultView: z.string().optional(),
  integrations: z.union([
    z.array(z.object({
      id: z.string(),
      provider: z.string(),
      status: z.string().optional(),
      syncedAt: z.string().optional(),
    })),
    z.null(),
    z.undefined(),
  ]).optional(),
  coverImage: z.string().optional(),
  metrics: z.object({
    health: z.string().optional(),
    riskNotes: z.string().nullable().optional(),
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
      z.undefined(),
    ]).optional(),
  }).optional().nullable(),
})

const EMPTY_TASK_COUNTS = {
  todo: 0,
  in_progress: 0,
  review: 0,
  done: 0,
} as const

export const ProjectDetailResponseSchema = z.object({
  project: ProjectDetailsSchema,
  members: z.array(ProjectMemberSchema).optional(),
  taskCounts: z.object({
    todo: z.number().optional(),
    in_progress: z.number().optional(),
    review: z.number().optional(),
    done: z.number().optional(),
  }).optional(),
})

const fallbackIso = () => new Date().toISOString()

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined

const hydrateProjectSummary = (raw: z.infer<typeof ProjectSummarySchema>): ProjectSummary => {
  const status = isStatus(raw.status) ? raw.status : 'planning'
  const priority = isPriority(raw.priority) ? raw.priority : 'medium'
  const visibility = isVisibility(raw.visibility) ? raw.visibility : 'division'
  const organizationId = toOptionalString(raw.organizationId) ?? toOptionalString(raw.orgId) ?? ''
  const metadataTags = Array.isArray(raw.metadata?.tags) ? raw.metadata?.tags : []

  return {
    id: raw.id,
    slug: deriveSlug(raw.slug, raw.name, raw.id),
    name: raw.name,
    description: toOptionalString(raw.description),
    status,
    priority,
    progressPercent: toNumber(raw.progressPercent ?? undefined, 0),
    startDate: toOptionalString(raw.startDate),
    targetDate: toOptionalString(raw.targetDate),
    updatedAt: toOptionalString(raw.updatedAt) ?? fallbackIso(),
    createdAt: toOptionalString(raw.createdAt) ?? fallbackIso(),
    ownerId: toOptionalString(raw.ownerId) ?? '',
    divisionId: toOptionalString(raw.divisionId) ?? null,
    organizationId,
    visibility,
    badgeCount: typeof raw.badgeCount === 'number' ? raw.badgeCount : undefined,
    tags: toArray(raw.tags ?? metadataTags ?? []),
  }
}

const hydrateProjectDetail = (raw: z.infer<typeof ProjectDetailsSchema>) => {
  const status = isStatus(raw.status) ? raw.status : 'planning'
  const priority = isPriority(raw.priority) ? raw.priority : 'medium'
  const visibility = isVisibility(raw.visibility) ? raw.visibility : 'division'
  const organizationId = toOptionalString(raw.organizationId) ?? toOptionalString(raw.orgId) ?? ''
  const metadata = raw.metadata as Record<string, unknown> | undefined
  const settings = raw.settings as Record<string, unknown> | undefined
  const metadataTags = Array.isArray(metadata?.['tags']) ? (metadata?.['tags'] as string[]) : []
  const metadataVisibility = metadata?.['visibility']
  const metadataTargetDate = toOptionalString(metadata?.['target_date'])

  const metricsHealth = raw.metrics?.health
  const validHealth = metricsHealth === 'green' || metricsHealth === 'yellow' || metricsHealth === 'red' ? metricsHealth : 'green'

  return {
    id: raw.id,
    slug: deriveSlug(raw.slug, raw.name, raw.id),
    name: raw.name,
    description: toOptionalString(raw.description),
    status,
    priority,
    progressPercent: toNumber(raw.progressPercent ?? undefined, 0),
    startDate: toOptionalString(raw.startDate),
    targetDate: toOptionalString(raw.targetDate) ?? metadataTargetDate,
    updatedAt: toOptionalString(raw.updatedAt) ?? fallbackIso(),
    createdAt: toOptionalString(raw.createdAt) ?? fallbackIso(),
    ownerId: toOptionalString(raw.ownerId) ?? '',
    divisionId: toOptionalString(raw.divisionId) ?? null,
    organizationId,
    visibility: isVisibility(metadataVisibility) ? metadataVisibility : visibility,
    badgeCount: typeof raw.badgeCount === 'number' ? raw.badgeCount : undefined,
    tags: toArray(raw.tags ?? metadataTags ?? []),
    overview: {
      goals: toArray(raw.overview?.goals ?? []),
      outcomes: toArray(raw.overview?.outcomes ?? []),
    },
    defaultView: (() => {
      const candidate =
        toOptionalString(raw.defaultView) ??
        toOptionalString(settings?.['default_view']) ??
        toOptionalString(settings?.['defaultView'])
      return candidate === 'list' || candidate === 'timeline' ? candidate : 'board'
    })(),
    integrations: toArray(raw.integrations ?? []).map((integration) => {
      const record = integration as Record<string, unknown>
      const rawId = record?.id
      const normalizedId = toOptionalString(rawId) ?? (rawId != null ? String(rawId) : '')

      return {
        id: normalizedId,
        provider: toOptionalString(record?.provider) ?? 'unknown',
        status: record?.status === 'connected' ? 'connected' : 'disconnected',
        syncedAt: toOptionalString(record?.syncedAt),
      }
    }),
    coverImage: toOptionalString(raw.coverImage),
    metrics: raw.metrics
      ? {
          health: validHealth,
          riskNotes: toOptionalString(raw.metrics.riskNotes),
          budgetUsedPercent: raw.metrics.budgetUsedPercent ?? undefined,
          scorecards: toArray(raw.metrics.scorecards ?? []),
        }
      : undefined,
  }
}

const normalizeProjectDetailResponse = (data: unknown): ProjectDetailResponse => {
  const parsed = ProjectDetailResponseSchema.safeParse(data)
  if (parsed.success) {
    return {
      project: hydrateProjectDetail(parsed.data.project),
      members: parsed.data.members ?? [],
      taskCounts: {
        todo: parsed.data.taskCounts?.todo ?? EMPTY_TASK_COUNTS.todo,
        in_progress: parsed.data.taskCounts?.in_progress ?? EMPTY_TASK_COUNTS.in_progress,
        review: parsed.data.taskCounts?.review ?? EMPTY_TASK_COUNTS.review,
        done: parsed.data.taskCounts?.done ?? EMPTY_TASK_COUNTS.done,
      },
    }
  }

  const fallback = ProjectDetailsSchema.safeParse(data)
  if (fallback.success) {
    // eslint-disable-next-line no-console
    console.warn('[API] project detail response missing wrapper, applying fallback shape')
    return {
      project: hydrateProjectDetail(fallback.data),
      members: [],
      taskCounts: { ...EMPTY_TASK_COUNTS },
    }
  }

  console.error('Project API response validation failed:', parsed.error)
  console.error('Project fallback parsing failed:', fallback.error)
  throw new Error('Invalid project data received from server')
}

const normalizeProjectListResponse = (data: unknown): ProjectSummary[] => {
  const payload = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
        ? (data as any).results
        : Array.isArray((data as any)?.projects)
          ? (data as any).projects
          : null

  if (!payload) {
    console.error('Projects API response validation failed: missing results array', { data })
    throw new Error('Invalid projects data received from server')
  }

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

  const status = normalizeStatusForApi(data.status) ?? 'draft'
  const priority = normalizePriorityForApi(data.priority) ?? 'medium'
  const description = toOptionalTrimmed(data.description)
  const metadata = buildMetadataPayload({
    visibility: data.visibility,
    tags: data.tags,
    targetDate: data.targetDate,
  })
  const settings = buildSettingsPayload(data.defaultView)

  const payload: Record<string, unknown> = {
    name: data.name,
    status,
    priority,
    organizationId: data.organizationId,
  }

  if (description !== undefined) {
    payload.description = description
  }

  if (typeof data.divisionId === 'string') {
    payload.divisionId = data.divisionId
  } else if (data.divisionId === null) {
    payload.divisionId = null
  }

  // Move UI fields to metadata for backend compatibility
  if (metadata) {
    payload.metadata = metadata
  }

  if (settings) {
    payload.settings = settings
  }

  const response = await httpRequest<unknown>('POST', endpoint, {
    body: payload,
    signal: options?.signal,
    meta: {
      endpoint,
      method: 'POST',
      scope: { orgId: data.organizationId, divisionId: data.divisionId ?? undefined },
    },
  })

  // Temporary debug logging to inspect backend response shape during project creation.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[project-api] createProject raw response', response)
  }

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

  const status = normalizeStatusForApi(updates.status)
  const priority = normalizePriorityForApi(updates.priority)
  const name = toOptionalTrimmed(updates.name)
  const description = toOptionalTrimmed(updates.description)
  const metadata = buildMetadataPayload({
    visibility: updates.visibility,
    tags: updates.tags,
    targetDate: updates.targetDate,
  })
  const settings = buildSettingsPayload(updates.defaultView)

  const payload: Record<string, unknown> = {}

  if (name !== undefined) {
    payload.name = name
  }

  if (description !== undefined) {
    payload.description = description
  }

  if (status) {
    payload.status = status
  }

  if (priority) {
    payload.priority = priority
  }

  // Move UI fields to metadata for backend compatibility
  if (metadata) {
    payload.metadata = metadata
  }

  if (settings) {
    payload.settings = settings
  }

  // Handle divisionId if present in updates
  if ('divisionId' in updates && updates.divisionId !== undefined) {
    payload.divisionId = updates.divisionId
  }

  const response = await httpRequest<unknown>('PATCH', endpoint, {
    body: payload,
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

// Workspace snapshot API
export async function fetchProjectWorkspaceSnapshot(
  projectId: string,
  options: { orgId: string; divisionId: string; signal?: AbortSignal },
): Promise<ProjectWorkspaceSnapshot> {
  // Workspace snapshot requires organization and division context in the backend
  if (!options.orgId || !options.divisionId) {
    throw new Error('Organization ID and Division ID are required to fetch workspace snapshot')
  }

  const endpoint = `/api/organizations/${options.orgId}/divisions/${options.divisionId}/projects/${projectId}/workspace`
  const data = await httpRequest<unknown>('GET', endpoint, {
    signal: options?.signal,
    meta: {
      endpoint,
      method: 'GET',
      scope: { orgId: options.orgId, divisionId: options.divisionId }
    },
  })

  // Validate and return the workspace snapshot data
  // TODO: Add proper Zod schema validation for workspace snapshot
  return data as ProjectWorkspaceSnapshot
}
