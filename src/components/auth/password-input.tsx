'use client'

import { useState } from 'react'
import { Eye, EyeOff, Shield, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
  text: string
}

export interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  showStrengthIndicator?: boolean
  error?: string
  onBlur?: () => void
  onFocus?: () => void
  className?: string
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, feedback: [], color: 'bg-gray-200', text: '' }
  }

  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('At least 8 characters')
  }

  // Complexity checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Upper and lower case letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('At least one number')
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1
  } else {
    feedback.push('At least one special character')
  }

  // Additional length for extra security
  if (password.length >= 12) {
    score += 1
  }

  const strengthLevels = [
    { score: 0, color: 'bg-gray-200', text: '' },
    { score: 1, color: 'bg-red-500', text: 'Weak' },
    { score: 2, color: 'bg-orange-500', text: 'Fair' },
    { score: 3, color: 'bg-yellow-500', text: 'Good' },
    { score: 4, color: 'bg-blue-500', text: 'Strong' },
    { score: 5, color: 'bg-green-500', text: 'Very Strong' }
  ]

  const strength = strengthLevels[Math.min(score, 5)]

  return {
    score,
    feedback,
    color: strength.color,
    text: strength.text
  }
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  disabled = false,
  showStrengthIndicator = false,
  error,
  onBlur,
  onFocus,
  className
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const strength = calculatePasswordStrength(value)

  const handleBlur = () => {
    setIsFocused(false)
    onBlur?.()
  }

  const handleFocus = () => {
    setIsFocused(true)
    onFocus?.()
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const getStrengthIcon = () => {
    if (strength.score <= 2) return AlertTriangle
    if (strength.score <= 3) return Shield
    return ShieldCheck
  }

  const StrengthIcon = getStrengthIcon()

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={cn(
            'pr-10',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          aria-describedby={error ? `${id}-error` : showStrengthIndicator ? `${id}-strength` : undefined}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}

      {showStrengthIndicator && value && (
        <div id={`${id}-strength`} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StrengthIcon className={cn(
                'h-4 w-4',
                strength.score <= 2 && 'text-red-500',
                strength.score === 3 && 'text-yellow-500',
                strength.score >= 4 && 'text-green-500'
              )} />
              <span className={cn(
                'text-xs font-medium',
                strength.score <= 2 && 'text-red-500',
                strength.score === 3 && 'text-yellow-500',
                strength.score >= 4 && 'text-green-500'
              )}>
                Password strength: {strength.text}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {strength.score}/5
            </span>
          </div>

          {/* Strength indicator bars */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-200',
                  i < strength.score ? strength.color : 'bg-gray-200'
                )}
              />
            ))}
          </div>

          {/* Feedback for weak passwords */}
          {strength.feedback.length > 0 && isFocused && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">To strengthen your password:</p>
              <ul className="space-y-0.5 ml-2">
                {strength.feedback.map((item, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}