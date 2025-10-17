'use client'

import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, Plus } from 'lucide-react'
import {
  useCreateOrganization,
  useCheckSlugAvailability,
  type WorkspaceCreationResult,
  type SlugAvailability,
} from '@/hooks/use-organizations'
import { cn } from '@/lib/utils'
import { MAX_SLUG_LENGTH, normalizeSlug } from '@/lib/slug'

// Division schema for individual division validation
const divisionSchema = z.object({
  name: z.string().min(1, 'Division name is required').max(100, 'Name too long'),
  key: z.string().optional(),
})

const orgCreationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .max(MAX_SLUG_LENGTH, `Slug must be ${MAX_SLUG_LENGTH} characters or fewer`)
    .optional(),
  description: z.string().optional(),
  division_name: z.string().min(1, 'Primary division name is required').max(100, 'Name too long'),
  division_key: z.string().optional(),
  additional_divisions: z.array(divisionSchema).optional(),
})

type OrgCreationFormData = z.infer<typeof orgCreationSchema>

interface OrgCreationFormProps {
  onSuccess?: (result: WorkspaceCreationResult) => void
  onError?: (error: any) => void
}

export function OrgCreationForm({ onSuccess, onError }: OrgCreationFormProps) {
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugAvailability | null>(null)
  const [invitees, setInvitees] = useState<string[]>([])
  const [inviteInput, setInviteInput] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [additionalDivisions, setAdditionalDivisions] = useState<Array<{ id: string; name: string; key: string }>>([])
  const [divisionErrors, setDivisionErrors] = useState<Record<string, string>>({})
  const emailSchema = z.string().email('Enter a valid email address')
  const slugCheckInFlightRef = useRef<string | null>(null)
  const slugCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parseEmail = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return { success: false, email: null, error: null }
    }

    const parsed = emailSchema.safeParse(trimmed)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Enter a valid email address'
      return { success: false, email: null, error: issue }
    }

    return { success: true, email: parsed.data.toLowerCase(), error: null }
  }

  const commitInvite = (value: string) => {
    const { success, email, error } = parseEmail(value)
    if (!success || !email) {
      if (error) {
        setInviteError(error)
      }
      return
    }

    setInviteError(null)
    setInviteInput('')
    setInvitees((previous) => {
      if (previous.includes(email)) {
        setInviteError('This email is already added')
        return previous
      }
      return [...previous, email]
    })
  }

  const removeInvite = (email: string) => {
    setInvitees((previous) => previous.filter((value) => value !== email))
  }

  const handleInviteInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (inviteError) {
      setInviteError(null)
    }
    setInviteInput(event.target.value)
  }

  const handleInviteInputBlur = () => {
    if (inviteInput.trim()) {
      commitInvite(inviteInput)
    }
  }

  const handleInviteInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    const separators = ['Enter', 'Tab', ',', ';']
    const trimmed = inviteInput.trim()

    if (event.key === 'Backspace' && !inviteInput && invitees.length > 0) {
      event.preventDefault()
      setInvitees((previous) => previous.slice(0, previous.length - 1))
      return
    }

    if (separators.includes(event.key) || event.key === ' ') {
      if (!trimmed) {
        return
      }

      event.preventDefault()
      commitInvite(inviteInput)
    }
  }

  // Division management functions
  const addDivision = () => {
    const newDivision = {
      id: crypto.randomUUID(),
      name: '',
      key: '',
    }
    setAdditionalDivisions((prev) => [...prev, newDivision])
  }

  const removeDivision = (id: string) => {
    setAdditionalDivisions((prev) => prev.filter((division) => division.id !== id))
  }

  const updateDivision = (id: string, field: 'name' | 'key', value: string) => {
    // Clear any existing error for this division when field is updated
    setDivisionErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[id]
      return newErrors
    })

    setAdditionalDivisions((prev) =>
      prev.map((division) =>
        division.id === id ? { ...division, [field]: value } : division
      )
    )
  }

  const validateDivision = (division: { id: string; name: string; key: string }) => {
    const errors: string[] = []

    // Validate name
    if (!division.name.trim()) {
      errors.push('Division name is required')
    } else if (division.name.trim().length > 100) {
      errors.push('Division name must be 100 characters or fewer')
    }

    // Validate key (optional but if provided, must be valid)
    if (division.key.trim() && division.key.trim().length > 50) {
      errors.push('Division key must be 50 characters or fewer')
    }

    return errors
  }

  const validateAllDivisions = () => {
    const errors: Record<string, string> = {}

    additionalDivisions.forEach((division) => {
      const divisionValidationErrors = validateDivision(division)
      if (divisionValidationErrors.length > 0) {
        errors[division.id] = divisionValidationErrors.join(', ')
      }
    })

    // Check for duplicate names
    const validDivisions = additionalDivisions.filter(d => d.name.trim())
    const names = validDivisions.map(d => d.name.trim())
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index)

    if (duplicates.length > 0) {
      validDivisions.forEach((division) => {
        if (duplicates.includes(division.name.trim())) {
          errors[division.id] = 'Duplicate division name'
        }
      })
    }

    setDivisionErrors(errors)
    return Object.keys(errors).length === 0
  }

  const form = useForm<OrgCreationFormData>({
    resolver: zodResolver(orgCreationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      division_name: '',
      division_key: '',
      additional_divisions: [],
    },
  })

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isValid, isSubmitting },
  } = form

  const slugField = form.register('slug', {
    setValueAs: (value) => normalizeSlug(typeof value === 'string' ? value : ''),
  })

  const watchedName = watch('name')
  const watchedSlug = watch('slug')

  const createOrgMutation = useCreateOrganization()
  const { mutate: triggerSlugCheck } = useCheckSlugAvailability()
  // Auto-generate slug from name
  useEffect(() => {
    if (!watchedName || watchedSlug) {
      return
    }

    const generatedSlug = normalizeSlug(watchedName)
    setValue('slug', generatedSlug, { shouldValidate: true })
  }, [watchedName, watchedSlug, setValue])

  // Check slug availability
  useEffect(() => {
    if (slugCheckDebounceRef.current) {
      clearTimeout(slugCheckDebounceRef.current)
      slugCheckDebounceRef.current = null
    }

    const normalizedSlug = watchedSlug?.trim() ?? ''

    if (normalizedSlug.length < 2) {
      setSlugStatus(null)
      slugCheckInFlightRef.current = null
      setIsCheckingSlug(false)
      return
    }

    if (slugCheckInFlightRef.current === normalizedSlug) {
      return
    }

    slugCheckDebounceRef.current = setTimeout(() => {
      slugCheckInFlightRef.current = normalizedSlug
      setIsCheckingSlug(true)
      setSlugStatus(null)

      triggerSlugCheck(normalizedSlug, {
        onSuccess: (result) => {
          if (slugCheckInFlightRef.current !== normalizedSlug) {
            return
          }

          const currentValue = getValues('slug')
          if (currentValue !== normalizedSlug) {
            return
          }

          setSlugStatus(result)
          if (result.slug && result.slug !== normalizedSlug) {
            setValue('slug', result.slug)
          }
        },
        onError: () => {
          if (slugCheckInFlightRef.current === normalizedSlug) {
            setSlugStatus(null)
          }
        },
        onSettled: () => {
          if (slugCheckInFlightRef.current === normalizedSlug) {
            slugCheckInFlightRef.current = null
            setIsCheckingSlug(false)
          }
        },
      })
    }, 400)

    return () => {
      if (slugCheckDebounceRef.current) {
        clearTimeout(slugCheckDebounceRef.current)
        slugCheckDebounceRef.current = null
      }
    }
  }, [watchedSlug, triggerSlugCheck, getValues, setValue])

  const onSubmit = async (data: OrgCreationFormData) => {
    // Trigger validation for all divisions first
    const isDivisionsValid = validateAllDivisions()

    if (!isDivisionsValid) {
      onError?.(new Error('Please fix division validation errors'))
      return
    }

    const validAdditionalDivisions = additionalDivisions.filter(
      (division) => division.name.trim()
    )

    // Check for duplicate division names between primary and additional divisions
    const primaryDivisionName = data.division_name.trim()
    const additionalDivisionNames = validAdditionalDivisions.map((d) => d.name.trim())

    if (additionalDivisionNames.includes(primaryDivisionName)) {
      onError?.(new Error('Division names must be unique'))
      return
    }

    const normalizedInvites = [...invitees]
    const pendingInput = inviteInput.trim()

    if (pendingInput) {
      const { success, email, error } = parseEmail(pendingInput)
      if (!success || !email) {
        if (error) {
          setInviteError(error)
        }
        return
      }

      if (normalizedInvites.includes(email)) {
        setInviteError('This email is already added')
        return
      }

      normalizedInvites.push(email)
      setInvitees(normalizedInvites)
      setInviteInput('')
      setInviteError(null)
    }

    try {
      // Send both primary and additional divisions
      const result = await createOrgMutation.mutateAsync({
        ...data,
        additional_divisions: validAdditionalDivisions.length > 0
          ? validAdditionalDivisions.map((division) => ({
              name: division.name,
              key: division.key || undefined
            }))
          : undefined,
        invitations:
          normalizedInvites.length > 0
            ? normalizedInvites.map((email) => ({ email }))
            : undefined,
      })

      setInvitees([])
      setInviteInput('')
      setInviteError(null)
      setAdditionalDivisions([])
      reset()
      setSlugStatus(null)
      onSuccess?.(result)
    } catch (error) {
      onError?.(error)
    }
  }

  const handleSlugSuggestionClick = (suggestion: string) => {
    setValue('slug', suggestion, { shouldDirty: true, shouldValidate: true })
  }

  const slugIsAvailable = slugStatus?.isAvailable

  return (
    <div className="space-y-6">
      {/* Basic Organization Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Organization name *</Label>
          <Input
            id="org-name"
            placeholder="Acme Corporation"
            {...form.register('name')}
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-slug">Organization URL</Label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">yourever.app/</span>
            <Input
              id="org-slug"
              placeholder="acme-corp"
              {...slugField}
              disabled={isSubmitting}
              className={cn(
                slugIsAvailable === false && 'border-destructive',
                slugIsAvailable === true && 'border-green-600'
              )}
            />
            {isCheckingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
            {slugIsAvailable === true && (
              <Check className="h-4 w-4 text-green-600" />
            )}
            {slugIsAvailable === false && (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
          {slugIsAvailable === false && slugStatus?.suggestions && slugStatus.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">This URL is taken. Try:</p>
              <div className="flex flex-wrap gap-2">
                {slugStatus.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSlugSuggestionClick(suggestion)}
                    className="h-6 text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-description">Description (optional)</Label>
          <Input
            id="org-description"
            placeholder="What does your organization do?"
            {...form.register('description')}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Division Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Divisions</h3>

        {/* Primary Division */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="division-name" className="text-sm font-medium">
              Primary Division *
            </Label>
            <Badge variant="secondary" className="text-xs">
              Main workspace
            </Badge>
          </div>
          <div className="space-y-2">
            <Input
              id="division-name"
              placeholder="Product Team"
              {...form.register('division_name')}
              disabled={isSubmitting}
            />
            {errors.division_name && (
              <p className="text-xs text-destructive">{errors.division_name.message}</p>
            )}
          </div>
        </div>

        {/* Additional Divisions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Additional Divisions</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDivision}
              disabled={isSubmitting}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Division
            </Button>
          </div>

          {additionalDivisions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add more divisions to organize your teams and projects.
            </p>
          )}

          {additionalDivisions.map((division, index) => (
            <div key={division.id} className={cn(
              "space-y-2 p-3 border rounded-md bg-muted/20",
              divisionErrors[division.id] && "border-destructive/50"
            )}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Division {index + 2}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDivision(division.id)}
                  disabled={isSubmitting}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Input
                    placeholder="Division name"
                    value={division.name}
                    onChange={(e) => updateDivision(division.id, 'name', e.target.value)}
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 text-sm",
                      divisionErrors[division.id] && "border-destructive"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Division key (optional)"
                    value={division.key}
                    onChange={(e) => updateDivision(division.id, 'key', e.target.value)}
                    disabled={isSubmitting}
                    className={cn(
                      "h-8 text-sm",
                      divisionErrors[division.id] && "border-destructive"
                    )}
                  />
                </div>
              </div>
              {divisionErrors[division.id] && (
                <p className="text-xs text-destructive">
                  {divisionErrors[division.id]}
                </p>
              )}
            </div>
          ))}

          {additionalDivisions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Each division will have its own workspace with dedicated channels, projects, and team members.
            </p>
          )}
        </div>
      </div>

      {/* Invitations */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="invite-input">Invite your team (optional)</Label>
          {invitees.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {invitees.length} {invitees.length === 1 ? 'person' : 'people'} added
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Add emails separated by enter, comma, or space. We'll send invitations as soon as the workspace is ready.
        </p>
        <div
          className={cn(
            'flex min-h-[48px] flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2 transition-colors',
            inviteError ? 'border-destructive' : 'border-dashed border-muted-foreground/40',
          )}
        >
          {invitees.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="flex items-center gap-1 bg-primary/10 text-primary"
            >
              ({email})
              <button
                type="button"
                onClick={() => removeInvite(email)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Input
            id="invite-input"
            value={inviteInput}
            onChange={handleInviteInputChange}
            onKeyDown={handleInviteInputKeyDown}
            onBlur={handleInviteInputBlur}
            disabled={isSubmitting}
            placeholder="teammate@example.com"
            className="h-6 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
      </div>

      {/* Error Display */}
      {createOrgMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {createOrgMutation.error instanceof Error
              ? createOrgMutation.error.message
              : 'Failed to create organization'}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleSubmit(onSubmit)}
        disabled={!isValid || isSubmitting || slugIsAvailable === false}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating organization...
          </>
        ) : (
          'Create organization'
        )}
      </Button>
    </div>
  )
}