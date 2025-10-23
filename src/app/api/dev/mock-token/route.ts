import { NextResponse, type NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { mockUsers } from '@/mocks/data/users'

const MOCK_TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

interface MockTokenRequestBody {
  userId: string
  orgId?: string | null
  divisionId?: string | null
}

const encoder = new TextEncoder()

const buildScopeClaims = (
  orgId: string | null,
  divisionId: string | null,
  orgIds: string[],
  divisionIds: Record<string, string[]>,
) => ({
  org_id: orgId,
  orgId,
  division_id: divisionId,
  divisionId,
  org_ids: orgIds,
  orgIds,
  division_ids: divisionIds,
  divisionIds,
})

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Mock tokens are not available in production' }, { status: 403 })
  }

  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SUPABASE_JWT_SECRET is not configured' }, { status: 500 })
  }

  let payload: MockTokenRequestBody
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, orgId: requestedOrgId, divisionId: requestedDivisionId } = payload
  const user = mockUsers.find((candidate) => candidate.id === userId)

  if (!user) {
    return NextResponse.json({ error: 'Unknown user' }, { status: 404 })
  }

  const organizations = user.organizations ?? []
  const defaultOrgId = organizations[0]?.id ?? null
  const activeOrgId = requestedOrgId ?? defaultOrgId
  const availableOrgIds = organizations.map((organization) => organization.id)
  const divisionMap = organizations.reduce<Record<string, string[]>>((accumulator, organization) => {
    accumulator[organization.id] = organization.divisions?.map((division) => division.id) ?? []
    return accumulator
  }, {})

  const sanitizedDivisionId =
    activeOrgId && divisionMap[activeOrgId]?.includes(requestedDivisionId ?? '')
      ? requestedDivisionId ?? null
      : null

  const scopeClaims = buildScopeClaims(activeOrgId, sanitizedDivisionId, availableOrgIds, divisionMap)
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + MOCK_TOKEN_TTL_SECONDS

  const tokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    app_metadata: {
      provider: 'dev-mock',
    },
    user_metadata: {
      full_name: user.fullName,
      yourever_scope: scopeClaims,
    },
    yourever_scope: scopeClaims,
    ...scopeClaims,
  }

  const token = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setSubject(user.id)
    .sign(encoder.encode(secret))

  return NextResponse.json({
    token,
    expiresAt,
    scope: scopeClaims,
  })
}
