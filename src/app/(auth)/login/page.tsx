'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuthLayout } from '@/components/auth/auth-layout'
import {
  AuthCard,
  AuthDivider,
  AuthFooter,
  ModernSocialButton,
  LoadingState
} from '@/components/auth/modern-auth-ui'
import { LoginForm } from '@/components/auth/login-form'
import { MagicLinkForm } from '@/components/auth/magic-link-form'
import { useAuth } from '@/contexts/auth-context'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'
import { authStorage } from '@/lib/auth-utils'
import { getFirstIncompleteStep } from '@/lib/onboarding'
import type { WorkspaceUser } from '@/modules/auth/types'

const handlePostLoginRedirect = (router: ReturnType<typeof useRouter>, user: WorkspaceUser | null, redirectUrl?: string | null) => {
  // If there's a redirect URL from the middleware, use it
  if (redirectUrl && redirectUrl !== '/' && redirectUrl !== '/login') {
    router.replace(redirectUrl)
    return
  }

  const userId = authStorage.getUserId()
  const onboardingStatus = userId ? authStorage.getOnboardingStatus(userId) : null

  if (onboardingStatus && !onboardingStatus.completed) {
    const nextStep = getFirstIncompleteStep(onboardingStatus)
    router.replace(nextStep?.path ?? '/o/profile')
    return
  }

  if (onboardingStatus?.completed && !authStorage.hasSeenWorkspaceWelcome()) {
    router.replace('/welcome')
    return
  }

  if (user && user.organizations.length === 1 && user.organizations[0].divisions.length === 1) {
    const org = user.organizations[0]
    const division = org.divisions[0]
    router.replace(`/${org.id}/${division.id}/dashboard`)
    return
  }

  router.replace('/workspace-hub')
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, strategy, user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'password' | 'magic'>('password')
  const [isSocialLoading, setIsSocialLoading] = useState(false)

  // Get redirect URL from search params
  const redirectUrl = searchParams?.get('redirect')

  // Handle redirect for Supabase logins after successful authentication
  useEffect(() => {
    if (strategy === 'supabase' && user && !isLoading) {
      handlePostLoginRedirect(router, user, redirectUrl)
    }
  }, [user, isLoading, strategy, router, redirectUrl])

  const handleEmailLogin = async (email: string, password: string) => {
    return login(email, password)
  }

  const handleEmailSuccess = (email: string) => {
    // Supabase login flow triggers redirect via auth context once the session resolves.
    return
  }

  const handleSocialLogin = async (provider: 'google' | 'github' | 'microsoft') => {
    setIsSocialLoading(true)

    try {
      // TODO: Implement real Supabase OAuth sign-in
      authToasts.socialAuthLoading(provider)
      setTimeout(() => {
        authToasts.socialAuthError(provider)
      }, 2000)
    } catch (error) {
      console.error('Social login error:', error)
      authToasts.socialAuthError(provider)
    } finally {
      setIsSocialLoading(false)
    }
  }

  const handleMagicLinkRequest = async (email: string) => {
    try {
      if (strategy === 'supabase') {
        // TODO: Implement real Supabase magic link
        // const { error } = await supabase.auth.signInWithOtp({
        //   email,
        //   options: {
        //     emailRedirectTo: `${window.location.origin}/auth/callback`
        //   }
        // })
        // if (error) throw error
        authToasts.magicLinkSent(email)
      } else {
        // Mock magic link for development
        await new Promise((resolve) => setTimeout(resolve, 800))
        authToasts.magicLinkSent(email)
      }
    } catch (error) {
      console.error('Magic link error:', error)
      getAuthErrorToast(error, 'Failed to send magic link')
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <AuthLayout>
        <AuthCard title="Welcome back" description="Signing you in...">
          <LoadingState text="Authenticating..." />
        </AuthCard>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Welcome back"
        description={
          strategy === 'supabase'
            ? "Sign in to your workspace with your work email"
            : "Sign in to continue to your workspace"
        }
      >
        <div className="space-y-6">
          {/* Social login buttons */}
          <div className="space-y-3">
            <ModernSocialButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={isSocialLoading}
            />
            <ModernSocialButton
              provider="github"
              onClick={() => handleSocialLogin('github')}
              isLoading={isSocialLoading}
            />
          </div>

          <AuthDivider />

          {/* Email and magic link login */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password" className="text-sm">
                Password
              </TabsTrigger>
              <TabsTrigger value="magic" className="text-sm">
                Magic Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <LoginForm
                onLogin={handleEmailLogin}
                onSuccess={handleEmailSuccess}
              />
            </TabsContent>

            <TabsContent value="magic" className="mt-4">
              <MagicLinkForm onRequestMagicLink={handleMagicLinkRequest} />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <AuthFooter>
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline transition-colors"
        >
          Sign up
        </Link>
      </AuthFooter>
    </div>
  </AuthCard>
</AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
