'use client'

import { useState, useEffect } from 'react'
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
import { mockUsers, type MockUser } from '@/mocks/data/users'
import { getFirstIncompleteStep } from '@/lib/onboarding'
import type { WorkspaceUser } from '@/modules/auth/types'

const findMockUserByEmail = (email: string): MockUser | null =>
  mockUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase()) ?? null

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

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, strategy, user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'password' | 'magic'>('password')
  const [isSocialLoading, setIsSocialLoading] = useState(false)
  const isMockStrategy = strategy === 'mock'

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
    if (strategy === 'supabase') {
      // For Supabase, the auth context will handle the redirect via useEffect
      return
    }

    // For mock strategy, handle immediate redirect
    const user = findMockUserByEmail(email)
    handlePostLoginRedirect(router, user, redirectUrl)
  }

  const handleQuickLogin = async (userEmail: string) => {
    if (!isMockStrategy) return
    const success = await login(userEmail, 'any-password')
    if (success) {
      const user = findMockUserByEmail(userEmail)
      handlePostLoginRedirect(router, user, redirectUrl)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github' | 'microsoft') => {
    setIsSocialLoading(true)

    try {
      if (strategy === 'supabase') {
        // TODO: Implement real Supabase OAuth sign-in
        const dismissToast = authToasts.socialAuthLoading(provider)

        // For now, just show a toast
        setTimeout(() => {
          authToasts.socialAuthError(provider)
        }, 2000)
      } else {
        // Mock social login for development
        const fallbackUserEmail = provider === 'github' ? 'dev@yourever.com' : 'member@yourever.com'
        const success = await login(fallbackUserEmail, 'any-password')
        if (success) {
          const user = findMockUserByEmail(fallbackUserEmail)
          handlePostLoginRedirect(router, user, redirectUrl)
        }
      }
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

          {/* Development helper - mock users */}
          {isMockStrategy && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Development Quick Access</p>
                <p className="text-xs text-muted-foreground">
                  These are mock accounts for testing. Any password works.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {mockUsers.map((user) => (
                  <button
                    key={user.id}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    onClick={() => handleQuickLogin(user.email)}
                    disabled={isSocialLoading}
                  >
                    {user.firstName} {user.lastName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
