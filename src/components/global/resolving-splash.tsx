'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-auth'
import { resolveApiUrl } from '@/lib/api/endpoints'

export type ShortlinkSplashType = 'project' | 'task' | 'channel'

interface ResolvingSplashProps {
  type: ShortlinkSplashType
  entityId: string
}

interface ResolutionResponse {
  scopedUrl: string
}

const typeLabels: Record<ShortlinkSplashType, { noun: string; title: string }> = {
  project: { noun: 'project', title: 'Project' },
  task: { noun: 'task', title: 'Task' },
  channel: { noun: 'channel', title: 'Channel' },
}

export function ResolvingSplash({ type, entityId }: ResolvingSplashProps) {
  const router = useRouter()
  const { getAccessToken } = useCurrentUser()
  const [isResolving, setIsResolving] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)

  const labels = useMemo(() => typeLabels[type], [type])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    let redirectTimeout: number | null = null

    const resolveShortlink = async () => {
      setIsResolving(true)
      setError(null)

      try {
        const token = await getAccessToken()
        if (!token) {
          throw new Error('Authentication required to resolve this link.')
        }

        const response = await fetch(
          resolveApiUrl(`/api/shortlinks/resolve/${type}/${entityId}`),
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          const payload: Partial<ResolutionResponse & { detail?: string }> =
            await response.json().catch(() => ({}))
          const detail = typeof payload?.detail === 'string' ? payload.detail : undefined
          throw new Error(detail ?? 'Shortlink not found')
        }

        const data: ResolutionResponse = await response.json()
        if (!isMounted) {
          return
        }

        setResolvedUrl(data.scopedUrl)

        redirectTimeout = window.setTimeout(() => {
          router.replace(data.scopedUrl)
        }, 600)
      } catch (caught) {
        if (!isMounted) {
          return
        }

        if (caught instanceof DOMException && caught.name === 'AbortError') {
          return
        }

        const message =
          caught instanceof Error ? caught.message : 'Unable to resolve shortlink.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsResolving(false)
        }
      }

    }

    void resolveShortlink()

    return () => {
      isMounted = false
      controller.abort()
      if (redirectTimeout !== null) {
        window.clearTimeout(redirectTimeout)
      }
    }
  }, [entityId, getAccessToken, router, type])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {isResolving ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Resolving {labels.title}…</h2>
              <p className="text-sm text-muted-foreground">
                Finding your {labels.noun} inside the workspace
              </p>
            </div>
          </>
        ) : error ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{labels.title} not found</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.refresh()}>Try again</Button>
                <Button variant="ghost" asChild>
                  <Link href={error.toLowerCase().includes('authentication') ? '/login' : '/dashboard'}>
                    {error.toLowerCase().includes('authentication') ? 'Sign in' : 'Go to dashboard'}
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{labels.title} found!</h2>
              <p className="text-sm text-muted-foreground">
                Redirecting to your {labels.noun}…
              </p>
              {resolvedUrl && (
                <p className="text-xs text-muted-foreground">
                  If you are not redirected automatically,{' '}
                  <Link href={resolvedUrl} className="underline">
                    continue to the workspace
                  </Link>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
