/**
 * Kanban Error Boundary Component
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Error boundary specifically for kanban board components
 * with graceful degradation and error reporting.
 */

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface KanbanErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

interface KanbanErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; retryCount: number }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
}

export class KanbanErrorBoundary extends React.Component<
  KanbanErrorBoundaryProps,
  KanbanErrorBoundaryState
> {
  constructor(props: KanbanErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<KanbanErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error for debugging
    console.error('[Kanban Error Boundary] Caught error:', {
      error,
      errorInfo,
      retryCount: this.state.retryCount,
    })

    // Show toast notification
    toast({
      title: 'Kanban Board Error',
      description: 'Something went wrong with the kanban board. Please try refreshing.',
      variant: 'destructive',
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props

    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }))
    } else {
      toast({
        title: 'Maximum Retries Exceeded',
        description: 'Please refresh the page to try again.',
        variant: 'destructive',
      })
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props

      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            retry={this.handleRetry}
            retryCount={this.state.retryCount}
          />
        )
      }

      return <DefaultKanbanErrorFallback
        error={this.state.error}
        retry={this.handleRetry}
        retryCount={this.state.retryCount}
      />
    }

    return this.props.children
  }
}

function DefaultKanbanErrorFallback({
  error,
  retry,
  retryCount
}: {
  error?: Error
  retry: () => void
  retryCount: number
}) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Kanban Board Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {error?.message || 'An unexpected error occurred while loading the kanban board.'}
          </p>

          {process.env.NODE_ENV === 'development' && error?.stack && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-mono text-muted-foreground">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={retry} disabled={retryCount >= 3}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again {retryCount > 0 && `(${retryCount}/3)`}
            </Button>

            {retryCount >= 3 && (
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for handling optimistic updates with rollback
export function useOptimisticUpdate<T>(
  mutationFn: (data: T) => Promise<any>,
  options: {
    onSuccess?: (data: any, variables: T) => void
    onError?: (error: Error, variables: T) => void
    onSettled?: (data: any, error: Error | null, variables: T) => void
  } = {}
) {
  const [pendingUpdates, setPendingUpdates] = React.useState<Map<string, {
    data: T
    timestamp: number
  }>>(new Map())

  const executeOptimisticUpdate = React.useCallback(async (
    id: string,
    data: T,
    optimisticData?: T
  ) => {
    // Add to pending updates
    setPendingUpdates(prev => new Map(prev).set(id, {
      data: optimisticData || data,
      timestamp: Date.now(),
    }))

    try {
      const result = await mutationFn(data)
      options.onSuccess?.(result, data)
      return result
    } catch (error) {
      options.onError?.(error as Error, data)
      throw error
    } finally {
      // Remove from pending updates
      setPendingUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      options.onSettled?.(undefined, null, data)
    }
  }, [mutationFn, options])

  const getOptimisticData = React.useCallback((id: string) => {
    return pendingUpdates.get(id)?.data
  }, [pendingUpdates])

  const isPending = React.useCallback((id: string) => {
    return pendingUpdates.has(id)
  }, [pendingUpdates])

  return {
    executeOptimisticUpdate,
    getOptimisticData,
    isPending,
    pendingUpdatesCount: pendingUpdates.size,
  }
}

// Hook for handling kanban board errors with retry logic
export function useKanbanErrorHandling() {
  const [error, setError] = React.useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleError = React.useCallback((err: Error) => {
    console.error('[Kanban Error] Error occurred:', err)
    setError(err)

    toast({
      title: 'Kanban Board Error',
      description: err.message || 'An error occurred with the kanban board',
      variant: 'destructive',
    })
  }, [])

  const retry = React.useCallback(async (retryFn?: () => Promise<void>) => {
    if (!retryFn) {
      window.location.reload()
      return
    }

    setIsRetrying(true)
    setError(null)

    try {
      await retryFn()
      toast({
        title: 'Success',
        description: 'Kanban board has been restored',
      })
    } catch (err) {
      handleError(err as Error)
    } finally {
      setIsRetrying(false)
    }
  }, [handleError])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError,
  }
}