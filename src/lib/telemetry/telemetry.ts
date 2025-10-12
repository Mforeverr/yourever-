'use client'

import { useEffect } from 'react'

export interface TelemetryEvent {
  name: string
  category?: string
  properties?: Record<string, unknown>
  timestamp?: number
}

type Primitive = string | number | boolean | null

const isBrowser = () => typeof window !== 'undefined'

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

const sanitizeProperties = (properties?: Record<string, unknown>): Record<string, Primitive> => {
  if (!properties) return {}
  return Object.entries(properties).reduce<Record<string, Primitive>>((acc, [key, value]) => {
    acc[key] = sanitizeValue(value)
    return acc
  }, {})
}

const consoleSink = (event: TelemetryEvent) => {
  if (process.env.NODE_ENV === 'production') return
  console.info('[telemetry]', event.name, {
    category: event.category,
    properties: sanitizeProperties(event.properties),
    timestamp: event.timestamp,
  })
}

type AnalyticsWindow = typeof window & {
  va?: { track?: (name: string, props?: Record<string, Primitive>) => void }
  plausible?: (name: string, options?: { props?: Record<string, Primitive> }) => void
  dataLayer?: Array<Record<string, Primitive>>
  analytics?: { track?: (name: string, props?: Record<string, Primitive>) => void }
}

const analyticsSink = (event: TelemetryEvent) => {
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
}

const customEventSink = (event: TelemetryEvent) => {
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
}

export const emitTelemetryEvent = (event: TelemetryEvent) => {
  if (!event?.name) return
  const enriched: TelemetryEvent = {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  }

  consoleSink(enriched)
  analyticsSink(enriched)
  customEventSink(enriched)
}

export const useTelemetryEvent = (event: TelemetryEvent | null | undefined) => {
  useEffect(() => {
    if (!event) return
    emitTelemetryEvent(event)
  }, [event])
}

