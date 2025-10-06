import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"

interface PresenceAvatarGroupProps {
  users: Array<{
    id: string
    name: string
    avatar?: string
    status?: 'online' | 'away' | 'offline'
  }>
  max?: number
  className?: string
}

function PresenceAvatarGroup({ users, max = 5, className }: PresenceAvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remainingCount = users.length - max

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((user, index) => (
        <div key={user.id} className="relative" style={{ zIndex: max - index }}>
          <Avatar className="size-8 border-2 border-background">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user.status && (
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background",
                user.status === 'online' && "bg-green-500",
                user.status === 'away' && "bg-yellow-500",
                user.status === 'offline' && "bg-muted"
              )}
            />
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground"
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export { PresenceAvatarGroup }