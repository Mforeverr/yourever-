/**
 * Kanban Board Wrapper with Scope Integration
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Wrapper component that integrates the kanban board
 * with the existing scope-based routing system and provides proper
 * context and error boundaries.
 */

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { useScope } from "@/contexts/scope-context"
import { useKanbanStore, useActiveBoard } from "@/state/kanban.store"
import { useBoardsQuery } from "@/hooks/api/use-task-queries"
import { useKanbanWebSocket } from "@/hooks/use-kanban-websocket"
import { KanbanErrorBoundary } from "./kanban-error-boundary"
import { BoardView } from "./board-view"
import { TaskPropertiesGrid } from "@/components/ui/task-properties-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import {
  Settings,
  Users,
  BarChart3,
  Plus,
  AlertTriangle,
  Loader2
} from "lucide-react"

interface KanbanBoardWrapperProps {
  orgId: string
  divisionId: string
  projectId?: string
  boardId?: string
}

export function KanbanBoardWrapper({
  orgId,
  divisionId,
  projectId,
  boardId: boardIdProp,
}: KanbanBoardWrapperProps) {
  const router = useRouter()
  const params = useParams()
  const { currentOrgId, currentDivisionId, isReady: scopeReady } = useScope()
  const { setActiveBoard, clearBoard, activeBoardId } = useKanbanStore()

  // Use boardId from props or params
  const boardId = boardIdProp || params.boardId as string

  // API queries
  const boardsQuery = useBoardsQuery(divisionId)
  const activeBoard = useActiveBoard()

  // WebSocket integration
  const webSocketState = useKanbanWebSocket({
    boardId,
    onConnected: () => {
      console.log('[Kanban Board] WebSocket connected')
    },
    onDisconnected: () => {
      console.log('[Kanban Board] WebSocket disconnected')
    },
    onError: (error) => {
      console.error('[Kanban Board] WebSocket error:', error)
    },
  })

  // Scope validation
  const isValidScope = React.useMemo(() => {
    return scopeReady &&
           currentOrgId === orgId &&
           currentDivisionId === divisionId
  }, [scopeReady, currentOrgId, currentDivisionId, orgId, divisionId])

  // Auto-select first board if none specified
  React.useEffect(() => {
    if (boardsQuery.data && boardsQuery.data.length > 0 && !boardId) {
      const firstBoard = boardsQuery.data[0]
      router.replace(`/${orgId}/${divisionId}/kanban/${firstBoard.id}`)
    }
  }, [boardsQuery.data, boardId, orgId, divisionId, router])

  // Clear board when scope changes
  React.useEffect(() => {
    if (!isValidScope) {
      clearBoard()
    }
  }, [isValidScope, clearBoard])

  // Handle board selection
  const handleBoardSelect = (selectedBoardId: string) => {
    setActiveBoard(selectedBoardId)
    router.replace(`/${orgId}/${divisionId}/kanban/${selectedBoardId}`)
  }

  // Loading state
  if (!scopeReady) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // Scope validation error
  if (!isValidScope) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Scope Mismatch</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The requested kanban board is not available in your current scope.
            </p>
            <Button onClick={() => router.push('/workspace-hub')}>
              Return to Workspace Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Boards loading state
  if (boardsQuery.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading kanban boards...</p>
        </div>
      </div>
    )
  }

  // No boards available
  if (boardsQuery.data?.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>No Kanban Boards</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              There are no kanban boards available in this workspace.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Board
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Boards error state
  if (boardsQuery.error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <CardTitle>Failed to Load Boards</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {boardsQuery.error.message || 'An error occurred while loading kanban boards.'}
            </p>
            <Button onClick={() => boardsQuery.refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <KanbanErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[Kanban Board Wrapper] Error:', error, errorInfo)
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header with board selector and connection status */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Kanban Board</h1>

              {/* Board Selector */}
              {boardsQuery.data && boardsQuery.data.length > 1 && (
                <select
                  value={boardId || ''}
                  onChange={(e) => handleBoardSelect(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="">Select a board...</option>
                  {boardsQuery.data.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    webSocketState.isConnected ? 'bg-green-500' :
                    webSocketState.isReconnecting ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {webSocketState.isConnected ? 'Connected' :
                   webSocketState.isReconnecting ? 'Reconnecting...' : 'Disconnected'}
                </span>
              </div>

              {/* Board Actions */}
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Kanban Board */}
          <div className="flex-1">
            <BoardView boardId={boardId} />
          </div>

          {/* Sidebar with task properties */}
          {activeBoard && (
            <div className="w-80 border-l bg-background/50 p-4">
              <Tabs defaultValue="properties" className="h-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="properties" className="text-xs">
                    Properties
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="members" className="text-xs">
                    Members
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="properties" className="mt-4">
                  <TaskPropertiesGrid editable />
                </TabsContent>

                <TabsContent value="activity" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        Activity feed coming soon...
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="members" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Board Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        Member management coming soon...
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </KanbanErrorBoundary>
  )
}