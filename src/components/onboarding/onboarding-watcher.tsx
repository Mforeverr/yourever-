'use client'

import { useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-auth'
import { ONBOARDING_STEPS, getFirstIncompleteStep } from '@/lib/onboarding'

const ONBOARDING_ROOT = '/o'

export function OnboardingWatcher() {
  const { user, onboardingStatus } = useCurrentUser()
  const pathname = usePathname()
  const router = useRouter()

  const isOnboardingRoute = useMemo(() => pathname.startsWith(ONBOARDING_ROOT), [pathname])

  useEffect(() => {
    if (!user || !onboardingStatus) return

    if (!onboardingStatus.completed && !isOnboardingRoute) {
      const targetStep = getFirstIncompleteStep(onboardingStatus) ?? ONBOARDING_STEPS[0]
      router.replace(targetStep.path)
      return
    }

    if (onboardingStatus.completed && isOnboardingRoute) {
      router.replace('/select-org')
    }
  }, [isOnboardingRoute, onboardingStatus, router, user])

  return null
}
