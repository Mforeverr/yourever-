/**
 * Connection Status Bar Component
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-20
 * Role: Frontend Architect
 *
 * Description: Comprehensive connection status indicator with real-time
 * connection state, error handling, reconnection status, and user feedback
 * for WebSocket connectivity issues.
 */

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Clock,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  error?: Error
  lastConnected?: Date
  reconnectAttempts: number
  maxReconnectAttempts: number
  latency?: number
}

interface ConnectionStatusBarProps {
  status: ConnectionStatus
  onReconnect?: () => void
  onDismissError?: () => void
  showDetails?: boolean
  position?: "top" | "bottom"
  className?: string
}

interface ConnectionMetricProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  variant?: "default" | "success" | "warning" | "error"
}

// ============================================================================
// Helper Components
// ============================================================================

function ConnectionMetric({
  label,
  value,
  icon,
  variant = "default",
}: ConnectionMetricProps) {
  const variantClasses = {
    default: "text-muted-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600",
  }

  return (
    <div className="flex items-center gap-2">
      {icon && <span className={variantClasses[variant]}>{icon}</span>}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-medium", variantClasses[variant])}>
          {value}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ConnectionStatusBar({
  status,
  onReconnect,
  onDismissError,
  showDetails = false,
  position = "top",
  className,
}: ConnectionStatusBarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  // Don't show if dismissed and no error
  if (dismissed && !status.error && status.connected) {
    return null
  }

  const getConnectionState = () => {
    if (status.connecting) return "connecting"
    if (status.reconnecting) return "reconnecting"
    if (status.connected) return "connected"
    return "disconnected"
  }

  const getConnectionColor = () => {
    switch (getConnectionState()) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "reconnecting":
        return "bg-yellow-500"
      case "disconnected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getConnectionIcon = () => {
    switch (getConnectionState()) {
      case "connected":
        return <Wifi className="h-4 w-4" />
      case "connecting":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "reconnecting":
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case "disconnected":
        return <WifiOff className="h-4 w-4" />
      default:
        return <WifiOff className="h-4 w-4" />
    }
  }

  const getConnectionText = () => {
    switch (getConnectionState()) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "reconnecting":
        return `Reconnecting... (${status.reconnectAttempts}/${status.maxReconnectAttempts})`
      case "disconnected":
        return "Offline"
      default:
        return "Unknown"
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    onDismissError?.()
  }

  const reconnectProgress = status.maxReconnectAttempts > 0
    ? (status.reconnectAttempts / status.maxReconnectAttempts) * 100
    : 0

  const positionClasses = {
    top: "top-0 left-0 right-0",
    bottom: "bottom-0 left-0 right-0",
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed z-50 bg-background border-b shadow-sm",
          positionClasses[position],
          className
        )}
      >
        {/* Compact Status Bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            {/* Connection Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  getConnectionColor()
                )}
              />
              <span className="text-sm font-medium">
                {getConnectionText()}
              </span>
              {status.connected && status.lastConnected && (
                <span className="text-xs text-muted-foreground">
                  for {formatDistanceToNow(status.lastConnected, { addSuffix: false })}
                </span>
              )}
            </div>

            {/* Error Message */}
            {status.error && !dismissed && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{status.error.message}</span>
              </div>
            )}

            {/* Latency Indicator */}
            {status.connected && status.latency !== undefined && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <span
                  className={cn(
                    "text-xs",
                    status.latency < 100 ? "text-green-600" :
                    status.latency < 300 ? "text-yellow-600" :
                    "text-red-600"
                  )}
                >
                  {status.latency}ms
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Reconnect Button */}
            {!status.connected && !status.connecting && onReconnect && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                className="h-7 px-3 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}

            {/* Dismiss Error Button */}
            {status.error && !status.connected && !dismissed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-7 w-7 p-0"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            )}

            {/* Expand/Collapse Details */}
            {(showDetails || status.error || status.reconnecting) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-7 w-7 p-0"
                  >
                    {isExpanded ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? "Hide" : "Show"} connection details</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Expanded Details Panel */}
        {isExpanded && (
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Connection Status */}
              <ConnectionMetric
                label="Status"
                value={getConnectionText()}
                icon={getConnectionIcon()}
                variant={
                  status.connected ? "success" :
                  status.connecting || status.reconnecting ? "warning" :
                  "error"
                }
              />

              {/* Reconnect Attempts */}
              {status.reconnecting && (
                <ConnectionMetric
                  label="Attempts"
                  value={`${status.reconnectAttempts}/${status.maxReconnectAttempts}`}
                  icon={<RefreshCw className="h-4 w-4" />}
                  variant="warning"
                />
              )}

              {/* Last Connected */}
              {status.lastConnected && (
                <ConnectionMetric
                  label="Last Connected"
                  value={formatDistanceToNow(status.lastConnected, { addSuffix: true })}
                  icon={<Clock className="h-4 w-4" />}
                  variant="default"
                />
              )}

              {/* Latency */}
              {status.connected && status.latency !== undefined && (
                <ConnectionMetric
                  label="Latency"
                  value={`${status.latency}ms`}
                  icon={<Activity className="h-4 w-4" />}
                  variant={
                    status.latency < 100 ? "success" :
                    status.latency < 300 ? "warning" :
                    "error"
                  }
                />
              )}
            </div>

            {/* Reconnect Progress */}
            {status.reconnecting && status.maxReconnectAttempts > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Reconnection Progress
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(reconnectProgress)}%
                  </span>
                </div>
                <Progress
                  value={reconnectProgress}
                  className="h-2"
                />
              </div>
            )}

            {/* Error Details */}
            {status.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Connection Error
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {status.error.message}
                    </p>
                    {status.error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer">
                          Technical Details
                        </summary>
                        <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                          {status.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              {!status.connected && !status.connecting && onReconnect && (
                <Button
                  size="sm"
                  onClick={onReconnect}
                  className="h-7 px-3 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reconnect Now
                </Button>
              )}

              {status.error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-7 px-3 text-xs"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// ============================================================================
// Specialized Components
// ============================================================================

/**
 * Minimal connection indicator for headers
 */
export function ConnectionIndicator({
  status,
  showText = false,
  className,
}: {
  status: ConnectionStatus
  showText?: boolean
  className?: string
}) {
  const getStateColor = () => {
    if (status.connected) return "bg-green-500"
    if (status.connecting || status.reconnecting) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getStateText = () => {
    if (status.connecting) return "Connecting"
    if (status.reconnecting) return "Reconnecting"
    if (status.connected) return "Online"
    return "Offline"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-colors duration-200",
          getStateColor()
        )}
      />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {getStateText()}
        </span>
      )}
    </div>
  )
}

/**
 * Connection status badge for user lists
 */
export function ConnectionBadge({
  status,
  className,
}: {
  status: ConnectionStatus
  className?: string
}) {
  const getBadgeVariant = () => {
    if (status.connected) return "default"
    if (status.connecting || status.reconnecting) return "secondary"
    return "destructive"
  }

  const getBadgeText = () => {
    if (status.connecting) return "Connecting..."
    if (status.reconnecting) return "Reconnecting..."
    if (status.connected) return "Online"
    return "Offline"
  }

  return (
    <Badge
      variant={getBadgeVariant()}
      className={cn("text-xs", className)}
    >
      {getBadgeText()}
    </Badge>
  )
}

export default ConnectionStatusBar