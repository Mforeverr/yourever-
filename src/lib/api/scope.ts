import { httpRequest } from '@/lib/api/http'
import type { ScopeState, ScopeUpdateRequest, ScopeUpdateResponse } from '@/modules/scope/types'

const SCOPE_ENDPOINT = '/api/scope'

export const fetchScopeState = (signal?: AbortSignal): Promise<ScopeState> =>
  httpRequest('GET', SCOPE_ENDPOINT, {
    signal,
    meta: { endpoint: SCOPE_ENDPOINT, method: 'GET' },
  })

export const postScopeUpdate = (payload: ScopeUpdateRequest): Promise<ScopeUpdateResponse> =>
  httpRequest('POST', SCOPE_ENDPOINT, {
    body: payload,
    meta: {
      endpoint: SCOPE_ENDPOINT,
      method: 'POST',
      scope: { orgId: payload.orgId, divisionId: payload.divisionId ?? undefined },
    },
  })
