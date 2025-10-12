'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthCard } from '@/components/auth/modern-auth-ui'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { useAuth } from '@/contexts/auth-context'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { strategy } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get email from URL params (from login form "forgot password" link)
  const prefilledEmail = searchParams.get('email') || ''

  const handleSubmit = async (email: string) => {
    setIsSubmitting(true)

    try {
      if (strategy === 'supabase') {
        // TODO: Implement real Supabase password reset
        // const { error } = await supabase.auth.resetPasswordForEmail(email, {
        //   redirectTo: `${window.location.origin}/auth/reset-password`
        // })
        // if (error) throw error

        // Mock implementation for now
        await new Promise(resolve => setTimeout(resolve, 1500))
      } else {
        // Mock implementation for development
        // TODO: Call POST /api/auth/forgot-password when backend is ready
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      throw error // Let the form component handle the error display
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/auth/login')
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Password Reset"
        description="We'll help you reset your password and get back to your workspace"
      >
        <ForgotPasswordForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          prefilledEmail={prefilledEmail}
        />

        {/* Additional help */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Still having trouble?
            </p>
            <p className="text-xs text-muted-foreground">
              Contact our support team at{' '}
              <a
                href="mailto:support@yourever.com"
                className="text-primary hover:underline font-medium"
              >
                support@yourever.com
              </a>
            </p>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  )
}