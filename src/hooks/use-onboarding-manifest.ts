'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DEFAULT_ONBOARDING_MANIFEST,
  DEFAULT_ONBOARDING_STEPS,
  getCachedOnboardingManifest,
  getCachedOnboardingSteps,
  setCachedOnboardingManifest,
  type BaseOnboardingStep,
  type OnboardingManifest,
} from '@/lib/onboarding'
import { fetchOnboardingManifest } from '@/modules/onboarding/manifest'

export const ONBOARDING_MANIFEST_QUERY_KEY = ['onboarding', 'manifest'] as const

export interface UseOnboardingManifestResult {
  manifest: OnboardingManifest
  steps: BaseOnboardingStep[]
  isUsingFallback: boolean
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => Promise<OnboardingManifest | undefined>
}

export const useOnboardingManifest = (): UseOnboardingManifestResult => {
  const [resolvedManifest, setResolvedManifest] = useState<OnboardingManifest>(() =>
    getCachedOnboardingManifest() ?? DEFAULT_ONBOARDING_MANIFEST,
  )

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ONBOARDING_MANIFEST_QUERY_KEY,
    queryFn: fetchOnboardingManifest,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  })

  useEffect(() => {
    if (data) {
      setResolvedManifest(setCachedOnboardingManifest(data))
      return
    }

    setResolvedManifest(getCachedOnboardingManifest() ?? DEFAULT_ONBOARDING_MANIFEST)
  }, [data])

  const steps = useMemo(() => {
    const manifestSteps = resolvedManifest.steps ?? []
    if (manifestSteps.length > 0) {
      return manifestSteps
    }
    const cachedSteps = getCachedOnboardingSteps()
    return cachedSteps.length > 0 ? cachedSteps : DEFAULT_ONBOARDING_STEPS
  }, [resolvedManifest.steps])

  return {
    manifest: resolvedManifest,
    steps,
    isUsingFallback: !data,
    isLoading: isFetching,
    isError,
    error,
    refetch: async () => {
      const refreshed = await refetch()
      return refreshed.data
    },
  }
}
