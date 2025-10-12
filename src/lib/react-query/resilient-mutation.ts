'use client'

import { useRef } from 'react'
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'

import { ApiError } from '@/lib/api/http'
import type { ToastProps } from '@/components/ui/toast'
import { toast } from '@/hooks/use-toast'

type ToastContent = Pick<ToastProps, 'title' | 'description' | 'variant'> & {
  open?: boolean
}

type MessageFactory<TArgs extends unknown[]> =
  | ToastContent
  | null
  | undefined
  | ((...args: TArgs) => ToastContent | null | undefined)

interface ResilientMessages<TData, TError, TVariables, TContext> {
  pending?: MessageFactory<[TVariables]>
  retrying?: MessageFactory<[failureCount: number, maxAttempts: number, error: TError]>
  success?: MessageFactory<[TData, TVariables, TContext | undefined]>
  error?: MessageFactory<[TError, TVariables, TContext | undefined]>
}

export interface ResilientMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /**
   * Maximum number of failed attempts before surfacing an error to the user.
   * The default value of 3 results in up to three total attempts (initial + 2 retries).
   */
  maxRetryAttempts?: number
  /** Base delay in milliseconds used for exponential backoff. Defaults to 1.5s. */
  baseRetryDelayMs?: number
  /** Upper bound for retry delay in milliseconds. Defaults to 12s. */
  maxRetryDelayMs?: number
  /** Optional toast messaging hooks that display optimistic feedback during the mutation lifecycle. */
  messages?: ResilientMessages<TData, TError, TVariables, TContext>
  /** Called whenever the mutation schedules another retry attempt. */
  onRetry?: (failureCount: number, error: TError) => void
}

const isPromise = <T,>(value: unknown): value is Promise<T> =>
  typeof value === 'object' && value !== null && 'then' in value

const resolveMessage = <TArgs extends unknown[]>(
  factory: MessageFactory<TArgs> | undefined,
  ...args: TArgs
): ToastContent | null => {
  if (!factory) return null
  if (typeof factory === 'function') {
    return factory(...args) ?? null
  }
  return factory ?? null
}

const shouldRetryError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 401) return false
    if (error.status >= 500 || error.status === 0) return true
    return false
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('authenticat')) return false
    return true
  }
  return false
}

const computeDelay = (
  attempt: number,
  baseDelay: number,
  maxDelay: number,
) => {
  const exponential = baseDelay * 2 ** Math.max(0, attempt - 1)
  const jitter = Math.random() * 0.25 * exponential
  return Math.min(exponential + jitter, maxDelay)
}

export function useResilientMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: ResilientMutationOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const {
    messages,
    maxRetryAttempts = 3,
    baseRetryDelayMs = 1_500,
    maxRetryDelayMs = 12_000,
    retry,
    retryDelay,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    onRetry,
    ...rest
  } = options

  const toastController = useRef<ReturnType<typeof toast> | null>(null)
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleDismiss = (delay = 1_200) => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current)
    }
    dismissTimeout.current = setTimeout(() => {
      toastController.current?.dismiss()
      dismissTimeout.current = null
    }, delay)
  }

  const clearToast = () => {
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current)
      dismissTimeout.current = null
    }
    toastController.current?.dismiss()
    toastController.current = null
  }

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    retry:
      retry ??
      ((failureCount, error) => {
        const allow = failureCount < maxRetryAttempts && shouldRetryError(error)
        if (allow) {
          const message = resolveMessage(messages?.retrying, failureCount, maxRetryAttempts, error)
          if (message) {
            if (!toastController.current) {
              toastController.current = toast({ ...message })
            } else {
              toastController.current.update({ ...message })
            }
          }
          onRetry?.(failureCount, error)
        }
        return allow
      }),
    retryDelay:
      retryDelay ??
      ((attempt) => computeDelay(attempt, baseRetryDelayMs, maxRetryDelayMs)),
    async onMutate(variables) {
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current)
        dismissTimeout.current = null
      }

      const pendingMessage = resolveMessage(messages?.pending, variables)
      if (pendingMessage) {
        if (toastController.current) {
          toastController.current.update({ ...pendingMessage, open: true })
        } else {
          toastController.current = toast({ ...pendingMessage })
        }
      }

      const maybeContext = onMutate?.(variables)
      if (isPromise<TContext | void>(maybeContext)) {
        return maybeContext as Promise<TContext>
      }
      return maybeContext as TContext
    },
    onSuccess(data, variables, context) {
      const successMessage = resolveMessage(messages?.success, data, variables, context)
      if (successMessage) {
        if (toastController.current) {
          toastController.current.update({ ...successMessage, open: true })
        } else {
          toastController.current = toast({ ...successMessage })
        }
        scheduleDismiss()
      } else {
        clearToast()
      }
      onSuccess?.(data, variables, context)
    },
    onError(error, variables, context) {
      const errorMessage = resolveMessage(messages?.error, error, variables, context)
      if (errorMessage) {
        if (toastController.current) {
          toastController.current.update({ ...errorMessage, open: true })
        } else {
          toastController.current = toast({ ...errorMessage })
        }
      } else {
        clearToast()
      }
      onError?.(error, variables, context)
    },
    onSettled(data, error, variables, context) {
      if (!error) {
        // Toast already dismissed on success path when applicable
      }
      onSettled?.(data, error, variables, context)
      if (error) {
        // leave error toast open for manual dismissal
        return
      }
      if (!messages?.success) {
        clearToast()
      }
    },
    ...rest,
  })

  return mutation
}

