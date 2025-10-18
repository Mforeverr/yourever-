'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/auth/password-input'
import { authToasts, getAuthErrorToast } from '@/components/auth/auth-toasts'
import { cn } from '@/lib/utils'

const signupSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
  receiveUpdates: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export interface SignupFormProps {
  onSignup: (data: {
    firstName: string
    lastName: string
    email: string
    password: string
    receiveUpdates?: boolean
  }) => Promise<boolean>
  isSubmitting?: boolean
}

export function SignupForm({ onSignup, isSubmitting }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setError,
    clearErrors,
    trigger
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
      receiveUpdates: false
    }
  })

  const watchedPassword = watch('password')
  const watchedConfirmPassword = watch('confirmPassword')

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    if (!password) return 0

    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++

    return Math.min(strength, 5)
  }

  // Update password strength when password changes
  const handlePasswordChange = (value: string) => {
    setPasswordStrength(calculatePasswordStrength(value))

    // Trigger validation for confirm password if it has a value
    if (watchedConfirmPassword) {
      trigger('confirmPassword')
    }
  }

  const onSubmit = async (data: SignupFormData) => {
    try {
      clearErrors()

      const success = await onSignup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        receiveUpdates: data.receiveUpdates
      })

      if (success) {
        authToasts.signupSuccess(data.email)
      }
    } catch (error) {
      console.error('Signup error:', error)
      getAuthErrorToast(error, 'Failed to create account')

      // Set form errors if they exist
      if (error && typeof error === 'object' && 'field' in error) {
        const fieldError = error as { field: string; message: string }
        setError(fieldError.field as keyof SignupFormData, {
          message: fieldError.message
        })
      }
    }
  }

  const getFieldError = (field: keyof SignupFormData) => {
    const error = errors[field]
    return error?.message
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...register('firstName')}
            placeholder="John"
            className={cn(
              getFieldError('firstName') && 'border-destructive focus:border-destructive'
            )}
            aria-describedby={getFieldError('firstName') ? 'firstName-error' : undefined}
          />
          {getFieldError('firstName') && (
            <p id="firstName-error" className="text-sm text-destructive flex items-center gap-1">
              {getFieldError('firstName')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...register('lastName')}
            placeholder="Doe"
            className={cn(
              getFieldError('lastName') && 'border-destructive focus:border-destructive'
            )}
            aria-describedby={getFieldError('lastName') ? 'lastName-error' : undefined}
          />
          {getFieldError('lastName') && (
            <p id="lastName-error" className="text-sm text-destructive flex items-center gap-1">
              {getFieldError('lastName')}
            </p>
          )}
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">Work Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="you@example.com"
          autoComplete="email"
          className={cn(
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
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          value={watchedPassword}
          onChange={(value) => {
            // Update form value
            register('password').onChange({ target: { value } } as any)
            handlePasswordChange(value)
          }}
          showStrengthIndicator
          error={getFieldError('password')}
          onBlur={() => trigger('password')}
        />
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          value={watchedConfirmPassword}
          onChange={(value) => {
            register('confirmPassword').onChange({ target: { value } } as any)
          }}
          placeholder="••••••••"
          error={getFieldError('confirmPassword')}
          onBlur={() => trigger('confirmPassword')}
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreeToTerms"
            {...register('agreeToTerms')}
            onCheckedChange={(checked) => {
              register('agreeToTerms').onChange({
                target: { value: checked, checked }
              } as any)
            }}
          />
          <Label htmlFor="agreeToTerms" className="text-sm leading-relaxed">
            I agree to the{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => window.open('/terms', '_blank')}
            >
              Terms and Conditions
            </button>
            {' '}and{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => window.open('/privacy', '_blank')}
            >
              Privacy Policy
            </button>
          </Label>
        </div>

        {getFieldError('agreeToTerms') && (
          <p className="text-sm text-destructive">
            {getFieldError('agreeToTerms')}
          </p>
        )}

        <div className="flex items-start space-x-2">
          <Checkbox
            id="receiveUpdates"
            {...register('receiveUpdates')}
            onCheckedChange={(checked) => {
              register('receiveUpdates').onChange({
                target: { value: checked, checked }
              } as any)
            }}
          />
          <Label htmlFor="receiveUpdates" className="text-sm leading-relaxed">
            Send me product updates, announcements, and offers.
          </Label>
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full bg-white text-black hover:bg-gray-100 border border-gray-200 shadow-sm"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        By creating an account, you agree to our terms of service and privacy policy.
      </p>
    </form>
  )
}