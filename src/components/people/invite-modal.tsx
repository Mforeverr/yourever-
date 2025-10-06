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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Mail, UserPlus } from 'lucide-react'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [role, setRole] = useState<string>('member')
  const [message, setMessage] = useState('')

  const handleAddEmail = () => {
    if (currentEmail && currentEmail.includes('@') && !emails.includes(currentEmail)) {
      setEmails([...emails, currentEmail])
      setCurrentEmail('')
    }
  }

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleInvite = () => {
    // This would typically send invitations to the backend
    console.log('Inviting:', { emails, role, message })
    
    // Reset form
    setEmails([])
    setCurrentEmail('')
    setRole('member')
    setMessage('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite People
          </DialogTitle>
          <DialogDescription>
            Send invitations to team members to join your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Addresses</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  className="pl-9"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleAddEmail}
                disabled={!currentEmail || !currentEmail.includes('@')}
              >
                Add
              </Button>
            </div>
            
            {/* Email Tags */}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1">
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access to all features</SelectItem>
                <SelectItem value="member">Member - Standard access</SelectItem>
                <SelectItem value="guest">Guest - Limited access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {emails.length > 0 && (
            <div className="bg-surface rounded-lg p-3">
              <p className="text-sm font-medium mb-2">Invitation Preview:</p>
              <p className="text-sm text-muted-foreground">
                You're inviting {emails.length} {emails.length === 1 ? 'person' : 'people'} as <span className="font-medium">{role}</span>.
                {message && ` Personal message: "${message}"`}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvite}
            disabled={emails.length === 0}
          >
            Send {emails.length} {emails.length === 1 ? 'Invitation' : 'Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}