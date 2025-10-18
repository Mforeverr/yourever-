'use client'

import { useEffect, useMemo } from 'react'

export interface TelemetryEvent {
  name: string
  category?: string
  properties?: Record<string, unknown>
  timestamp?: number
}

type Primitive = string | number | boolean | null

const isBrowser = () => typeof window !== 'undefined'


// Create a stable reference memoized function
const memoize = <T extends (...args: any[]) => any>(fn: T, getKey?: (...args: Parameters<T>) => string): T => {
  const cache = new Map<string, ReturnType<T>>()
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn(...args)
    cache.set(key, result)
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value
      if (firstKey) {
        cache.delete(firstKey)
      }
    }
    return result
  }) as T
}

const sanitizeValue = (value: unknown): Primitive => {
  if (value === null) return null
  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return value
    case 'bigint':
      return Number(value)
    default:
      if (value instanceof Date) {
        return value.toISOString()
      }
      if (Array.isArray(value)) {
        return value.length
      }
      if (value && typeof value === 'object') {
        try {
          return JSON.stringify(value)
        } catch {
          return '[unserializable]'
        }
      }
      return null
  }
}

const sanitizeProperties = memoize(
  (properties?: Record<string, unknown>): Record<string, Primitive> => {
    if (!properties) return {}
    return Object.entries(properties).reduce<Record<string, Primitive>>((acc, [key, value]) => {
      acc[key] = sanitizeValue(value)
      return acc
    }, {})
  },
  (properties) => properties ? JSON.stringify(Object.keys(properties).sort()) : 'empty'
)

const consoleSink = memoize(
  (event: TelemetryEvent) => {
    if (process.env.NODE_ENV === 'production') return
    console.info('[telemetry]', event.name, {
      category: event.category,
      properties: sanitizeProperties(event.properties),
      timestamp: event.timestamp,
    })
  },
  (event) => `${event.name}-${event.category}-${event.timestamp}`
)

type AnalyticsWindow = typeof window & {
  va?: { track?: (name: string, props?: Record<string, Primitive>) => void }
  plausible?: (name: string, options?: { props?: Record<string, Primitive> }) => void
  dataLayer?: Array<Record<string, Primitive>>
  analytics?: { track?: (name: string, props?: Record<string, Primitive>) => void }
}

const analyticsSink = memoize(
  (event: TelemetryEvent) => {
    if (!isBrowser()) return
    const global = window as AnalyticsWindow
    const properties = sanitizeProperties(event.properties)

    if (global.va?.track) {
      try {
        global.va.track(event.name, properties)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[telemetry] failed to send Vercel Analytics event', error)
        }
      }
    }

    if (global.analytics?.track) {
      try {
        global.analytics.track(event.name, properties)
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[telemetry] failed to send analytics.js event', error)
        }
      }
    }

    if (global.plausible) {
      try {
        global.plausible(event.name, { props: properties })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[telemetry] failed to send Plausible event', error)
        }
      }
    }

    if (Array.isArray(global.dataLayer)) {
      try {
        global.dataLayer.push({ event: event.name, ...properties })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[telemetry] failed to push event to dataLayer', error)
        }
      }
    }
  },
  (event) => `${event.name}-${event.category}-${event.timestamp}`
)

const customEventSink = memoize(
  (event: TelemetryEvent) => {
    if (!isBrowser()) return
    try {
      window.dispatchEvent(
        new CustomEvent('telemetry', {
          detail: {
            name: event.name,
            category: event.category,
            properties: sanitizeProperties(event.properties),
            timestamp: event.timestamp ?? Date.now(),
          },
        }),
      )
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[telemetry] failed to dispatch telemetry event', error)
      }
    }
  },
  (event) => `${event.name}-${event.category}-${event.timestamp}`
)

// Debouncing mechanism to prevent infinite loops
const eventCooldown = new Map<string, number>()
const COOLDOWN_MS = 100 // 100ms cooldown for same event

const shouldProcessEvent = (eventName: string): boolean => {
  const now = Date.now()
  const lastSent = eventCooldown.get(eventName)
  if (lastSent && now - lastSent < COOLDOWN_MS) {
    return false
  }
  eventCooldown.set(eventName, now)
  return true
}

export const emitTelemetryEvent = memoize(
  (event: TelemetryEvent) => {
    if (!event?.name) return

    // Prevent infinite loops with cooldown
    if (!shouldProcessEvent(event.name)) {
      return
    }

    const enriched: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp ?? Date.now(),
    }

    consoleSink(enriched)
    analyticsSink(enriched)
    customEventSink(enriched)
  },
  (event) => `${event.name}-${event.category}-${JSON.stringify(event?.properties || {})}-${event.timestamp}`
)

export const useTelemetryEvent = (event: TelemetryEvent | null | undefined) => {
  // Create a stable reference for the event to prevent unnecessary re-renders
  const stableEvent = useMemo(() => {
    if (!event) return null
    return {
      ...event,
      properties: event.properties ? { ...event.properties } : undefined,
    }
  }, [event?.name, event?.category, JSON.stringify(event?.properties || {}), event?.timestamp])

  useEffect(() => {
    if (!stableEvent) return
    emitTelemetryEvent(stableEvent)
  }, [stableEvent])
}

