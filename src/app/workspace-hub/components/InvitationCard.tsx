'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Mail, Clock, Check, X, ExternalLink, AlertTriangle, UserPlus } from 'lucide-react'
import { type Invitation, type Organization } from '@/hooks/use-organizations'
import { useAcceptInvitation, useDeclineInvitation } from '@/hooks/use-organizations'
import { formatDistanceToNow } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvitationCardProps {
  invitation: Invitation
  onAccept?: (invitation: Invitation, organization: Organization) => void
  compact?: boolean
  onDecline?: (invitation: Invitation) => void
}

export function InvitationCard({ invitation, onAccept, onDecline, compact = false }: InvitationCardProps) {
  const acceptInvitationMutation = useAcceptInvitation()
  const declineInvitationMutation = useDeclineInvitation()

  const handleAccept = async () => {
    try {
      const organization = await acceptInvitationMutation.mutateAsync(invitation.id)
      onAccept?.(invitation, organization)
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }

  const handleDecline = async () => {
    try {
      await declineInvitationMutation.mutateAsync(invitation.id)
      onDecline?.(invitation)
    } catch (error) {
      // Error is handled by the mutation hook
    }
  }

  const isExpired = invitation.expires_at
    ? new Date(invitation.expires_at) < new Date()
    : false

  const isPending = invitation.status === 'pending'
  const isProcessing = acceptInvitationMutation.isPending || declineInvitationMutation.isPending
  const isDeclining = declineInvitationMutation.isPending

  const normalizedRole = invitation.role?.toLowerCase()
  const roleLabel =
    normalizedRole === 'owner'
      ? 'Owner access'
      : normalizedRole === 'admin'
        ? 'Admin access'
        : normalizedRole === 'member'
          ? 'Member access'
          : invitation.role

  const inviterName = invitation.inviter_name || 'A teammate'
  const organizationName = invitation.org_name || 'this organization'
  const invitedAgo = formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })
  const expiresIn = invitation.expires_at
    ? formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })
    : null

  const divisionLabel = invitation.division_name ?? 'Any division'

  if (compact) {
    return (
      <Card
        className={cn(
          'group relative overflow-hidden border border-border/50 bg-muted/40 backdrop-blur transition-all',
          isExpired
            ? 'border-orange-500/40 opacity-75'
            : 'hover:border-primary/50 hover:shadow-lg'
        )}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
            isExpired
              ? 'from-orange-500/80 via-amber-500/80 to-orange-500/80'
              : 'from-blue-500/70 via-indigo-500/70 to-sky-500/70'
          )}
        />
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl border bg-background/80',
                  isExpired
                    ? 'border-orange-500/40 text-orange-300'
                    : 'border-primary/40 text-primary'
                )}
              >
                {isExpired ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <UserPlus className="h-6 w-6" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {isExpired ? 'Expired invitation' : 'Workspace invitation'}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {invitation.org_name ?? 'Pending workspace'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {inviterName} is inviting you to "{organizationName}".
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="self-start uppercase tracking-wide">
              {roleLabel}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Invited by
              </p>
              <div className="mt-2 flex items-center gap-2 text-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {invitation.inviter_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{inviterName}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Division
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{divisionLabel}</span>
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Invitation timeline
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Sent {invitedAgo}</span>
                </p>
                {expiresIn && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{isExpired ? `Expired ${expiresIn}` : `Expires ${expiresIn}`}</span>
                  </p>
                )}
                {!expiresIn && <p className="text-xs text-muted-foreground">No expiration</p>}
              </div>
            </div>
          </div>

          {invitation.message && (
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm italic text-muted-foreground">
              “{invitation.message}”
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">Invitation sent to {invitation.email}</span>
            </div>
            {isPending && !isExpired ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={isProcessing}
                  onClick={handleDecline}
                >
                  {isDeclining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Declining…
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting…
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Accept invitation
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {invitation.status === 'accepted' && (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Already accepted</span>
                  </>
                )}
                {invitation.status === 'declined' && (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span>Declined</span>
                  </>
                )}
                {isExpired && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>This invitation has expired</span>
                  </>
                )}
              </div>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={handleDecline}
              className="sm:w-auto"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Decline
                </>
              )}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="sm:w-auto"
            >
              {isProcessing && !isDeclining ? (
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