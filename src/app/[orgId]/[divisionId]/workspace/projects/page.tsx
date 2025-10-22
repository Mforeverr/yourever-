'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { ProjectProvider } from '@/contexts/project-context'
import { ProjectList } from '@/components/project/project-list'
import { BreadcrumbNavigation } from '@/components/project/breadcrumb-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FolderOpen, Plus } from 'lucide-react'
import { useScope } from '@/contexts/scope-context'
import Link from 'next/link'

export default function ProjectsPage() {
  const params = useParams()
  const { currentOrganization, currentDivision, exitProject } = useScope()

  const handleProjectSelect = (project: any) => {
    // Navigate to project - this will be handled by the ProjectCard's navigation
    console.log('Selected project:', project)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface-panel">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link href={`/${params.orgId}/${params.divisionId}/dashboard`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <BreadcrumbNavigation />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Projects Sidebar */}
        <div className="w-80 border-r border-border bg-surface-panel">
          <ProjectList
            showCreateButton={true}
            compact={true}
            onProjectSelect={handleProjectSelect}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Projects</h1>
              <p className="text-lg text-muted-foreground">
                {currentOrganization?.name} / {currentDivision?.name}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Welcome Card */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Welcome to Your Projects
                  </CardTitle>
                  <CardDescription>
                    Select a project from the sidebar to view its details, or create a new project to get started.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <h4 className="font-medium">Getting Started</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Create a new project with the "New Project" button</li>
                        <li>• Click on any project in the sidebar to view details</li>
                        <li>• Use the search and filters to find specific projects</li>
                        <li>• Edit project settings using the dropdown menu</li>
                      </ul>
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-medium">Project Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Kanban boards for task management</li>
                        <li>• Timeline views for project planning</li>
                        <li>• Team collaboration and member management</li>
                        <li>• Progress tracking and reporting</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>

              {/* Project Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Projects</span>
                      <span className="font-medium">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Projects</span>
                      <span className="font-medium text-green-600">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <span className="font-medium text-blue-600">0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}