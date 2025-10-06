'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Settings
} from "lucide-react"

interface StatusBarProps {
  orgName?: string
  divisionName?: string
  connectionStatus?: 'connected' | 'syncing' | 'offline'
  onlineUsers?: number
  className?: string
}

function StatusBar({ 
  orgName = "Acme", 
  divisionName = "Marketing",
  connectionStatus = 'connected',
  onlineUsers = 12,
  className 
}: StatusBarProps) {
  
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="size-3 text-green-500" />
      case 'syncing':
        return <RefreshCw className="size-3 text-yellow-500 animate-spin" />
      case 'offline':
        return <WifiOff className="size-3 text-red-500" />
      default:
        return <Wifi className="size-3 text-green-500" />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'syncing':
        return 'Syncing...'
      case 'offline':
        return 'Offline'
      default:
        return 'Connected'
    }
  }

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-1 bg-surface-panel border-t border-border text-xs",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Scope Badge */}
        <Badge variant="outline" className="text-xs px-2 py-1">
          {orgName} · {divisionName}
        </Badge>
        
        {/* Connection Status */}
        <div className="flex items-center gap-1 text-muted-foreground">
          {getConnectionIcon()}
          <span>{getConnectionText()}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Online Users */}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="size-3" />
          <span>{onlineUsers} online</span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <AlertCircle className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Settings className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export { StatusBar }