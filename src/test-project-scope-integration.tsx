/**
 * Test file to demonstrate project and scope context integration
 * This file is for development testing and can be removed in production
 *
 * @author Eldrie
 * @date 2025-10-23
 * @role CTO Dev
 */

'use client'

import React from 'react'
import { ProjectProvider } from '@/contexts/project-context'
import { ScopeProvider } from '@/contexts/scope-context'
import { useProject } from '@/contexts/project-context'
import { useScope } from '@/contexts/scope-context'

/**
 * Test component to demonstrate the enhanced project and scope context integration
 */
function TestProjectScopeIntegration() {
  const project = useProject()
  const scope = useScope()

  const testProjectSwitching = async () => {
    // Test project switching functionality
    console.log('Testing project switching...')

    // Test switching by ID
    const success = await project.switchToProject('test-project-id')
    console.log('Switch by ID result:', success)

    // Test switching by slug
    const slugSuccess = await project.switchToProjectBySlug('test-project-slug')
    console.log('Switch by slug result:', slugSuccess)

    // Test validation
    const canAccess = project.validateProjectAccess('test-project-id')
    console.log('Can access project:', canAccess)
  }

  const testScopeIntegration = () => {
    // Test scope integration with project data
    console.log('Testing scope integration...')

    // Test project hierarchy
    const hierarchy = scope.getProjectHierarchy()
    console.log('Project hierarchy:', hierarchy)

    // Test breadcrumb generation
    const breadcrumb = project.getProjectBreadcrumb()
    console.log('Project breadcrumb:', breadcrumb)

    // Test scope validation
    const validation = scope.validateProjectScope('test-project-id')
    console.log('Scope validation:', validation)

    // Test available projects
    const availableProjects = scope.getAvailableProjects()
    console.log('Available projects:', availableProjects)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Project-Scope Integration Test</h2>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Project Context State:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify({
            projectId: project.project?.id,
            projectName: project.project?.name,
            isLoading: project.isLoading,
            isValidating: project.isValidating,
            error: project.error?.message,
            hasAccess: project.hasAccess,
            canEdit: project.canEdit,
            canView: project.canView,
            isOwner: project.isOwner,
            currentView: project.getCurrentView(),
            membersCount: project.members.length,
          }, null, 2)}
        </pre>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Scope Context State:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify({
            currentOrgId: scope.currentOrgId,
            currentDivisionId: scope.currentDivisionId,
            currentProjectId: scope.currentProjectId,
            projectName: scope.currentProject?.name,
            isReady: scope.isReady,
            status: scope.status,
            breadcrumbs: scope.breadcrumbs,
            organizationsCount: scope.organizations.length,
          }, null, 2)}
        </pre>
      </div>

      <div className="flex gap-4">
        <button
          onClick={testProjectSwitching}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Project Switching
        </button>

        <button
          onClick={testScopeIntegration}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Scope Integration
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Available Actions:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>✅ Enhanced project context with scope integration</li>
          <li>✅ Project switching functionality (by ID and slug)</li>
          <li>✅ Proper loading and error states</li>
          <li>✅ TypeScript type safety</li>
          <li>✅ Project breadcrumb support</li>
          <li>✅ Enhanced navigation functions</li>
          <li>✅ Project access validation</li>
          <li>✅ Scope context project support</li>
          <li>✅ State synchronization between contexts</li>
          <li>✅ Backward compatibility maintained</li>
        </ul>
      </div>
    </div>
  )
}

/**
 * Wrapper component that provides both contexts for testing
 */
export function TestProjectScopeWrapper() {
  const mockProjectId = 'test-project-id'

  return (
    <ScopeProvider>
      <ProjectProvider projectId={mockProjectId}>
        <TestProjectScopeIntegration />
      </ProjectProvider>
    </ScopeProvider>
  )
}

/**
 * Export for use in development/testing scenarios
 */
export default TestProjectScopeWrapper