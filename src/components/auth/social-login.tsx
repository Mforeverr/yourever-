'use client'

import { Button } from '@/components/ui/button'
import { Github, Mail, Sparkles } from 'lucide-react'

export interface SocialLoginProps {
  onProviderLogin: (provider: 'google' | 'github' | 'magic-link') => void
  isLoading?: boolean
}

export function SocialLogin({ onProviderLogin, isLoading }: SocialLoginProps) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        onClick={() => onProviderLogin('google')}
        disabled={isLoading}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        onClick={() => onProviderLogin('github')}
        disabled={isLoading}
      >
        <Github className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  )
}
