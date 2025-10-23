import { z } from 'zod'
import { createApiClient } from './client'
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
  options?: { signal?: AbortSignal }
): Promise<ProjectDetailResponse> {
  const client = createApiClient()

  const response = await client.get(`/api/projects/${projectId}`, {
    signal: options?.signal,
  })

  return normalizeProjectDetailResponse(response.data)
}

export async function fetchProjectsByScope(
  orgId: string,
  divisionId: string | null,
  options?: { signal?: AbortSignal }
): Promise<ProjectSummary[]> {
  const client = createApiClient()

  const url = divisionId
    ? `/api/organizations/${orgId}/divisions/${divisionId}/projects`
    : `/api/organizations/${orgId}/projects`

  const response = await client.get(url, {
    signal: options?.signal,
  })

  return normalizeProjectListResponse(response.data)
}

// Mock projects for fallback when API fails
export function createMockProjectsList(orgId: string, divisionId: string | null): ProjectSummary[] {
  const mockProjects = [
    {
      id: 'company-allhands',
      slug: 'company-allhands',
      name: 'Company All-Hands',
      description: 'Company all-hands meeting planning and coordination',
      status: 'active' as const,
      priority: 'medium' as const,
      progressPercent: 45,
      startDate: '2024-10-01T00:00:00Z',
      targetDate: '2024-12-31T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-09-15T10:00:00Z',
      ownerId: 'user-1',
      divisionId: null, // Company-wide project
      organizationId: orgId,
      visibility: 'organization' as const,
      badgeCount: 3,
      tags: ['all-hands', 'company', 'meeting'],
    },
    {
      id: 'website-revamp',
      slug: 'website-revamp',
      name: 'Website Revamp',
      description: 'Refresh marketing site visuals, messaging, and conversion flows',
      status: 'active' as const,
      priority: 'high' as const,
      progressPercent: 58,
      startDate: '2024-08-01T00:00:00Z',
      targetDate: '2024-12-15T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-07-01T10:00:00Z',
      ownerId: 'user-1',
      divisionId: divisionId || 'marketing',
      organizationId: orgId,
      visibility: 'division' as const,
      badgeCount: 12,
      tags: ['website', 'launch', 'marketing'],
    },
    {
      id: 'platform-infra',
      slug: 'platform-infra',
      name: 'Platform Infrastructure',
      description: 'Reduce hosting costs and improve reliability across platform services',
      status: 'planning' as const,
      priority: 'medium' as const,
      progressPercent: 35,
      startDate: '2024-09-15T00:00:00Z',
      targetDate: '2024-11-30T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-08-20T10:00:00Z',
      ownerId: 'user-1',
      divisionId: divisionId || 'engineering',
      organizationId: orgId,
      visibility: 'organization' as const,
      badgeCount: 9,
      tags: ['infra', 'cost', 'reliability'],
    }
  ]

  // Filter projects based on division scope
  return mockProjects.filter(project => {
    if (divisionId) {
      // When looking for specific division, show projects with that divisionId OR org-wide projects
      return project.divisionId === divisionId || project.divisionId === null
    } else {
      // When looking for org-wide projects, only show projects with no division
      return project.divisionId === null
    }
  })
}

// Enhanced project creation API
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
  options?: { signal?: AbortSignal }
): Promise<ProjectDetailResponse> {
  const client = createApiClient()

  const response = await client.post('/api/projects', data, {
    signal: options?.signal,
  })

  return normalizeProjectDetailResponse(response.data)
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
  options?: { signal?: AbortSignal }
): Promise<ProjectDetailResponse> {
  const client = createApiClient()

  const response = await client.patch(`/api/projects/${projectId}`, updates, {
    signal: options?.signal,
  })

  return normalizeProjectDetailResponse(response.data)
}

// Project deletion API
export async function deleteProject(
  projectId: string,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const client = createApiClient()

  await client.delete(`/api/projects/${projectId}`, {
    signal: options?.signal,
  })
}

