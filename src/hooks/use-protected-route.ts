'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from './use-auth'

export const useProtectedRoute = () => {
  const { isAuthenticated, isLoading, status } = useCurrentUser()
  const router = useRouter()
  const isPending = isLoading || status === 'pending'

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isPending, router])

  return { isAuthenticated, isLoading: isPending, status }
}
