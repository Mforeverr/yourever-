'use client'

import { useState, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X } from 'lucide-react'
import { useCreateOrganization, useCheckSlugAvailability } from '@/hooks/use-organizations'
import { useAvailableTemplates, type Template, type WorkspaceCreationResult } from '@/hooks/use-organizations'
import { cn } from '@/lib/utils'

const orgCreationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100, 'Name too long'),
  slug: z.string().optional(),
  description: z.string().optional(),
  division_name: z.string().min(1, 'Division name is required').max(100, 'Name too long'),
  division_key: z.string().optional(),
  template_id: z.string().optional(),
})

type OrgCreationFormData = z.infer<typeof orgCreationSchema>

interface OrgCreationFormProps {
  onSuccess?: (result: WorkspaceCreationResult) => void
  onError?: (error: any) => void
}

export function OrgCreationForm({ onSuccess, onError }: OrgCreationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  const [slugStatus, setSlugStatus] = useState<{
    is_available: boolean
    suggestions: string[]
  } | null>(null)
  const [invitees, setInvitees] = useState<string[]>([])
  const [inviteInput, setInviteInput] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const emailSchema = z.string().trim().email('Enter a valid email address')

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

  const form = useForm<OrgCreationFormData>({
    resolver: zodResolver(orgCreationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      division_name: '',
      division_key: '',
      template_id: '',
    },
  })

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = form

  const watchedName = watch('name')
  const watchedSlug = watch('slug')

  const createOrgMutation = useCreateOrganization()
  const checkSlugMutation = useCheckSlugAvailability()
  const { data: templates, isLoading: templatesLoading } = useAvailableTemplates()

  // Auto-generate slug from name
  useEffect(() => {
    if (watchedName && !watchedSlug) {
      const generatedSlug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-')
      setValue('slug', generatedSlug)
    }
  }, [watchedName, watchedSlug, setValue])

  // Check slug availability
  useEffect(() => {
    if (watchedSlug && watchedSlug.length >= 2) {
      setIsCheckingSlug(true)
      checkSlugMutation.mutate(watchedSlug, {
        onSuccess: (result) => {
          setSlugStatus({
            is_available: result.is_available,
            suggestions: result.suggestions,
          })
        },
        onError: () => {
          setSlugStatus(null)
        },
        onSettled: () => {
          setIsCheckingSlug(false)
        },
      })
    } else {
      setSlugStatus(null)
    }
  }, [watchedSlug, checkSlugMutation])

  const onSubmit = async (data: OrgCreationFormData) => {
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
      const result = await createOrgMutation.mutateAsync({
        ...data,
        template_id: selectedTemplate || undefined,
        invitations:
          normalizedInvites.length > 0
            ? normalizedInvites.map((email) => ({ email }))
            : undefined,
      })

      setInvitees([])
      setInviteInput('')
      setInviteError(null)
      onSuccess?.(result)
    } catch (error) {
      onError?.(error)
    }
  }

  const handleSlugSuggestionClick = (suggestion: string) => {
    setValue('slug', suggestion)
  }

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
              {...form.register('slug')}
              disabled={isSubmitting}
              className={cn(
                slugStatus?.is_available === false && 'border-destructive',
                slugStatus?.is_available === true && 'border-green-600'
              )}
            />
            {isCheckingSlug && <Loader2 className="h-4 w-4 animate-spin" />}
            {slugStatus?.is_available === true && (
              <Check className="h-4 w-4 text-green-600" />
            )}
            {slugStatus?.is_available === false && (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
          {errors.slug && (
            <p className="text-xs text-destructive">{errors.slug.message}</p>
          )}
          {slugStatus?.is_available === false && slugStatus.suggestions.length > 0 && (
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
        <h3 className="text-lg font-medium">Primary Division</h3>
        <div className="space-y-2">
          <Label htmlFor="division-name">Division name *</Label>
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

      {/* Template Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Choose a template (optional)</h3>
        {templatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* No Template Option */}
            <Card
              className={cn(
                "cursor-pointer transition-all hover:border-primary/70",
                selectedTemplate === null
                  ? "border-primary/70 bg-primary/5"
                  : "border-border/60"
              )}
              onClick={() => setSelectedTemplate(null)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Start Fresh</CardTitle>
                <CardDescription className="text-xs">
                  Set up your workspace from scratch
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Template Options */}
            {templates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/70",
                  selectedTemplate === template.id
                    ? "border-primary/70 bg-primary/5"
                    : "border-border/60"
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No templates available</p>
        )}
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
        disabled={!isValid || isSubmitting || slugStatus?.is_available === false}
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