// Mock functions for development and fallback
export function createMockProjectCreation(
  data: CreateProjectRequest
): ProjectDetailResponse {
  const mockProject: ProjectDetailResponse = {
    project: {
      id: `project-${Date.now()}`,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      progressPercent: 0,
      startDate: new Date().toISOString(),
      targetDate: data.targetDate,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ownerId: 'current-user',
      divisionId: data.divisionId || null,
      organizationId: data.organizationId,
      visibility: data.visibility,
      badgeCount: 0,
      tags: data.tags,
      overview: {
        goals: ['Complete project setup', 'Define project requirements'],
        outcomes: ['Successful project delivery'],
      },
      defaultView: data.defaultView,
      integrations: [],
      metrics: {
        health: 'green',
        scorecards: [
          {
            id: 'tasks-completed',
            label: 'Tasks Completed',
            value: 0,
            target: 100,
            unit: '%'
          }
        ]
      }
    },
    members: [
      {
        userId: 'current-user',
        fullName: 'Current User',
        email: 'user@example.com',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        isActive: true
      }
    ],
    taskCounts: {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0
    }
  }

  return mockProject
}

export async function mockUpdateProject(
  projectId: string,
  updates: UpdateProjectRequest
): Promise<ProjectDetailResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  const baseProject = createMockProjectResponse(projectId)

  return {
    ...baseProject,
    project: {
      ...baseProject.project,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
  }
}

export async function mockDeleteProject(projectId: string): Promise<void> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log(`Mock deleted project: ${projectId}`)
}

// Mock data fallback for development
export function createMockProjectResponse(projectId: string): ProjectDetailResponse {
  const mockProject: ProjectDetailResponse = {
    project: {
      id: projectId,
      slug: `project-${projectId}`,
      name: `Project ${projectId}`,
      description: 'A sample project for demonstration purposes',
      status: 'active',
      priority: 'medium',
      progressPercent: 65,
      startDate: '2024-01-15T00:00:00Z',
      targetDate: '2024-06-30T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-01-15T10:00:00Z',
      ownerId: 'user-1',
      divisionId: 'division-1',
      organizationId: 'org-1',
      visibility: 'division',
      badgeCount: 3,
      tags: ['frontend', 'react', 'typescript'],
      overview: {
        goals: [
          'Implement user authentication system',
          'Create responsive dashboard interface',
          'Set up continuous integration pipeline'
        ],
        outcomes: [
          'Improved user security',
          'Better user experience across devices',
          'Faster deployment cycles'
        ],
      },
      defaultView: 'board',
      integrations: [
        {
          id: 'github-1',
          provider: 'GitHub',
          status: 'connected',
          syncedAt: '2024-10-22T14:00:00Z'
        }
      ],
      coverImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
      metrics: {
        health: 'green',
        budgetUsedPercent: 45,
        scorecards: [
          {
            id: 'tasks-completed',
            label: 'Tasks Completed',
            value: 78,
            target: 100,
            unit: '%'
          },
          {
            id: 'team-velocity',
            label: 'Team Velocity',
            value: 12,
            target: 15,
            unit: 'points/week'
          }
        ]
      }
    },
    members: [
      {
        userId: 'user-1',
        fullName: 'Alice Johnson',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
        email: 'alice@example.com',
        role: 'owner',
        joinedAt: '2024-01-15T10:00:00Z',
        isActive: true
      },
      {
        userId: 'user-2',
        fullName: 'Bob Smith',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
        email: 'bob@example.com',
        role: 'editor',
        joinedAt: '2024-01-20T14:30:00Z',
        isActive: true
      },
      {
        userId: 'user-3',
        fullName: 'Carol Davis',
        email: 'carol@example.com',
        role: 'viewer',
        joinedAt: '2024-02-01T09:15:00Z',
        isActive: true
      }
    ],
    taskCounts: {
      todo: 8,
      in_progress: 5,
      review: 3,
      done: 24
    }
  }

  return mockProject
}
