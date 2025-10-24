/**
 * Authentication Diagnostic Tool
 *
 * This utility helps diagnose authentication issues by checking the complete
 * auth flow from frontend to backend. It provides detailed logging for debugging.
 *
 * Author: Eldrie (CTO Dev)
 * Date: 2025-10-23
 * Role: Frontend Architecture
 */

import { resolveAuthToken } from '@/lib/api/client'
import { getSupabaseClient } from '@/lib/supabase-client'
import { fetchAuthSession } from '@/lib/api/auth'

export interface AuthDiagnosticResult {
  timestamp: string
  supabaseClientAvailable: boolean
  supabaseSessionAvailable: boolean
  tokenResolverAvailable: boolean
  tokenResolved: boolean
  tokenValid: boolean
  tokenExpired: boolean
  backendConnection: boolean
  backendAuthWorking: boolean
  issues: string[]
  recommendations: string[]
}

export async function runAuthDiagnostics(): Promise<AuthDiagnosticResult> {
  const result: AuthDiagnosticResult = {
    timestamp: new Date().toISOString(),
    supabaseClientAvailable: false,
    supabaseSessionAvailable: false,
    tokenResolverAvailable: false,
    tokenResolved: false,
    tokenValid: false,
    tokenExpired: false,
    backendConnection: false,
    backendAuthWorking: false,
    issues: [],
    recommendations: []
  }

  console.group('🔍 Authentication Diagnostics Started')
  console.log('Timestamp:', result.timestamp)

  // 1. Check Supabase client
  const supabaseClient = getSupabaseClient()
  result.supabaseClientAvailable = !!supabaseClient

  if (!result.supabaseClientAvailable) {
    result.issues.push('Supabase client not available - check environment variables')
    result.recommendations.push('Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  } else {
    console.log('✅ Supabase client available')
  }

  // 2. Check Supabase session
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.getSession()
      result.supabaseSessionAvailable = !!data.session

      if (error) {
        result.issues.push(`Supabase session error: ${error.message}`)
        result.recommendations.push('Check Supabase configuration and network connectivity')
      } else if (!data.session) {
        result.issues.push('No active Supabase session - user may not be logged in')
        result.recommendations.push('Ensure user has completed the login flow')
      } else {
        console.log('✅ Supabase session available')
        console.log('Session user:', data.session.user?.email)
      }
    } catch (error) {
      result.issues.push(`Failed to get Supabase session: ${error.message}`)
      result.recommendations.push('Check browser console for Supabase errors')
    }
  }

  // 3. Check token resolver
  try {
    const token = await resolveAuthToken()
    result.tokenResolverAvailable = true
    result.tokenResolved = !!token

    if (!token) {
      result.issues.push('Token resolver returned null - no access token available')
      result.recommendations.push('Wait for auth context to fully initialize or check session state')
    } else {
      console.log('✅ Token resolved successfully')

      // 4. Validate token format and expiration
      try {
        const parts = token.split('.')
        if (parts.length !== 3) {
          result.issues.push('Invalid JWT token format')
          result.recommendations.push('Check token generation and formatting')
        } else {
          result.tokenValid = true

          const payload = JSON.parse(atob(parts[1]))
          if (payload.exp) {
            const now = Math.floor(Date.now() / 1000)
            result.tokenExpired = payload.exp <= now

            if (result.tokenExpired) {
              result.issues.push('JWT token has expired')
              result.recommendations.push('Refresh token or require user to login again')
            } else {
              console.log('✅ Token valid and not expired')
              console.log('Token expires at:', new Date(payload.exp * 1000).toISOString())
            }
          }
        }
      } catch (decodeError) {
        result.issues.push(`Failed to decode JWT: ${decodeError.message}`)
        result.recommendations.push('Check token format and encoding')
      }
    }
  } catch (error) {
    result.issues.push(`Token resolver failed: ${error.message}`)
    result.recommendations.push('Check auth context initialization and error handling')
  }

  // 5. Check backend connection
  try {
    const response = await fetch('/api/health', { method: 'GET' })
    result.backendConnection = response.ok

    if (!result.backendConnection) {
      result.issues.push('Backend health check failed')
      result.recommendations.push('Ensure backend server is running and accessible')
    } else {
      console.log('✅ Backend connection successful')
    }
  } catch (error) {
    result.issues.push(`Backend connection failed: ${error.message}`)
    result.recommendations.push('Check backend server status and network connectivity')
  }

  // 6. Check backend authentication
  if (result.tokenResolved && !result.tokenExpired) {
    try {
      const token = await resolveAuthToken()
      const sessionData = await fetchAuthSession(token)
      result.backendAuthWorking = true
      console.log('✅ Backend authentication working')
      console.log('Session user:', sessionData.user?.email)
    } catch (error) {
      result.issues.push(`Backend authentication failed: ${error.message}`)
      result.recommendations.push('Check backend JWT secret configuration and token validation')

      if (error.message.includes('401')) {
        result.recommendations.push('Verify SUPABASE_JWT_SECRET is configured in backend')
      }
    }
  } else {
    result.issues.push('Cannot test backend auth - no valid token available')
    result.recommendations.push('Fix token resolution issues before testing backend auth')
  }

  // Summary
  console.log('\n📊 Diagnostic Summary:')
  console.log('Issues found:', result.issues.length)
  console.log('Recommendations:', result.recommendations.length)

  if (result.issues.length === 0) {
    console.log('🎉 All authentication checks passed!')
  } else {
    console.log('\n❌ Issues:')
    result.issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`))

    console.log('\n💡 Recommendations:')
    result.recommendations.forEach((rec, i) => console.log(`${i + 1}. ${rec}`))
  }

  console.groupEnd()
  return result
}

/**
 * Run diagnostics in the browser console
 * Call this function in browser dev tools: await window.runAuthDiagnostics()
 */
if (typeof window !== 'undefined') {
  (window as any).runAuthDiagnostics = runAuthDiagnostics
}