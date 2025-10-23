'use client'

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { createProject, updateProject, deleteProject } from '@/lib/api/projects'
import { buildProjectsByScopeKey, buildProjectDetailKey } from './use-project-query'
import type { CreateProjectRequest, UpdateProjectRequest } from '@/lib/api/projects'
import type { ProjectDetailResponse } from '@/modules/projects/contracts'

// Mutation options for better type safety
export type UseCreateProjectOptions = UseMutationOptions<
  ProjectDetailResponse,
  Error,
  CreateProjectRequest & { orgId: string; divisionId?: string | null },
  unknown
>

export type UseUpdateProjectOptions = UseMutationOptions<
  ProjectDetailResponse,
  Error,
  { projectId: string; updates: UpdateProjectRequest; orgId: string },
  unknown
>

export type UseDeleteProjectOptions = UseMutationOptions<
  void,
  Error,
  { projectId: string; orgId: string },
  unknown
>

// Hook for creating projects
export const useCreateProjectMutation = (options?: UseCreateProjectOptions) => {
  const queryClient = useQueryClient()

  return useMutation<ProjectDetailResponse, Error, CreateProjectRequest & { orgId: string; divisionId?: string | null }>({
    mutationFn: async ({ orgId, divisionId, ...projectData }) => {
      const createRequest: CreateProjectRequest = {
        ...projectData,
        organizationId: orgId,
        divisionId: divisionId || null,
      }

      return createProject(createRequest)
    },
    onSuccess: async (data, variables, context) => {
      // Invalidate and refetch projects list for the scope
      queryClient.invalidateQueries({
        queryKey: buildProjectsByScopeKey(variables.orgId, variables.divisionId || null)
      })

      // Optionally invalidate project detail queries
      queryClient.invalidateQueries({
        queryKey: ['project', 'detail']
      })
    },
    ...options,
  })
}

// Hook for updating projects
export const useUpdateProjectMutation = (options?: UseUpdateProjectOptions) => {
  const queryClient = useQueryClient()

  return useMutation<ProjectDetailResponse, Error, { projectId: string; updates: UpdateProjectRequest; orgId: string }>({
    mutationFn: async ({ projectId, updates, orgId }) => {
      return updateProject(projectId, updates, { orgId })
    },
    onSuccess: async (data, variables, context) => {
      // Update the specific project in cache
      queryClient.setQueryData(
        buildProjectDetailKey(variables.projectId),
        data
      )

      // Invalidate projects list to get updated summary
      queryClient.invalidateQueries({
        queryKey: ['projects', 'by-scope']
      })
    },
    ...options,
  })
}

// Hook for deleting projects
export const useDeleteProjectMutation = (options?: UseDeleteProjectOptions) => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { projectId: string; orgId: string }>({
    mutationFn: async ({ projectId, orgId }) => {
      await deleteProject(projectId, { orgId })
    },
    onSuccess: async (data, variables, context) => {
      // Remove project from cache
      queryClient.removeQueries({
        queryKey: buildProjectDetailKey(variables.projectId)
      })

      // Invalidate all projects lists
      queryClient.invalidateQueries({
        queryKey: ['projects', 'by-scope']
      })
    },
    ...options,
  })
}

// Utility hook for optimistic updates
export const useOptimisticProjectUpdate = () => {
  const queryClient = useQueryClient()

  const updateProjectOptimistically = (projectId: string, updates: Partial<ProjectDetailResponse['project']>) => {
    // Update the cache immediately for better UX
    queryClient.setQueryData(
      buildProjectDetailKey(projectId),
      (oldData: ProjectDetailResponse | undefined) => {
        if (!oldData) return oldData

        return {
          ...oldData,
          project: {
            ...oldData.project,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        }
      }
    )
  }

  return { updateProjectOptimistically }
}
