'use client'

import { CheckCircle, AlertCircle, Mail, Shield, UserPlus, LogIn, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const authToasts = {
  // Success toasts
  loginSuccess: (email?: string) => toast({
    title: 'Welcome back!',
    description: email ? `Signed in as ${email}` : 'Successfully signed in to your account',
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
  }),

  signupSuccess: (email: string) => toast({
    title: 'Account created successfully!',
    description: `Welcome to Yourever! Please check ${email} to verify your account.`,
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
  }),

  magicLinkSent: (email: string) => toast({
    title: 'Check your email',
    description: `We've sent a magic link to ${email}. The link will expire in 15 minutes.`,
    action: (
      <button
        onClick={() => window.location.href = 'https://gmail.com' || 'https://mail.google.com'}
        className="text-sm font-medium text-primary hover:underline"
      >
        Open Email
      </button>
    ),
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
  }),

  passwordResetSent: (email: string) => toast({
    title: 'Password reset email sent',
    description: `Check ${email} for instructions to reset your password.`,
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
  }),

  passwordResetSuccess: () => toast({
    title: 'Password updated successfully',
    description: 'Your password has been changed. You can now sign in with your new password.',
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
  }),

  emailVerified: () => toast({
    title: 'Email verified successfully',
    description: 'Your account has been verified. You can now access all features.',
    className: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
  }),

  // Error toasts
  loginError: (error: string) => toast({
    title: 'Sign in failed',
    description: error || 'Invalid email or password. Please try again.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  signupError: (error: string) => toast({
    title: 'Account creation failed',
    description: error || 'Unable to create account. Please try again.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  magicLinkError: (error: string) => toast({
    title: 'Failed to send magic link',
    description: error || 'Unable to send magic link. Please try again.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  passwordResetError: (error: string) => toast({
    title: 'Password reset failed',
    description: error || 'Unable to send password reset email. Please try again.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  emailAlreadyExists: (email: string) => toast({
    title: 'Email already registered',
    description: `An account with ${email} already exists. Try signing in instead.`,
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  weakPassword: () => toast({
    title: 'Password too weak',
    description: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  invalidEmail: () => toast({
    title: 'Invalid email address',
    description: 'Please enter a valid email address.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  networkError: () => toast({
    title: 'Connection error',
    description: 'Unable to connect to our servers. Please check your internet connection and try again.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  socialAuthError: (provider: string) => toast({
    title: `${provider} authentication failed`,
    description: `Unable to authenticate with ${provider}. Please try again or use a different method.`,
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  // Warning toasts
  sessionExpired: () => toast({
    title: 'Session expired',
    description: 'Your session has expired. Please sign in again.',
    className: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
  }),

  accountSuspended: () => toast({
    title: 'Account suspended',
    description: 'Your account has been suspended. Please contact support for assistance.',
    variant: 'destructive',
    className: 'border-red-500/50',
  }),

  // Info toasts
  emailVerificationRequired: () => toast({
    title: 'Email verification required',
    description: 'Please check your email and click the verification link to activate your account.',
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
  }),

  passwordRequirements: () => toast({
    title: 'Password requirements',
    description: 'Your password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.',
    className: 'border-gray-500/50 bg-gray-50 dark:bg-gray-950/20',
  }),

  socialAuthLoading: (provider: string) => toast({
    title: `Connecting to ${provider}`,
    description: 'Please wait while we connect to your account...',
    className: 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20',
    duration: 10000,
  }),
}

// Helper function to get appropriate toast based on error type
export const getAuthErrorToast = (error: any, fallbackMessage?: string) => {
  const errorMessage = error?.message || error || fallbackMessage

  // Check for specific error patterns
  if (typeof errorMessage === 'string') {
    const lowerError = errorMessage.toLowerCase()

    if (lowerError.includes('password') && lowerError.includes('weak')) {
      return authToasts.weakPassword()
    }

    if (lowerError.includes('email') && lowerError.includes('exist')) {
      return authToasts.emailAlreadyExists('')
    }

    if (lowerError.includes('invalid') && lowerError.includes('email')) {
      return authToasts.invalidEmail()
    }

    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return authToasts.networkError()
    }

    if (lowerError.includes('suspended') || lowerError.includes('disabled')) {
      return authToasts.accountSuspended()
    }
  }

  // Default error toast
  return authToasts.loginError(errorMessage as string)
}

// Helper function to show loading toast for social auth
export const showSocialAuthLoading = (provider: string) => {
  const { dismiss } = authToasts.socialAuthLoading(provider)
  return dismiss
}