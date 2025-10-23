// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-24
// Role: Frontend

interface IssueMockTokenInput {
  userId: string
  orgId: string | null
  divisionId: string | null
}

interface IssueMockTokenResponse {
  token: string
  expiresAt: number
}

export const issueMockAccessToken = async ({
  userId,
  orgId,
  divisionId,
}: IssueMockTokenInput): Promise<IssueMockTokenResponse> => {
  const response = await fetch('/api/dev/mock-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      orgId,
      divisionId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to issue mock access token: ${errorText || response.statusText}`)
  }

  return (await response.json()) as IssueMockTokenResponse
}
