'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home, Building2, Users, FolderOpen, ArrowLeft } from 'lucide-react'
import { useScope } from '@/contexts/scope-context'

interface BreadcrumbNavigationProps {
  className?: string
  showHomeButton?: boolean
  showExitButton?: boolean
  currentPage?: string
}

// Icon mapping for breadcrumb types
const getIcon = (type: 'organization' | 'division' | 'project') => {
  switch (type) {
    case 'organization':
      return Building2
    case 'division':
      return Users
    case 'project':
      return FolderOpen
  }
}

export function BreadcrumbNavigation({
  className,
  showHomeButton = true,
  showExitButton = false,
  currentPage
}: BreadcrumbNavigationProps) {
  const {
    breadcrumbs,
    currentProject,
    exitProject,
    isReady,
  } = useScope()

  const handleExitProject = React.useCallback(() => {
    exitProject()
  }, [exitProject])

  if (!isReady) {
    return (
      <div className={cn('flex items-center gap-2 animate-pulse', className)}>
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-6 w-24 bg-muted rounded" />
        {currentPage && (
          <div className="h-6 w-20 bg-muted rounded" />
        )}
      </div>
    )
  }

  // Don't show breadcrumbs if there's no scope
  if (breadcrumbs.length === 0 && !currentPage) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Home button */}
      {showHomeButton && (
        <Link href="/workspace-hub">
          <Button variant="ghost" size="sm" className="p-2">
            <Home className="size-4" />
          </Button>
        </Link>
      )}

      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbList className="flex items-center">
          {breadcrumbs.map((crumb, index) => {
            const Icon = getIcon(crumb.type)
            const isLast = index === breadcrumbs.length - 1
            const isCurrentProject = crumb.id === currentProject?.id

            return (
              <React.Fragment key={crumb.id}>
                <BreadcrumbItem>
                  {isLast && isCurrentProject && !currentPage ? (
                    <BreadcrumbPage className="flex items-center gap-2">
                      <Icon className="size-4" />
                      <span className="font-medium">{crumb.name}</span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className={cn(
                        'flex items-center gap-2',
                        isCurrentProject && 'text-brand font-medium'
                      )}
                    >
                      <Link href={crumb.href}>
                        <Icon className="size-4" />
                        <span>{crumb.name}</span>
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>

                {(index < breadcrumbs.length - 1 || currentPage) && (
                  <BreadcrumbSeparator />
                )}
              </React.Fragment>
            )
          })}

          {/* Current page */}
          {currentPage && (
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <span className="capitalize">{currentPage}</span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Exit project button */}
      {showExitButton && currentProject && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitProject}
          className="flex items-center gap-1 ml-auto"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Exit Project</span>
        </Button>
      )}
    </div>
  )
}

// Simple breadcrumb for minimal display
interface SimpleBreadcrumbProps {
  items: Array<{
    name: string
    href?: string
    active?: boolean
  }>
  className?: string
}

export function SimpleBreadcrumb({ items, className }: SimpleBreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.active || !item.href ? (
                <BreadcrumbPage className={item.active ? 'font-medium' : ''}>
                  {item.name}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}