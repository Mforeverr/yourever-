import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// For development: fallback Supabase client to validate tokens
const supabaseUrl = 'https://yeonbgjzgdbialjcmpbr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inllb25iZ2p6Z2RiaWFsamNtcGJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NTAwMzksImV4cCI6MjA3NTMyNjAzOX0.Y4AnH_i21ZSO5h3dPQ9tLhIzq1C5hE_Pi0qQJdNQqW4'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Mock user data for testing
const createMockUser = (email: string, userId: string) => ({
  user: {
    id: userId,
    email: email,
    name: email.split('@')[0],
    email_verified: true,
    created_at: new Date().toISOString(),
    organizations: [
      {
        id: 'org_test_123',
        name: 'Test Organization',
        slug: 'test-org',
        user_role: 'owner',
        divisions: [
          {
            id: 'div_test_123',
            name: 'General',
            key: 'general'
          }
        ]
      }
    ]
  }
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Missing bearer token' },
        { status: 401 }
      )
    }

    // Try to validate with backend first
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      console.warn('[/api/users/me] Backend not available, using fallback:', backendError)
    }

    // Fallback: Validate Supabase token and return mock user
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[/api/users/me] Invalid token:', error?.message)
      return NextResponse.json(
        { detail: 'Invalid token' },
        { status: 401 }
      )
    }

    // Return mock user for testing
    console.log('[/api/users/me] Returning mock user for:', user.email)
    return NextResponse.json(createMockUser(user.email || 'unknown@example.com', user.id || 'unknown-user-id'))

  } catch (error) {
    console.error('Error in /api/users/me:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}