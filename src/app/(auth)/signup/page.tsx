'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/auth-layout'
import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  ModernSocialButton,
  LoadingState
} from '@/components/auth/modern-auth-ui'
import { SignupForm } from '@/components/auth/signup-form'
import { useAuth } from '@/contexts/auth-context'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'
import { authStorage } from '@/lib/auth-utils'
import { getFirstIncompleteStep } from '@/lib/onboarding'
import type { WorkspaceUser } from '@/modules/auth/types'

const handlePostSignupRedirect = (router: ReturnType<typeof useRouter>, user: WorkspaceUser | null) => {
  const userId = authStorage.getUserId()
  const onboardingStatus = userId ? authStorage.getOnboardingStatus(userId) : null

  // If onboarding is not completed, redirect to the first incomplete step
  if (onboardingStatus && !onboardingStatus.completed) {
    const nextStep = getFirstIncompleteStep(onboardingStatus)
    router.replace(nextStep?.path ?? '/o/profile')
    return
  }

  // If user has organizations and divisions, redirect appropriately
  if (user && user.organizations.length === 1 && user.organizations[0].divisions.length === 1) {
    const org = user.organizations[0]
    const division = org.divisions[0]
    router.replace(`/${org.id}/${division.id}/dashboard`)
    return
  }

  // Default redirect to organization selection
  router.replace('/workspace-hub')
}

function SignupPageContent() {
  const router = useRouter()
  const { login, strategy, user, isLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState(false)

  // Handle redirect for authenticated users
  useEffect(() => {
    if (strategy === 'supabase' && user && !isLoading) {
      handlePostSignupRedirect(router, user)
    }
  }, [user, isLoading, strategy, router])

  const handleSignup = async (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    receiveUpdates?: boolean
  }) => {
    setIsSubmitting(true)

    try {
      // For now, we'll simulate signup with the existing mock system
      // In a real implementation, this would call the signup API

      if (strategy === 'supabase') {
        // TODO: Implement real Supabase signup
        // const { error } = await supabase.auth.signUp({
        //   email: data.email,
        //   password: data.password,
        //   options: {
        //     data: {
        //       first_name: data.firstName,
        //       last_name: data.lastName,
        //       receive_updates: data.receiveUpdates
        //     }
        //   }
        // })

        // if (error) throw error

        // For Supabase, show email verification toast and redirect
        authToasts.signupSuccess(data.email)
        router.replace('/auth/verify-email')
        return true
      }

      // Mock signup - simulate successful registration and auto-login
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Simulate login after successful signup
      const loginSuccess = await login(data.email, data.password)

      if (loginSuccess) {
        // Mock user data - in real implementation, this would come from the API
        const fullName = `${data.firstName} ${data.lastName}`.trim()
        const mockUser: WorkspaceUser = {
          id: 'new-user-' + Date.now(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: fullName,
          displayName: fullName, // Use full name as display name initially
          avatar: null,
          organizations: [], // New users start with no organizations
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        handlePostSignupRedirect(router, mockUser)
        return true
      }

      throw new Error('Failed to complete signup process')

    } catch (error) {
      console.error('Signup error:', error)
      getAuthErrorToast(error, 'Failed to create account')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSocialSignup = async (provider: 'google' | 'github' | 'microsoft') => {
    setIsSocialLoading(true)

    try {
      if (strategy === 'supabase') {
        // TODO: Implement real Supabase OAuth
        const dismissToast = authToasts.socialAuthLoading(provider)

        // const { error } = await supabase.auth.signInWithOAuth({
        //   provider,
        //   options: {
        //     redirectTo: `${window.location.origin}/auth/callback`
        //   }
        // })

        // if (error) {
        //   dismissToast()
        //   throw error
        // }

        // For now, just show a toast
        setTimeout(() => {
          authToasts.socialAuthError(provider)
        }, 2000)
      } else {
        // Mock social signup for development
        await new Promise(resolve => setTimeout(resolve, 1500))

        const fallbackUserEmail = provider === 'github' ? 'dev@yourever.com' : 'member@yourever.com'
        const success = await login(fallbackUserEmail, 'any-password')

        if (success) {
          authToasts.signupSuccess(fallbackUserEmail)
          router.replace('/workspace-hub')
        }
      }
    } catch (error) {
      console.error('Social signup error:', error)
      authToasts.socialAuthError(provider)
    } finally {
      setIsSocialLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <AuthLayout>
        <AuthCard title="Creating your workspace" description="Please wait while we set up your account">
          <LoadingState text="Setting up your account..." />
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Create your account"
        description="Start your free trial and experience the future of team collaboration"
      >
        <div className="space-y-6">
          {/* Social signup buttons */}
          <div className="space-y-3">
            <ModernSocialButton
              provider="google"
              onClick={() => handleSocialSignup('google')}
              isLoading={isSocialLoading}
            />
            <ModernSocialButton
              provider="github"
              onClick={() => handleSocialSignup('github')}
              isLoading={isSocialLoading}
            />
          </div>

          <AuthDivider />

          {/* Email signup form */}
          <SignupForm
            onSignup={handleSignup}
            isSubmitting={isSubmitting}
          />

          {/* Footer */}
          <AuthFooter>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </AuthFooter>

          {/* Terms notice */}
          <div className="text-xs text-muted-foreground text-center">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="hover:text-foreground underline" target="_blank">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="hover:text-foreground underline" target="_blank">
              Privacy Policy
            </Link>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <AuthCard title="Loading..." description="Please wait">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </AuthCard>
      </AuthLayout>
    }>
      <SignupPageContent />
    </Suspense>
  )
}