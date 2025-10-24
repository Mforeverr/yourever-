'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useScope } from '@/contexts/scope-context'
import { useAuth } from '@/contexts/auth-context'
import { useProjectDetailQuery, useProjectsByScopeQuery, useProjectWorkspaceSnapshotQuery } from '@/hooks/api/use-project-query'
import { useUpdateProjectMutation } from '@/hooks/api/use-project-mutations'
import { buildProjectRoute, buildDivisionRoute, buildOrgRoute } from '@/lib/routing'
import { toast } from '@/hooks/use-toast'
import type { ProjectDetails, ProjectMember, ProjectSettings, ProjectSummary, ProjectWorkspaceSnapshot } from '@/modules/projects/contracts'

// Project-specific context for workspace pages
interface ProjectContextValue {
  // Project data
  project: ProjectDetails | null
  members: ProjectMember[]
  settings: ProjectSettings | null
  workspace: ProjectWorkspaceSnapshot | null
  isLoading: boolean
  error: Error | null
  isValidating: boolean

  // Project state
  isOwner: boolean
  canEdit: boolean
  canView: boolean
  hasAccess: boolean

  // Project switching
  switchToProject: (projectId: string) => Promise<boolean>
  switchToProjectBySlug: (slug: string) => Promise<boolean>
  validateProjectAccess: (projectId: string) => boolean

  // Project actions
  updateProject: (updates: Partial<ProjectDetails>) => Promise<void>
  updateSettings: (settings: Partial<ProjectSettings>) => Promise<void>
  addMember: (userId: string, role: 'owner' | 'editor' | 'viewer') => Promise<void>
  removeMember: (userId: string) => Promise<void>
  refreshProject: () => void
  preloadProject: (projectId: string) => Promise<void>

  // Navigation
  navigateToView: (view: string) => void
  getCurrentView: () => string
  navigateToProject: (projectId: string, view?: string) => void
  exitProject: (targetPath?: string) => void

