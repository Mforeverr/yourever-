'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { resolveApiUrl } from '@/lib/api/endpoints'
import type { StoredOnboardingStatus } from '@/lib/auth-utils'
import { CURRENT_ONBOARDING_STATUS_VERSION } from '@/lib/onboarding-version'
import type { OnboardingStepId } from '@/lib/onboarding'

const SW_URL = '/onboarding-sync-sw.js'
const MESSAGE_SOURCE = 'onboarding-offline-queue'
const QUEUE_MESSAGE = 'onboarding.persist.queue'
const FLUSH_MESSAGE = 'onboarding.persist.flush'
const RESULT_SUCCESS = 'onboarding.persist.synced'
const RESULT_FAILURE = 'onboarding.persist.failed'
const RESULT_ERROR = 'onboarding.persist.sync-error'

const API_PATH = '/api/users/me/onboarding-progress'

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

const isSupportedEnvironment = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'indexedDB' in window

const waitForController = async (registration: ServiceWorkerRegistration | null) => {
  if (!registration) return null
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller
  }
  if (registration.active) {
    return registration.active
  }

  return new Promise<ServiceWorker | null>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(navigator.serviceWorker.controller ?? registration.active ?? null)
    }, 5_000)

    const handleChange = () => {
      clearTimeout(timeout)
      navigator.serviceWorker.removeEventListener('controllerchange', handleChange)
      resolve(navigator.serviceWorker.controller ?? registration.active ?? null)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleChange)
  })
}

const ensureRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isSupportedEnvironment()) {
    return null
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SW_URL, { scope: '/' })
      .catch((error) => {
        console.error('[onboarding-offline] failed to register service worker', error)
        return null
      })
  }

  try {
    const registration = await registrationPromise
    if (!registration) return null
    await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    console.error('[onboarding-offline] service worker ready wait failed', error)
    return null
  }
}

const postToServiceWorker = async (message: unknown) => {
  const registration = await ensureRegistration()
  if (!registration) {
    return false
  }

  const controller = await waitForController(registration)
  if (!controller) {
    return false
  }

  controller.postMessage(message)
  return true
}

const buildJobPayload = (
  token: string,
  status: StoredOnboardingStatus,
  originStepId: OnboardingStepId,
): Record<string, unknown> => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  token,
  endpoint: resolveApiUrl(API_PATH),
  body: { status },
  createdAt: Date.now(),
  schemaVersion: CURRENT_ONBOARDING_STATUS_VERSION,
  originStepId,
})

const enqueuePersistStatusJob = async (
  token: string,
  status: StoredOnboardingStatus,
  originStepId: OnboardingStepId,
) => {
  if (!isSupportedEnvironment()) {
    return false
  }

  return postToServiceWorker({
    source: MESSAGE_SOURCE,
    type: QUEUE_MESSAGE,
    payload: buildJobPayload(token, status, originStepId),
  })
}

const flushPersistQueue = async () => {
  if (!isSupportedEnvironment()) {
    return false
  }

  return postToServiceWorker({
    source: MESSAGE_SOURCE,
    type: FLUSH_MESSAGE,
  })
}

type QueueEvent =
  | { type: typeof RESULT_SUCCESS; payload: { id: string; endpoint: string } }
  | { type: typeof RESULT_FAILURE; payload: { id: string; endpoint: string } }
  | {
      type: typeof RESULT_ERROR
      payload: { id: string; endpoint: string; status: number; retryable: boolean; message?: string }
    }

type QueueListener = (event: QueueEvent) => void

const listeners = new Set<QueueListener>()

const dispatchEvent = (event: QueueEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('[onboarding-offline] queue listener failed', error)
    }
  })
}

const subscribeToMessages = () => {
  if (!isSupportedEnvironment()) {
    return () => {}
  }

  const handler = (event: MessageEvent) => {
    const data = event.data
    if (!data || typeof data !== 'object' || data.source !== MESSAGE_SOURCE) {
      return
    }
    if (!data.type || typeof data.type !== 'string') {
      return
    }

    if (data.type === RESULT_SUCCESS || data.type === RESULT_FAILURE || data.type === RESULT_ERROR) {
      dispatchEvent({ type: data.type, payload: data.payload })
    }
  }

  navigator.serviceWorker.addEventListener('message', handler)

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler)
  }
}

export const useOnboardingOfflineQueue = () => {
  const mountedRef = useRef(false)
  const isSupported = useMemo(() => isSupportedEnvironment(), [])

  useEffect(() => {
    if (!isSupported) {
      return
    }

    mountedRef.current = true
    let unsubscribe = () => {}

    ensureRegistration()
      .then((registration) => {
        if (!mountedRef.current || !registration) return
        unsubscribe = subscribeToMessages()
        void flushPersistQueue()
      })
      .catch((error) => {
        console.error('[onboarding-offline] failed to initialize queue', error)
      })

    const handleOnline = () => {
      void flushPersistQueue()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      mountedRef.current = false
      window.removeEventListener('online', handleOnline)
      unsubscribe()
    }
  }, [isSupported])

  const enqueue = useCallback(
    async (token: string, status: StoredOnboardingStatus, originStepId: OnboardingStepId) => {
      if (!isSupported) {
        return false
      }
      const success = await enqueuePersistStatusJob(token, status, originStepId)
      if (!success) {
        console.warn('[onboarding-offline] failed to enqueue onboarding status update')
      }
      return success
    },
    [isSupported],
  )

  const flush = useCallback(async () => {
    if (!isSupported) {
      return false
    }
    return flushPersistQueue()
  }, [isSupported])

  const addListener = useCallback((listener: QueueListener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])

  return {
    isSupported,
    enqueue,
    flush,
    addListener,
  }
}

export type { QueueEvent }

