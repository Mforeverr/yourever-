'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, UserX } from 'lucide-react'

interface Person {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
}

interface DeactivateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person | null
}

export function DeactivateModal({ open, onOpenChange, person }: DeactivateModalProps) {
  const [confirmation, setConfirmation] = useState('')
  const [reason, setReason] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)

  const requiredConfirmation = person ? `deactivate ${person.name.toLowerCase()}` : ''

  const handleDeactivate = async () => {
    if (!person || confirmation !== requiredConfirmation) return

    setIsDeactivating(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('Deactivating:', { person, reason })
    
    // Reset form
    setConfirmation('')
    setReason('')
    setIsDeactivating(false)
    onOpenChange(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'member': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'guest': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Deactivate User
          </DialogTitle>
          <DialogDescription>
            This action will immediately revoke the user's access to the workspace.
          </DialogDescription>
        </DialogHeader>

        {person && (
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-surface rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={person.avatar} alt={person.name} />
                  <AvatarFallback>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{person.name}</div>
                  <div className="text-sm text-muted-foreground">{person.email}</div>
                  <Badge className={`mt-1 ${getRoleColor(person.role)}`}>
                    {person.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Deactivating this user will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Immediately revoke all workspace access</li>
                  <li>Remove them from all active channels</li>
                  <li>Cancel any pending invitations</li>
                  <li>Preserve their data for potential reactivation</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Confirmation */}
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <code className="bg-muted px-1 py-0.5 rounded text-sm">{requiredConfirmation}</code> to confirm
              </Label>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={requiredConfirmation}
                className="font-mono"
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for deactivation (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeactivating}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDeactivate}
            disabled={!person || confirmation !== requiredConfirmation || isDeactivating}
          >
            {isDeactivating ? 'Deactivating...' : 'Deactivate User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}