  // Project breadcrumb support
  getProjectBreadcrumb: () => { id: string; name: string; href: string } | null
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

interface ProjectProviderProps {
  children: React.ReactNode
  projectId?: string
}

const sanitizeSlug = (value: string | null | undefined): string =>
  (value ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const computeProjectSlug = (project: ProjectSummary): string =>
  sanitizeSlug(project.slug ?? project.name ?? project.id)

// Extract view from URL path
const extractViewFromPath = (pathname: string | null): string => {
  if (!pathname) return 'board'

  const segments = pathname.split('/').filter(Boolean)
  const workspaceIndex = segments.findIndex(seg => seg === 'workspace')

  if (workspaceIndex === -1) return 'board'

  const projectIndex = segments.findIndex(seg => seg === 'projects')

  if (projectIndex === -1 || projectIndex + 2 >= segments.length) {
    return 'board'
  }

  // The view comes after /workspace/projects/[projectId]/
  const view = segments[projectIndex + 2]

  // Validate view
  const validViews = ['board', 'list', 'timeline', 'calendar', 'mindmap', 'docs', 'settings']
  return validViews.includes(view) ? view : 'board'
}

export function ProjectProvider({ children, projectId }: ProjectProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ orgId?: string; divisionId?: string; projectId?: string }>()

  // Get auth context for user information
  const { user, isAuthenticated } = useAuth()

  // Get scope context
  const {
    currentOrgId,
    currentDivisionId,
    currentProjectId,
    setProjectScope,
    clearProjectScope,
    canSwitchToProject,
    navigateToProject: scopeNavigateToProject,
    exitProject: scopeExitProject,
    refresh: refreshScope,
  } = useScope()

  // Project ID from props or params
  const effectiveProjectId = projectId || params.projectId
  const [currentView, setCurrentView] = useState<string>(() => extractViewFromPath(pathname))
  const [isSwitching, setIsSwitching] = useState(false)

  // Update view when path changes
  useEffect(() => {
    const newView = extractViewFromPath(pathname)
    if (newView !== currentView) {
      setCurrentView(newView)
    }
  }, [pathname, currentView])

  // Get available projects in current scope for switching
  const { data: availableProjects } = useProjectsByScopeQuery(currentOrgId, currentDivisionId, {
    enabled: Boolean(currentOrgId),
  })

  // Project data query - enabled if we have projectId and orgId (divisionId can be null for org-wide projects)
  const {
    data: projectData,
    isLoading,
    error,
    refetch: refreshProject,
    isFetching: isValidating,
  } = useProjectDetailQuery(effectiveProjectId, {
    orgId: currentOrgId ?? undefined,
    enabled: Boolean(effectiveProjectId && currentOrgId),
  })

  // Workspace snapshot query - comprehensive project workspace data
  const {
    data: workspaceData,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
    refetch: refreshWorkspace,
  } = useProjectWorkspaceSnapshotQuery(effectiveProjectId, {
    orgId: currentOrgId,
    divisionId: currentDivisionId,
    enabled: Boolean(effectiveProjectId && currentOrgId && currentDivisionId),
  })

  // Enhanced scope synchronization with project data
  useEffect(() => {
    if (effectiveProjectId && projectData?.project) {
      // Create project summary for scope context
      const projectSummary: ProjectSummary = {
        id: projectData.project.id,
        slug: projectData.project.slug,
        name: projectData.project.name,
        description: projectData.project.description,
        status: projectData.project.status,
        priority: projectData.project.priority,
        progressPercent: projectData.project.progressPercent,
        startDate: projectData.project.startDate,
        targetDate: projectData.project.targetDate,
        updatedAt: projectData.project.updatedAt,
        createdAt: projectData.project.createdAt,
        ownerId: projectData.project.ownerId,
        divisionId: projectData.project.divisionId,
        organizationId: projectData.project.organizationId,
        visibility: projectData.project.visibility,
        tags: projectData.project.tags,
      }

      // Only update scope if different to prevent infinite loops
      if (currentProjectId !== effectiveProjectId) {
        setProjectScope(effectiveProjectId, {
          reason: 'project-provider-load',
          syncToRoute: false, // Don't sync to avoid infinite loops
          projectData: projectSummary,
        })
      }
    }
  }, [effectiveProjectId, projectData?.project, currentProjectId, setProjectScope])

  // Enhanced project access validation
  useEffect(() => {
    if (effectiveProjectId && !canSwitchToProject(effectiveProjectId)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project.',
        variant: 'destructive',
      })
      scopeExitProject()
      return
    }
  }, [effectiveProjectId, canSwitchToProject, scopeExitProject])

  // Combine loading states and errors from both queries
  const combinedIsLoading = isLoading || isWorkspaceLoading
  const combinedError = workspaceError || error
  const combinedIsValidating = isValidating || isWorkspaceLoading

  // Enhanced permissions with actual user context integration
  const permissions = useMemo(() => {
    // Prefer workspace data for permissions if available, fallback to project data
    const members = workspaceData?.members || projectData?.members

    if (!members) {
      console.warn('[project] No member data available for permission checking')
      return { isOwner: false, canEdit: false, canView: false, hasAccess: false }
    }

    // Get current user ID from auth context
    const currentUserId = user?.id || null
    const project = workspaceData?.project || projectData?.project
    const memberCount = members.length

    console.log('[project] Computing permissions for user', {
      currentUserId,
      isAuthenticated,
      projectId: project?.id,
      memberCount,
      hasWorkspaceData: !!workspaceData,
      hasProjectData: !!projectData
    })

    // If user is not authenticated, deny all permissions
    if (!isAuthenticated || !currentUserId) {
      console.warn('[project] User not authenticated for permission checking')
      return {
        isOwner: false,
        canEdit: false,
        canView: false,
        hasAccess: false,
      }
    }

    // Find the current user's membership
    const userMembership = members.find(member => member.userId === currentUserId)

    if (!userMembership) {
      console.warn('[project] User not found in project member list', { currentUserId })
      // Fallback: check if user is the project owner
      const projectOwnerId = project?.ownerId
      const isProjectOwner = projectOwnerId === currentUserId

      if (isProjectOwner) {
        console.log('[project] User identified as project owner via ownerId field')
        return {
          isOwner: true,
          canEdit: true,
          canView: true,
          hasAccess: true,
        }
      }

      // If project has no members yet, allow the creator (owner) to access it
      if (memberCount === 0 && isProjectOwner) {
        return {
          isOwner: true,
          canEdit: true,
          canView: true,
          hasAccess: true,
        }
      }

      return {
        isOwner: false,
        canEdit: false,
        canView: false, // Don't allow view if user is not a member
        hasAccess: false,
      }
    }

    const permissionLevel = {
      isOwner: userMembership.role === 'owner',
      canEdit: ['owner', 'editor'].includes(userMembership.role),
      canView: ['owner', 'editor', 'viewer'].includes(userMembership.role),
      hasAccess: true, // User is a member, so has some access
    }

    console.log('[project] User permissions computed', {
      currentUserId,
      role: userMembership.role,
      projectId: project?.id,
      ...permissionLevel
    })

    return permissionLevel
  }, [workspaceData?.members, projectData?.members, workspaceData?.project?.id, projectData?.project?.id, user?.id, isAuthenticated])

  // Enhanced navigation functions
  const navigateToView = useCallback((view: string) => {
    if (!effectiveProjectId || !currentOrgId || !currentDivisionId) {
      toast({
        title: 'Navigation Error',
        description: 'Cannot navigate: missing project or scope information.',
        variant: 'destructive',
      })
      return
    }

    const destination = buildProjectRoute(currentOrgId, currentDivisionId, effectiveProjectId, view)
    router.push(destination)
  }, [effectiveProjectId, currentOrgId, currentDivisionId, router])

  const getCurrentView = useCallback(() => {
    return currentView
  }, [currentView])

  // Project switching functions
  const switchToProject = useCallback(async (projectId: string): Promise<boolean> => {
    if (!currentOrgId || !currentDivisionId) {
      toast({
        title: 'Scope Required',
        description: 'Please select an organization and division first.',
        variant: 'destructive',
      })
      return false
    }

    if (!canSwitchToProject(projectId)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project.',
        variant: 'destructive',
      })
      return false
    }

    if (projectId === currentProjectId) {
      return true // Already on this project
    }

    setIsSwitching(true)
    try {
      // Use scope context to navigate to the project
      scopeNavigateToProject(projectId, 'board')
      return true
    } catch (error) {
      console.error('Failed to switch to project:', error)
      toast({
        title: 'Switch Failed',
        description: 'Failed to switch to the selected project.',
        variant: 'destructive',
      })
      return false
    } finally {
      setIsSwitching(false)
    }
  }, [currentOrgId, currentDivisionId, currentProjectId, canSwitchToProject, scopeNavigateToProject])

  const switchToProjectBySlug = useCallback(async (slug: string): Promise<boolean> => {
    if (!availableProjects) {
      toast({
        title: 'Projects Not Loaded',
        description: 'Project list is not available yet.',
        variant: 'destructive',
      })
      return false
    }

    const normalizedSlug = sanitizeSlug(slug)
    const project = availableProjects.find(candidate => computeProjectSlug(candidate) === normalizedSlug)
    if (!project) {
      toast({
        title: 'Project Not Found',
        description: `Project with slug "${slug}" was not found.`,
        variant: 'destructive',
      })
      return false
    }

    return await switchToProject(project.id)
  }, [availableProjects, switchToProject])

  const validateProjectAccess = useCallback((projectId: string): boolean => {
    return canSwitchToProject(projectId)
  }, [canSwitchToProject])

  // Enhanced project preloading
  const preloadProject = useCallback(async (projectId: string): Promise<void> => {
    if (!projectId || projectId === currentProjectId) {
      return
    }

    try {
      // Prefetch project data - this will be handled by the query client cache automatically
      // when the project detail query is mounted in the target component
      console.log('Preloading project:', { projectId, orgId: currentOrgId, divisionId: currentDivisionId })
    } catch (error) {
      console.warn('Failed to preload project:', error)
    }
  }, [currentProjectId, currentOrgId, currentDivisionId])

  // Enhanced navigation with scope integration
  const navigateToProject = useCallback((projectId: string, view: string = 'board') => {
    if (!currentOrgId || !currentDivisionId) {
      toast({
        title: 'Scope Required',
        description: 'Please select an organization and division before navigating to a project.',
        variant: 'destructive',
      })
      return
    }

    if (!canSwitchToProject(projectId)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have access to this project.',
        variant: 'destructive',
      })
      return
    }

    const destination = buildProjectRoute(currentOrgId, currentDivisionId, projectId, view)
    router.push(destination)
  }, [currentOrgId, currentDivisionId, canSwitchToProject, router])

  const exitProject = useCallback((targetPath?: string) => {
    clearProjectScope({ reason: 'project-exit' })

    if (currentOrgId && currentDivisionId) {
      const destination = targetPath || buildDivisionRoute(currentOrgId, currentDivisionId, '/workspace')
      router.replace(destination)
    } else if (currentOrgId) {
      const destination = targetPath || buildOrgRoute(currentOrgId, '/workspace')
      router.replace(destination)
    } else {
      router.replace('/workspace-hub')
    }
  }, [currentOrgId, currentDivisionId, clearProjectScope, router])

  // Project breadcrumb support
  const getProjectBreadcrumb = useCallback(() => {
    const project = workspaceData?.project || projectData?.project
    if (!project || !currentOrgId || !currentDivisionId) {
      return null
    }

    return {
      id: project.id,
      name: project.name,
      href: buildProjectRoute(currentOrgId, currentDivisionId, project.id, 'board'),
    }
  }, [workspaceData?.project, projectData?.project, currentOrgId, currentDivisionId])

  // Get update mutation
  const updateProjectMutation = useUpdateProjectMutation()

  // Enhanced project actions with comprehensive error handling and auth validation
  const updateProject = useCallback(async (updates: Partial<ProjectDetails>) => {
    console.log('[project] Starting project update', { effectiveProjectId, updates: Object.keys(updates) })

    // Pre-update validation
    if (!effectiveProjectId) {
      const error = new Error('No project selected for update')
      console.error('[project] Update failed: No project ID', error)
      throw error
    }

    if (!currentOrgId) {
      const error = new Error('No organization context available for update')
      console.error('[project] Update failed: No organization context', error)
      throw error
    }

    if (!permissions.canEdit) {
      const error = new Error('Insufficient permissions to update project')
      console.error('[project] Update failed: Permission denied', {
        projectId: effectiveProjectId,
        userId: user?.id || 'unknown',
        isAuthenticated,
        currentPermissions: permissions
      })
      throw error
    }

    try {
      console.log('[project] Calling update API', {
        projectId: effectiveProjectId,
        orgId: currentOrgId,
        updateFields: Object.keys(updates).filter(key => updates[key as keyof ProjectDetails] !== undefined)
      })

      await updateProjectMutation.mutateAsync({
        projectId: effectiveProjectId,
        orgId: currentOrgId,
        updates: {
          name: updates.name,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          tags: updates.tags,
          targetDate: updates.targetDate,
          coverImage: updates.coverImage,
          defaultView: updates.defaultView,
          visibility: updates.visibility,
          progressPercent: updates.progressPercent,
        }
      })

      console.log('[project] Project update completed successfully', {
        projectId: effectiveProjectId,
        updatedFields: Object.keys(updates)
      })

    } catch (error) {
      console.error('[project] Failed to update project', {
        projectId: effectiveProjectId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      // Enhanced error handling with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          throw new Error('Authentication required - please sign in again')
        }
        if (error.message.includes('403') || error.message.includes('forbidden')) {
          throw new Error('You do not have permission to update this project')
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new Error('Project not found or may have been deleted')
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network error - please check your connection and try again')
        }
      }

      throw error
    }
  }, [effectiveProjectId, currentOrgId, updateProjectMutation, permissions])

  const updateSettings = useCallback(async (settings: Partial<ProjectSettings>) => {
    if (!effectiveProjectId) return

    // TODO: Implement actual settings update when API is available
    console.log('Updating settings:', settings)
    refreshProject()
  }, [effectiveProjectId, refreshProject])

  const addMember = useCallback(async (userId: string, role: 'owner' | 'editor' | 'viewer') => {
    if (!effectiveProjectId) return

    // TODO: Implement actual member addition when API is available
    console.log('Adding member:', { userId, role })
    refreshProject()
  }, [effectiveProjectId, refreshProject])

  const removeMember = useCallback(async (userId: string) => {
    if (!effectiveProjectId) return

    // TODO: Implement actual member removal when API is available
    console.log('Removing member:', userId)
    refreshProject()
  }, [effectiveProjectId, refreshProject])

  const value: ProjectContextValue = useMemo(() => ({
    // Project data
    project: workspaceData?.project || projectData?.project ?? null,
    members: workspaceData?.members || projectData?.members ?? [],
    settings: null, // TODO: Load settings when available
    workspace: workspaceData ?? null,
    isLoading: combinedIsLoading,
    error: combinedError as Error | null,
    isValidating: combinedIsValidating,

    // Project state
    isOwner: permissions.isOwner,
    canEdit: permissions.canEdit,
    canView: permissions.canView,
    hasAccess: permissions.hasAccess,

    // Project switching
    switchToProject,
    switchToProjectBySlug,
    validateProjectAccess,

    // Project actions
    updateProject,
    updateSettings,
    addMember,
    removeMember,
    refreshProject,
    preloadProject,

    // Navigation
    navigateToView,
    getCurrentView,
    navigateToProject,
    exitProject,

    // Project breadcrumb support
    getProjectBreadcrumb,
  }), [
    projectData,
    workspaceData,
    combinedIsLoading,
    combinedIsValidating,
    combinedError,
    permissions,
    switchToProject,
    switchToProjectBySlug,
    validateProjectAccess,
    updateProject,
    updateSettings,
    addMember,
    removeMember,
    refreshProject,
    preloadProject,
    navigateToView,
    getCurrentView,
    navigateToProject,
    exitProject,
    getProjectBreadcrumb,
  ])

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}

// Hook for conditional project context usage
export const useProjectOptional = () => {
  const context = useContext(ProjectContext)
  return context ?? null
}
