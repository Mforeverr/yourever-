import type {
  ApiSearchResult,
  QuickAddSubmitPayload,
  QuickAddType,
} from "@/types/command-palette"
import { httpRequest } from "@/lib/api/http"

const QUICK_CREATE_ENDPOINTS: Record<QuickAddType, string> = {
  task: "/api/tasks/quick",
  project: "/api/projects/quick",
  doc: "/api/docs/quick",
  channel: "/api/channels/quick",
  event: "/api/events/quick",
}

export interface SearchWorkspaceRequest {
  query: string
  orgId?: string
  divisionId?: string
  limit?: number
  signal?: AbortSignal
}

export async function searchWorkspace({
  query,
  orgId,
  divisionId,
  limit,
  signal,
}: SearchWorkspaceRequest): Promise<ApiSearchResult[]> {
  const params = new URLSearchParams({ q: query })
  if (orgId) params.set("orgId", orgId)
  if (divisionId) params.set("divisionId", divisionId)
  if (typeof limit === "number") params.set("limit", String(limit))

  const payload = await httpRequest<{ results?: ApiSearchResult[] }>("GET", `/api/search/global?${params.toString()}`, {
    signal,
    meta: {
      endpoint: "/api/search/global",
      method: "GET",
      scope: { orgId, divisionId },
    },
  })

  return payload.results ?? []
}

export interface QuickCreateResponse {
  id: string
  href?: string
  title?: string
  name?: string
  [key: string]: unknown
}

export async function quickCreate(
  payload: QuickAddSubmitPayload,
  { signal }: { signal?: AbortSignal } = {}
): Promise<QuickCreateResponse> {
  const endpoint = QUICK_CREATE_ENDPOINTS[payload.type]
  if (!endpoint) {
    throw new Error(`No quick-create endpoint registered for type "${payload.type}"`)
  }

  return httpRequest<QuickCreateResponse>("POST", endpoint, {
    signal,
    body: payload,
    meta: {
      endpoint,
      method: "POST",
      scope: {
        orgId: payload.orgId,
        divisionId: payload.divisionId,
      },
      quickAddType: payload.type,
    },
  })
}
