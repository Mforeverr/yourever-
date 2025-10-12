'use client'

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ActivityBar } from "@/components/shell/activity-bar"
import { SideBar } from "@/components/workspace/sidebar"
import { TabsBar } from "./tabs-bar"
import { StatusBar } from "./status-bar"
import { ScopeSwitcher } from "./scope-switcher"
import { RightPanel } from "@/components/explorer/right-panel"
import { RightPanelProvider } from "@/contexts/right-panel-context"
import { FloatingAIAssistant } from "@/components/ui/floating-ai-assistant"
import BottomPanel from "@/components/chat/bottom-panel"
import { ScopeProvider, useScope } from "@/contexts/scope-context"
import { useProtectedRoute } from "@/hooks/use-protected-route"
import { useUIStore } from "@/state/ui.store"
import type { UITab } from "@/state/ui.store"

interface WorkspaceShellProps {
  children: React.ReactNode
  className?: string
}

function WorkspaceShellContent({ children, className }: WorkspaceShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading: authLoading } = useProtectedRoute()
  const {
    organizations,
    currentOrgId,
    currentDivisionId,
    currentOrganization,
    currentDivision,
    setScope,
    setDivision,
    isReady
  } = useScope()
  const activeActivity = useUIStore((state) => state.activeActivity)
  const setActiveActivity = useUIStore((state) => state.setActiveActivity)
  const leftSidebarCollapsed = useUIStore((state) => state.leftSidebarCollapsed)
  const toggleLeftSidebar = useUIStore((state) => state.toggleLeftSidebar)
  const rightPanelCollapsed = useUIStore((state) => state.rightPanelCollapsed)
  const setRightPanelCollapsed = useUIStore((state) => state.setRightPanelCollapsed)
  const toggleRightPanel = useUIStore((state) => state.toggleRightPanel)
  const tabs = useUIStore((state) => state.tabs)
  const activeTabId = useUIStore((state) => state.activeTabId ?? undefined)
  const setActiveTabId = useUIStore((state) => state.setActiveTabId)
  const closeTab = useUIStore((state) => state.closeTab)
  const openTab = useUIStore((state) => state.openTab)
  const toggleSplitView = useUIStore((state) => state.toggleSplitView)
  const rightPanelSize = useUIStore((state) => state.rightPanelSize)
  const setRightPanelSize = useUIStore((state) => state.setRightPanelSize)

  const scopedBasePath = React.useMemo(() => {
    if (!currentOrgId || !currentDivisionId) return null
    return `/${currentOrgId}/${currentDivisionId}`
  }, [currentDivisionId, currentOrgId])

  const buildScopedPath = React.useCallback(
    (target: string) => {
      if (!scopedBasePath) {
        return '/select-org'
      }

      const normalizedTarget = target.startsWith('/') ? target : `/${target}`
      return `${scopedBasePath}${normalizedTarget}`.replace(/\/+$/, '')
    },
    [scopedBasePath]
  )

  const pushScopedPath = React.useCallback(
    (target: string) => {
      const destination = buildScopedPath(target)
      router.push(destination)
    },
    [buildScopedPath, router]
  )

  const applyScopeToCurrentPath = React.useCallback(
    (orgId: string, divisionId: string) => {
      const segments = pathname.split('/').filter(Boolean)
      const restSegments = segments.length >= 3 ? segments.slice(2) : ['dashboard']
      const trailingPath = restSegments.join('/')
      const destination = `/${orgId}/${divisionId}/${trailingPath}`.replace(/\/+$/, '')
      router.push(destination)
    },
    [pathname, router]
  )

  // Set active activity based on current path
  React.useEffect(() => {
    const segments = pathname.split('/').filter(Boolean)
    const scopedSegment =
      segments.length >= 3 ? segments[2] : segments.length >= 1 ? segments[0] : ''

    if (scopedSegment === 'dashboard' || scopedSegment === '') {
      setActiveActivity('home')
    } else if (scopedSegment === 'workspace') {
      setActiveActivity('workspace')
    } else if (scopedSegment === 'calendar') {
      setActiveActivity('calendar')
    } else if (scopedSegment === 'people') {
      setActiveActivity('people')
    } else if (scopedSegment === 'admin') {
      setActiveActivity('admin')
    } else if (scopedSegment.startsWith('c') || scopedSegment.startsWith('dm')) {
      setActiveActivity('channels')
    } else if (scopedSegment === 'explorer') {
      setActiveActivity('explorer')
    } else if (scopedSegment === 'ai') {
      setActiveActivity('ai')
    } else {
      setActiveActivity('home')
    }
  }, [pathname])

  // Handle activity changes with navigation
  const handleActivityChange = (activity: string) => {
    setActiveActivity(activity)

    switch (activity) {
      case 'home':
        pushScopedPath('/dashboard')
        break
      case 'workspace':
        pushScopedPath('/workspace')
        break
      case 'calendar':
        pushScopedPath('/calendar')
        break
      case 'people':
        pushScopedPath('/people')
        break
      case 'admin':
        pushScopedPath('/admin')
        break
      case 'channels':
        pushScopedPath('/channels')
        break
      case 'explorer':
        pushScopedPath('/explorer')
        break
      case 'ai':
        pushScopedPath('/ai')
        break
      default:
        pushScopedPath('/dashboard')
        break
    }
  }
  
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
  }

  const handleTabClose = (tabId: string) => {
    closeTab(tabId)
  }

  const handleNewTab = () => {
    const newTab: UITab = {
      id: `tab-${Date.now()}`,
      title: 'New Tab',
      type: 'task',
      isActive: true,
      isSplit: false,
    }
    openTab(newTab)
  }

  // Keyboard shortcut to toggle right panel (Ctrl/Cmd + B)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b' && !event.shiftKey) {
        event.preventDefault()
        toggleRightPanel()
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        toggleLeftSidebar()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        useUIStore.getState().toggleBottomPanel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLeftSidebar, toggleRightPanel])

  if (authLoading || !isReady) {
    return (
      <div className={cn("h-screen flex flex-col bg-background", className)}>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading workspace&hellip;
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-screen flex flex-col bg-background", className)}>
      {/* Header with Scope Switcher */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-panel border-b border-border">
        <ScopeSwitcher
          organizations={organizations}
          currentOrgId={currentOrgId ?? undefined}
          currentDivisionId={currentDivisionId ?? undefined}
          onScopeChange={(orgId, divisionId) => {
            setScope(orgId, divisionId)
            applyScopeToCurrentPath(orgId, divisionId)
          }}
          onDivisionChange={(divisionId) => {
            setDivision(divisionId)
            if (currentOrgId) {
              applyScopeToCurrentPath(currentOrgId, divisionId)
            }
          }}
        />
        <div className="flex items-center gap-2">
          {/* Add header actions here */}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar
          activeItem={activeActivity}
          onItemChange={handleActivityChange}
          isCollapsed={leftSidebarCollapsed}
          onToggleCollapse={toggleLeftSidebar}
        />

        {/* Resizable Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Side Bar */}
          <ResizablePanel 
            defaultSize={leftSidebarCollapsed ? 0 : 20} 
            minSize={leftSidebarCollapsed ? 0 : 15} 
            maxSize={leftSidebarCollapsed ? 0 : 30}
          >
            {!leftSidebarCollapsed && (
              <SideBar activePanel={activeActivity} />
            )}
          </ResizablePanel>
          
          <ResizableHandle withHandle className="w-px bg-border" />
          
          {/* Main Editor Area */}
          <ResizablePanel defaultSize={leftSidebarCollapsed ? 80 : 60}>
            <div className="h-full flex flex-col">
              {/* Tabs Bar */}
              <TabsBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabChange={handleTabChange}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onSplitView={toggleSplitView}
              />
              
              {/* Editor Content */}
              <div className="flex-1 overflow-auto">
                {children}
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle className="w-px bg-border" />
          
          {/* Right Panel */}
          <ResizablePanel
            defaultSize={rightPanelCollapsed ? 2 : rightPanelSize}
            minSize={rightPanelCollapsed ? 2 : 20}
            maxSize={rightPanelCollapsed ? 2 : 40}
            onResize={(size) => {
              if (!rightPanelCollapsed) {
                setRightPanelSize(size)
              }
            }}
          >
            <RightPanel onCollapsedChange={setRightPanelCollapsed} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <div className="relative">
        <StatusBar
          orgName={currentOrganization?.name ?? 'Select organization'}
          divisionName={currentDivision?.name ?? 'Select division'}
        />
        <FloatingAIAssistant />
      </div>
      <BottomPanel />
    </div>
  )
}

function WorkspaceShell({ children, className }: WorkspaceShellProps) {
  return (
    <RightPanelProvider>
      <ScopeProvider>
        <WorkspaceShellContent className={className}>
          {children}
        </WorkspaceShellContent>
      </ScopeProvider>
    </RightPanelProvider>
  )
}

export { WorkspaceShell }
