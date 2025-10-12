'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'
import { cn } from '@/lib/utils'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase(),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>
  isSubmitting?: boolean
  onCancel?: () => void
  prefilledEmail?: string
}

export function ForgotPasswordForm({
  onSubmit,
  isSubmitting = false,
  onCancel,
  prefilledEmail = ''
}: ForgotPasswordFormProps) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: prefilledEmail
    }
  })

  const handleFormSubmit = async (data: ForgotPasswordFormData) => {
    try {
      clearErrors()
      setIsSuccess(false)

      await onSubmit(data.email)

      setSubmittedEmail(data.email)
      setIsSuccess(true)
      authToasts.passwordResetSent(data.email)

    } catch (error) {
      console.error('Forgot password error:', error)
      getAuthErrorToast(error, 'Failed to send password reset email')

      // Set form errors if they exist
      if (error && typeof error === 'object' && 'field' in error) {
        const fieldError = error as { field: string; message: string }
        setError(fieldError.field as keyof ForgotPasswordFormData, {
          message: fieldError.message
        })
      }
    }
  }

  const getFieldError = (field: keyof ForgotPasswordFormData) => {
    const error = errors[field]
    return error?.message
  }

  const handleResend = async () => {
    if (!submittedEmail) return

    try {
      await onSubmit(submittedEmail)
      authToasts.passwordResetSent(submittedEmail)
    } catch (error) {
      console.error('Resend error:', error)
      getAuthErrorToast(error, 'Failed to resend password reset email')
    }
  }

  const handleNewRequest = () => {
    setIsSuccess(false)
    setSubmittedEmail('')
    clearErrors()
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Check your email</h3>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to{' '}
              <span className="font-medium text-foreground">{submittedEmail}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              The link will expire in 15 minutes. If you don't see it, check your spam folder.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Resending...' : 'Resend email'}
          </Button>

          <Button
            onClick={handleNewRequest}
            variant="ghost"
            className="w-full"
            disabled={isSubmitting}
          >
            Try a different email
          </Button>

          {onCancel && (
            <Button
              onClick={onCancel}
              variant="ghost"
              className="w-full"
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Didn't receive the email?{' '}
            <button
              onClick={handleResend}
              className="text-primary hover:underline font-medium"
              disabled={isSubmitting}
            >
              Click to resend
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Reset your password</h3>
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              autoComplete="email"
              className={cn(
                getFieldError('email') && 'border-destructive focus:border-destructive'
              )}
              aria-describedby={getFieldError('email') ? 'reset-email-error' : undefined}
            />
            {getFieldError('email') && (
              <p id="reset-email-error" className="text-sm text-destructive flex items-center gap-1">
                {getFieldError('email')}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center">
          <Button
            onClick={onCancel}
            variant="ghost"
            className="text-sm"
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      )}

      {/* Help text */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Remember your password?{' '}
          <button
            onClick={onCancel}
            className="text-primary hover:underline font-medium"
            disabled={isSubmitting}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}