// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import type { QuickAddType } from "@/types/command-palette"
import { resolveAuthToken } from "@/lib/api/client"
import { notifyUnauthorized } from "@/lib/api/unauthorized-handler"
import { resolveApiUrl } from "@/lib/api/endpoints"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface ApiErrorBody {
  detail?: string
  code?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly body?: ApiErrorBody | null

  constructor(message: string, status: number, body?: ApiErrorBody | null, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
    this.code = code ?? body?.code
  }
}

interface RequestOptions {
  signal?: AbortSignal
  body?: unknown
  headers?: Record<string, string>
  meta?: RequestMeta
}

export interface RequestMeta {
  requestId?: string
  endpoint: string
  method: HttpMethod | string
  scope?: {
    orgId?: string
    divisionId?: string
  }
  quickAddType?: QuickAddType
  [key: string]: unknown
}

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
}

export async function httpRequest<TResponse>(
  method: HttpMethod,
  endpoint: string,
  { signal, body, headers, meta }: RequestOptions = {},
): Promise<TResponse> {
  const requestId = meta?.requestId ?? generateRequestId()
  const requestInit: RequestInit = {
    method,
    signal,
  }

  const accessToken = await resolveAuthToken()

  const normalizedHeaders =
    method === "GET"
      ? {
          ...headers,
        }
      : {
          ...DEFAULT_HEADERS,
          ...headers,
        }

  if (accessToken) {
    normalizedHeaders.Authorization = `Bearer ${accessToken}`
  }

  requestInit.headers = normalizedHeaders

  if (body !== undefined && method !== "GET") {
    requestInit.body = typeof body === "string" ? body : JSON.stringify(body)
  }

  const requestUrl = endpoint.startsWith("http") ? endpoint : resolveApiUrl(endpoint)

  try {
    const response = await fetch(requestUrl, requestInit)
    if (!response.ok) {
      let errorBody: ApiErrorBody | undefined
      try {
        errorBody = (await response.json()) as ApiErrorBody
      } catch {
        errorBody = undefined
      }

      if (response.status === 401) {
        notifyUnauthorized()
      }

      logApiError({
        status: response.status,
        endpoint: requestUrl,
        method,
        body: errorBody,
        meta: {
          ...meta,
          requestId,
        },
      })

      throw new ApiError(
        errorBody?.detail ?? `Request to ${requestUrl} failed with status ${response.status}`,
        response.status,
        errorBody
      )
    }

    if (response.status === 204) {
      return undefined as TResponse
    }

    const contentType = response.headers.get("Content-Type") ?? ""
    if (contentType.includes("application/json")) {
      return (await response.json()) as TResponse
    }

    // Fallback to text for non-JSON responses
    const text = await response.text()
    return text as unknown as TResponse
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    logApiError({
      status: 0,
      endpoint: requestUrl,
      method,
      body: { detail: error instanceof Error ? error.message : "Unknown network error" },
      meta: {
        ...meta,
        requestId,
        cause: error instanceof Error ? error.stack : error,
      },
    })
    throw error
  }
}

export function logApiError({
  status,
  endpoint,
  method,
  body,
  meta,
}: {
  status: number
  endpoint: string
  method: string
  body?: ApiErrorBody
  meta?: RequestMeta
}) {
  console.error("[API] request failed", {
    timestamp: new Date().toISOString(),
    status,
    endpoint,
    method,
    detail: body?.detail,
    code: body?.code,
    meta,
  })
}

const generateRequestId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `req_${Math.random().toString(36).slice(2, 10)}`
}
