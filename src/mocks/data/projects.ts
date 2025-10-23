// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-24
// Role: Frontend

import type { CreateProjectRequest, UpdateProjectRequest } from '@/lib/api/projects'
import type { ProjectDetailResponse, ProjectSummary } from '@/modules/projects/contracts'

export const createMockProjectsList = (orgId: string, divisionId: string | null): ProjectSummary[] => {
  const mockProjects: ProjectSummary[] = [
    {
      id: 'company-allhands',
      slug: 'company-allhands',
      name: 'Company All-Hands',
      description: 'Company all-hands meeting planning and coordination',
      status: 'active',
      priority: 'medium',
      progressPercent: 45,
      startDate: '2024-10-01T00:00:00Z',
      targetDate: '2024-12-31T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-09-15T10:00:00Z',
      ownerId: 'user-1',
      divisionId: null,
      organizationId: orgId,
      visibility: 'organization',
      badgeCount: 3,
      tags: ['all-hands', 'company', 'meeting'],
    },
    {
      id: 'website-revamp',
      slug: 'website-revamp',
      name: 'Website Revamp',
      description: 'Refresh marketing site visuals, messaging, and conversion flows',
      status: 'active',
      priority: 'high',
      progressPercent: 58,
      startDate: '2024-08-01T00:00:00Z',
      targetDate: '2024-12-15T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-07-01T10:00:00Z',
      ownerId: 'user-1',
      divisionId: divisionId || 'marketing',
      organizationId: orgId,
      visibility: 'division',
      badgeCount: 12,
      tags: ['website', 'launch', 'marketing'],
    },
    {
      id: 'platform-infra',
      slug: 'platform-infra',
      name: 'Platform Infrastructure',
      description: 'Reduce hosting costs and improve reliability across platform services',
      status: 'planning',
      priority: 'medium',
      progressPercent: 35,
      startDate: '2024-09-15T00:00:00Z',
      targetDate: '2024-11-30T00:00:00Z',
      updatedAt: '2024-10-22T15:30:00Z',
      createdAt: '2024-08-20T10:00:00Z',
      ownerId: 'user-1',
      divisionId: divisionId || 'engineering',
      organizationId: orgId,
      visibility: 'organization',
      badgeCount: 9,
      tags: ['infra', 'cost', 'reliability'],
    },
  ]

  return mockProjects.filter((project) => {
    if (divisionId) {
      return project.divisionId === divisionId || project.divisionId === null
    }
    return project.divisionId === null
  })
}

export const createMockProjectCreation = (data: CreateProjectRequest): ProjectDetailResponse => {
  return {
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
            unit: '%',
          },
        ],
      },
    },
    members: [
      {
        userId: 'current-user',
        fullName: 'Current User',
        email: 'user@example.com',
        role: 'owner',
        joinedAt: new Date().toISOString(),
        isActive: true,
      },
    ],
    taskCounts: {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    },
  }
}

export const createMockProjectResponse = (projectId: string): ProjectDetailResponse => {
  return {
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
          'Set up continuous integration pipeline',
        ],
        outcomes: [
          'Improved user security',
          'Better user experience across devices',
          'Faster deployment cycles',
        ],
      },
      defaultView: 'board',
      integrations: [
        {
          id: 'github-1',
          provider: 'GitHub',
          status: 'connected',
          syncedAt: '2024-10-22T14:00:00Z',
        },
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
            unit: '%',
          },
          {
            id: 'team-velocity',
            label: 'Team Velocity',
            value: 12,
            target: 15,
            unit: 'points/week',
          },
        ],
      },
    },
    members: [
      {
        userId: 'user-1',
        fullName: 'Alice Johnson',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face',
        email: 'alice@example.com',
        role: 'owner',
        joinedAt: '2024-01-15T10:00:00Z',
        isActive: true,
      },
      {
        userId: 'user-2',
        fullName: 'Bob Smith',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face',
        email: 'bob@example.com',
        role: 'editor',
        joinedAt: '2024-01-20T14:30:00Z',
        isActive: true,
      },
      {
        userId: 'user-3',
        fullName: 'Carol Davis',
        email: 'carol@example.com',
        role: 'viewer',
        joinedAt: '2024-02-01T09:15:00Z',
        isActive: true,
      },
    ],
    taskCounts: {
      todo: 8,
      in_progress: 5,
      review: 3,
      done: 24,
    },
  }
}

export const mockUpdateProject = async (
  projectId: string,
  updates: UpdateProjectRequest,
): Promise<ProjectDetailResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const baseProject = createMockProjectResponse(projectId)
  return {
    ...baseProject,
    project: {
      ...baseProject.project,
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  }
}

export const mockDeleteProject = async (projectId: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  console.log(`Mock deleted project: ${projectId}`)
}
