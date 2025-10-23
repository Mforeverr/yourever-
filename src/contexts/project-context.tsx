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
import { useProjectDetailQuery, useProjectsByScopeQuery } from '@/hooks/api/use-project-query'
import { useUpdateProjectMutation } from '@/hooks/api/use-project-mutations'
import { buildProjectRoute, buildDivisionRoute, buildOrgRoute } from '@/lib/routing'
import { toast } from '@/hooks/use-toast'
import type { ProjectDetails, ProjectMember, ProjectSettings, ProjectSummary } from '@/modules/projects/contracts'

// Project-specific context for workspace pages
interface ProjectContextValue {
  // Project data
  project: ProjectDetails | null
  members: ProjectMember[]
  settings: ProjectSettings | null
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
    enabled: Boolean(effectiveProjectId && currentOrgId),
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

  // Compute permissions with enhanced access checking
  const permissions = useMemo(() => {
    if (!projectData?.members) {
      return { isOwner: false, canEdit: false, canView: false, hasAccess: false }
    }

    // This would typically use the current user's ID from auth context
    // For now, using a simple permission model based on member roles
    const hasOwner = projectData.members.some(member => member.role === 'owner')
    const hasEditor = projectData.members.some(member => member.role === 'editor')
    const hasViewer = projectData.members.some(member => member.role === 'viewer')
    const hasAnyRole = hasOwner || hasEditor || hasViewer

    return {
      isOwner: hasOwner,
      canEdit: hasOwner || hasEditor,
      canView: hasOwner || hasEditor || hasViewer,
      hasAccess: hasAnyRole,
    }
  }, [projectData?.members])

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

    const project = availableProjects.find(p => p.slug === slug)
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
    if (!projectData?.project || !currentOrgId || !currentDivisionId) {
      return null
    }

    return {
      id: projectData.project.id,
      name: projectData.project.name,
      href: buildProjectRoute(currentOrgId, currentDivisionId, projectData.project.id, 'board'),
    }
  }, [projectData?.project, currentOrgId, currentDivisionId])

  // Get update mutation
  const updateProjectMutation = useUpdateProjectMutation()

  // Project actions with actual API integration
  const updateProject = useCallback(async (updates: Partial<ProjectDetails>) => {
    if (!effectiveProjectId) {
      throw new Error('No project selected for update')
    }

    if (!currentOrgId) {
      throw new Error('No organization context available for update')
    }

    try {
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
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error
    }
  }, [effectiveProjectId, currentOrgId, updateProjectMutation])

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
    project: projectData?.project ?? null,
    members: projectData?.members ?? [],
    settings: null, // TODO: Load settings when available
    isLoading,
    error: error as Error | null,
    isValidating,

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
    isLoading,
    isValidating,
    error,
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
