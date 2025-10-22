'use client'

import { ReactNode } from 'react'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface ProjectWorkspaceLayoutProps {
  children: ReactNode
}

// Simple layout wrapper for project workspace pages
// The actual layout and project context is handled by individual pages
export default function ProjectWorkspaceRouteLayout({
  children,
}: ProjectWorkspaceLayoutProps) {
  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading project workspace...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}