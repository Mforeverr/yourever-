'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface MagicLinkFormProps {
  onRequestMagicLink: (email: string) => Promise<void>
}

export function MagicLinkForm({ onRequestMagicLink }: MagicLinkFormProps) {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSending(true)
    setMessage(null)

    await onRequestMagicLink(email)

    setIsSending(false)
    setMessage('Check your inbox for a sign-in link. The link will expire in 15 minutes.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Work email</Label>
        <Input
          id="magic-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSending}>
        {isSending ? 'Sending…' : 'Email me a magic link'}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </form>
  )
}
