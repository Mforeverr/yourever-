'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, Clock, Check, X, ExternalLink, AlertTriangle } from 'lucide-react'
import { type Invitation } from '@/hooks/use-organizations'
import { useAcceptInvitation } from '@/hooks/use-organizations'
import { formatDistanceToNow } from 'date-fns'
import { Loader2 } from 'lucide-react'

interface InvitationCardProps {
  invitation: Invitation
  onAccept?: (invitation: Invitation) => void
  compact?: boolean
}

export function InvitationCard({ invitation, onAccept, compact = false }: InvitationCardProps) {
  const acceptInvitationMutation = useAcceptInvitation()

  const handleAccept = async () => {
    try {
      await acceptInvitationMutation.mutateAsync(invitation.id)
      onAccept?.(invitation)
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }

  const isExpired = invitation.expires_at
    ? new Date(invitation.expires_at) < new Date()
    : false

  const isPending = invitation.status === 'pending'
  const isProcessing = acceptInvitationMutation.isPending

  if (compact) {
    return (
      <Card className={cn(
        "border-l-4 transition-all",
        isExpired ? "border-l-orange-500 opacity-75" : "border-l-blue-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full",
                isExpired ? "bg-orange-100" : "bg-blue-100"
              )}>
                {isExpired ? (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                ) : (
                  <Mail className="h-4 w-4 text-blue-600" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Invitation to {invitation.org_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  as {invitation.role} • {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {isPending && !isExpired && (
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isProcessing}
              >
                {isProcessing ? 'Accepting...' : 'Accept'}
              </Button>
            )}
            {isExpired && (
              <Badge variant="outline" className="text-orange-600">
                Expired
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isExpired && "opacity-75"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isExpired ? "bg-orange-100" : "bg-blue-100"
            )}>
              {isExpired ? (
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              ) : (
                <Mail className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">
                {isExpired ? 'Expired Invitation' : 'Join Team'}
              </CardTitle>
              <CardDescription>
                You've been invited to join {invitation.org_name}
                {invitation.division_name && ` (${invitation.division_name})`}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">
            {invitation.role}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invitation Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invited by:</span>
            <div className="flex items-center space-x-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {invitation.inviter_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span>{invitation.inviter_name || 'Someone'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invited:</span>
            <span>{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}</span>
          </div>

          {invitation.expires_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span className={cn(
                  isExpired ? "text-orange-600" : "text-muted-foreground"
                )}>
                  {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {invitation.message && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm italic">"{invitation.message}"</p>
          </div>
        )}

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="flex space-x-2">
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button variant="outline" size="sm">
              Decline
            </Button>
          </div>
        )}

        {isExpired && (
          <div className="flex items-center space-x-2 text-sm text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            <span>This invitation has expired</span>
          </div>
        )}

        {!isPending && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {invitation.status === 'accepted' && (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span>Already accepted</span>
              </>
            )}
            {invitation.status === 'declined' && (
              <>
                <X className="h-4 w-4 text-red-600" />
                <span>Declined</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}