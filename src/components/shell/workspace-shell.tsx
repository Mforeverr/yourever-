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
import { RightPanelProvider, useRightPanel } from "@/contexts/right-panel-context"
import { FloatingAIAssistant } from "@/components/ui/floating-ai-assistant"

interface WorkspaceShellProps {
  children: React.ReactNode
  className?: string
}

interface Tab {
  id: string
  title: string
  type: 'task' | 'project' | 'doc' | 'channel' | 'calendar' | 'timeline'
  isDirty?: boolean
  isActive?: boolean
}

interface Organization {
  id: string
  name: string
  divisions: Array<{
    id: string
    name: string
  }>
}

function WorkspaceShellContent({ children, className }: WorkspaceShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [activeActivity, setActiveActivity] = React.useState('home')
  const [activeTabId, setActiveTabId] = React.useState('dashboard')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = React.useState(false)
  const { isCollapsed: rightPanelCollapsed, setIsCollapsed: setRightPanelCollapsed } = useRightPanel()

  // Set active activity based on current path
  React.useEffect(() => {
    if (pathname.startsWith('/dashboard')) {
      setActiveActivity('home')
    } else if (pathname.startsWith('/workspace')) {
      setActiveActivity('workspace')
    } else if (pathname.startsWith('/calendar')) {
      setActiveActivity('calendar')
    } else if (pathname.startsWith('/people')) {
      setActiveActivity('people')
    } else if (pathname.startsWith('/admin')) {
      setActiveActivity('admin')
    } else if (pathname.startsWith('/c/') || pathname.startsWith('/dm/')) {
      setActiveActivity('channels')
    } else if (pathname.startsWith('/explorer')) {
      setActiveActivity('explorer')
    } else if (pathname.startsWith('/ai')) {
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
        router.push('/dashboard')
        break
      case 'workspace':
        router.push('/workspace')
        break
      case 'calendar':
        router.push('/calendar')
        break
      case 'people':
        router.push('/people')
        break
      case 'admin':
        router.push('/admin')
        break
      case 'channels':
        router.push('/c/general')
        break
      case 'explorer':
        router.push('/explorer')
        break
      case 'ai':
        router.push('/ai')
        break
      default:
        router.push('/dashboard')
        break
    }
  }
  
  const [tabs, setTabs] = React.useState<Tab[]>([
    { id: 'dashboard', title: 'Dashboard', type: 'project', isActive: true },
    { id: 'website-revamp', title: 'Website Revamp', type: 'project', isActive: false },
    { id: 'general-channel', title: '#general', type: 'channel', isActive: false, isDirty: true },
  ])

  const mockOrganizations: Organization[] = [
    {
      id: 'acme',
      name: 'Acme',
      divisions: [
        { id: 'marketing', name: 'Marketing' },
        { id: 'product', name: 'Product' },
        { id: 'engineering', name: 'Engineering' },
      ]
    },
    {
      id: 'yourever',
      name: 'Yourever Labs',
      divisions: [
        { id: 'design', name: 'Design' },
        { id: 'development', name: 'Development' },
      ]
    }
  ]

  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId)
    setTabs(prev => prev.map(tab => ({
      ...tab,
      isActive: tab.id === tabId
    })))
  }

  const handleTabClose = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId)
      if (tabId === activeTabId && newTabs.length > 0) {
        const newActiveTab = newTabs[0]
        setActiveTabId(newActiveTab.id)
        return newTabs.map(tab => ({
          ...tab,
          isActive: tab.id === newActiveTab.id
        }))
      }
      return newTabs.map(tab => ({ ...tab, isActive: tab.id === activeTabId }))
    })
  }

  const handleNewTab = () => {
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: 'New Tab',
      type: 'task',
      isActive: true
    }
    setTabs(prev => [
      ...prev.map(tab => ({ ...tab, isActive: false })),
      newTab
    ])
    setActiveTabId(newTab.id)
  }

  // Keyboard shortcut to toggle right panel (Ctrl/Cmd + B)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setRightPanelCollapsed(prev => !prev)
      }
      // Toggle left sidebar with Ctrl/Cmd + Shift + B
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        setLeftSidebarCollapsed(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <RightPanelProvider>
      <div className={cn("h-screen flex flex-col bg-background", className)}>
        {/* Header with Scope Switcher */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-panel border-b border-border">
          <ScopeSwitcher
            organizations={mockOrganizations}
            currentOrgId="acme"
            currentDivisionId="marketing"
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
            onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
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
              defaultSize={rightPanelCollapsed ? 2 : 25}
              minSize={rightPanelCollapsed ? 2 : 20}
              maxSize={rightPanelCollapsed ? 2 : 40}
            >
              <RightPanel onCollapsedChange={setRightPanelCollapsed} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />
    </RightPanelProvider>
  )
}

function WorkspaceShell({ children, className }: WorkspaceShellProps) {
  return (
    <RightPanelProvider>
      <WorkspaceShellContent className={className}>
        {children}
      </WorkspaceShellContent>
    </RightPanelProvider>
  )
}

export { WorkspaceShell }