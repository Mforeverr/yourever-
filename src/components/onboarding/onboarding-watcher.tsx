'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import { useOnboardingManifest } from '@/hooks/use-onboarding-manifest'
import { getFirstIncompleteStep } from '@/lib/onboarding'

const ONBOARDING_ROOT = '/o'

export function OnboardingWatcher() {
  const { user, onboardingStatus, status } = useCurrentUser()
  const { steps: manifestSteps } = useOnboardingManifest()
  const pathname = usePathname()
  const router = useRouter()

  const isOnboardingRoute = useMemo(() => pathname.startsWith(ONBOARDING_ROOT), [pathname])

  useEffect(() => {
    if (status === 'pending') return
    if (!user || !onboardingStatus) return

    if (!onboardingStatus.completed && !isOnboardingRoute) {
      const fallbackStep = manifestSteps[0]
      const targetStep = getFirstIncompleteStep(onboardingStatus, manifestSteps) ?? fallbackStep
      if (targetStep) {
        router.replace(targetStep.path)
      }
      return
    }

    if (onboardingStatus.completed && isOnboardingRoute) {
      router.replace('/welcome')
    }
  }, [isOnboardingRoute, manifestSteps, onboardingStatus, router, status, user])

  return null
}
