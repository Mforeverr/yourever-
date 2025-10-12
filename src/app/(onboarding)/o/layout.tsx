'use client'

import type { ReactNode } from 'react'
import { useProtectedRoute } from '@/hooks/use-protected-route'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const { isLoading } = useProtectedRoute()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-muted-foreground">
        <span>Preparing your onboarding experience…</span>
      </div>
    )
  }

  return <div className="min-h-screen bg-muted/30">{children}</div>
}
