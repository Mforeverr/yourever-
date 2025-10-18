'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/auth/password-input'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean(),
})

type LoginFormData = z.infer<typeof loginSchema>

export interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<boolean>
  onSuccess: (email: string) => void
  isSubmitting?: boolean
}

export function LoginForm({ onLogin, onSuccess, isSubmitting }: LoginFormProps) {

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError,
    clearErrors,
    setValue
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })

  const watchedPassword = watch('password')
  const watchedEmail = watch('email')

  const onSubmit = async (data: any) => {
    try {
      clearErrors()

      const success = await onLogin(data.email, data.password)

      if (success) {
        authToasts.loginSuccess(data.email)
        onSuccess(data.email)
      } else {
        // Set a generic error - specific errors should come from the auth context
        setError('root', {
          message: 'Invalid email or password. Please try again.'
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      getAuthErrorToast(error, 'Invalid email or password. Please try again.')

      // Set form errors if they exist
      if (error && typeof error === 'object' && 'field' in error) {
        const fieldError = error as { field: string; message: string }
        setError(fieldError.field as keyof LoginFormData, {
          message: fieldError.message
        })
      } else {
        setError('root', {
          message: 'Invalid email or password. Please try again.'
        })
      }
    }
  }

  const getFieldError = (field: keyof LoginFormData) => {
    const error = errors[field]
    return error?.message
  }

  const handleForgotPassword = () => {
    // Navigate to forgot password page with pre-filled email
    const forgotPasswordUrl = watchedEmail
      ? `/auth/forgot-password?email=${encodeURIComponent(watchedEmail)}`
      : '/auth/forgot-password'

    window.location.href = forgotPasswordUrl
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email field */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          placeholder="you@example.com"
          autoComplete="email"
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            getFieldError('email') && 'border-destructive focus:border-destructive'
          )}
          aria-describedby={getFieldError('email') ? 'email-error' : undefined}
        />
        {getFieldError('email') && (
          <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
            {getFieldError('email')}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Password
        </label>
        <PasswordInput
          id="password"
          value={watchedPassword}
          onChange={(value) => {
            setValue('password', value, { shouldValidate: true })
          }}
          placeholder="••••••••"
          error={getFieldError('password')}
          onBlur={() => setValue('password', watchedPassword, { shouldValidate: true })}
        />
      </div>

      {/* Remember me and forgot password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            {...register('rememberMe')}
            onCheckedChange={(checked) => {
              setValue('rememberMe', checked as boolean, { shouldValidate: true })
            }}
          />
          <label
            htmlFor="rememberMe"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </label>
        </div>

        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-primary hover:underline font-medium"
        >
          Forgot password?
        </button>
      </div>

      {/* Form error */}
      {errors.root && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            {errors.root.message}
          </p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full bg-white text-black hover:bg-gray-100 border border-gray-200 shadow-sm"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
