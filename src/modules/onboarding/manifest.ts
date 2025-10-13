'use client'

import { ApiError } from '@/lib/api/http'
import { resolveApiUrl } from '@/lib/api/endpoints'
import type { OnboardingManifest, OnboardingStepId } from '@/lib/onboarding'

interface ManifestResponseBody {
  version?: string
  variant?: string | null
  updatedAt?: string | null
  steps?: Array<{
    id?: string
    title?: string
    description?: string
    path?: string
    required?: boolean
    canSkip?: boolean
  }>
}

const mapManifestResponse = (payload: ManifestResponseBody): OnboardingManifest => ({
  version: typeof payload.version === 'string' && payload.version.length > 0 ? payload.version : 'unknown',
  variant: typeof payload.variant === 'string' ? payload.variant : null,
  updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
  steps:
    Array.isArray(payload.steps)
      ? payload.steps.map((step) => {
          const id = (typeof step?.id === 'string' && step.id.length > 0 ? step.id : 'unknown') as OnboardingStepId

          return {
            id,
            title: typeof step?.title === 'string' ? step.title : 'Untitled step',
            description: typeof step?.description === 'string' ? step.description : '',
            path: typeof step?.path === 'string' ? step.path : '/o/unknown',
            required: Boolean(step?.required),
            canSkip: Boolean(step?.canSkip),
          }
        })
      : [],
})

export const fetchOnboardingManifest = async (): Promise<OnboardingManifest> => {
  const response = await fetch(resolveApiUrl('/api/onboarding/manifest'))

  if (!response.ok) {
    let detail: string | undefined
    try {
      const body = (await response.json()) as { detail?: string }
      detail = body?.detail
    } catch {
      detail = undefined
    }

    throw new ApiError(detail ?? 'Failed to load onboarding manifest', response.status)
  }

  const payload = (await response.json()) as ManifestResponseBody
  return mapManifestResponse(payload)
}
