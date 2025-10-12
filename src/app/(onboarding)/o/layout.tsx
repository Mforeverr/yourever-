'use client'

import type { ReactNode } from 'react'
import { useProtectedRoute } from '@/hooks/use-protected-route'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  useProtectedRoute()

  return <div className="min-h-screen bg-muted/30">{children}</div>
}
