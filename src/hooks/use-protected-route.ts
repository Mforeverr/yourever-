'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from './use-auth'
import { useScopeStore } from '@/state/scope.store'

export const useProtectedRoute = () => {
  const { isAuthenticated, isLoading, status } = useCurrentUser()
  const router = useRouter()
  const scopeStatus = useScopeStore((state) => state.status)
  const scopeReady = useScopeStore((state) => state.isReady)
  const shouldWaitForScope = scopeStatus !== 'idle' || scopeReady
  const isScopePending = shouldWaitForScope && scopeStatus !== 'ready' && scopeStatus !== 'error'
  const isPending = isLoading || status === 'pending' || isScopePending

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isPending, router])

  return { isAuthenticated, isLoading: isPending, status }
}
