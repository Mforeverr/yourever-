'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { useCurrentUser } from '@/hooks/use-auth'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useWorkspaceHubOverviewQuery } from '@/hooks/api/use-workspace-hub-query'
import { useToast } from '@/hooks/use-toast'
import { authStorage } from '@/lib/auth-utils'
import {
  WORKSPACE_HUB_TUTORIAL_STEPS,
  useTutorialManager,
} from '@/components/tutorial/tutorial-provider'
import { useScope } from '@/contexts/scope-context'
import type { HubInvitation, HubOrganization } from '@/modules/organizations/types'
import type { WorkspaceCreationResult } from '@/hooks/use-organizations'
import type { OrganizationCardData } from '../components/OrganizationCard'

export interface WorkspaceHubForm {
  organizationName?: string
  divisionName?: string
  joinOrganizationId: string
  joinNickname: string
}

const rolePriority: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
}

interface UseWorkspaceHubControllerResult {
  user: ReturnType<typeof useCurrentUser>['user']
  isProtecting: boolean
  tutorial: ReturnType<typeof useTutorialManager>
  organizations: {
    list: OrganizationCardData[]
    isOverviewLoading: boolean
    isLoadingOrganizations: boolean
    selectedId: string | null
    activeId: string | null
    divisionSelections: Record<string, string | null>
    isProcessing: boolean
    processingId: string | null
    onSelect: (orgId: string, divisionId: string | null) => void
    onDivisionSelect: (orgId: string, divisionId: string | null) => void
    openOrganization: (
      organizationId: string,
      divisionId: string | null,
      fallbackOrganization?: Pick<HubOrganization, 'id' | 'name' | 'slug' | 'divisions'>,
    ) => void
  }
  joinDialog: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
    register: ReturnType<typeof useForm<WorkspaceHubForm>>['register']
    errors: ReturnType<typeof useForm<WorkspaceHubForm>>['formState']['errors']
    triggerAttempt: () => Promise<boolean>
  }
  createDialog: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    open: () => void
    onSuccess: (result: WorkspaceCreationResult) => void
    onError: (error: unknown) => void
  }
  invitations: {
    list: HubInvitation[]
    isLoading: boolean
    onAccept: (invitation: HubInvitation, organization: HubOrganization) => void
    onDecline: (invitation: HubInvitation) => void
  }
  statuses: {
    isInitialLoading: boolean
    organizationsError: unknown
  }
}

export function useWorkspaceHubController(): UseWorkspaceHubControllerResult {
  const { user } = useCurrentUser()
  const { isLoading: isProtecting } = useProtectedRoute()
  const router = useRouter()
  const { toast } = useToast()
  const tutorial = useTutorialManager('workspace-hub-intro')

  const form = useForm<WorkspaceHubForm>({
    defaultValues: {
      joinOrganizationId: '',
      joinNickname: '',
    },
    mode: 'onChange',
  })
  const { register, setValue, trigger, getValues, watch, formState } = form

  const storedOrgIdRef = useRef<string | null>(null)
  const storedDivisionIdRef = useRef<string | null>(null)

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [divisionSelections, setDivisionSelections] = useState<Record<string, string | null>>({})
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingOrgId, setProcessingOrgId] = useState<string | null>(null)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const { setScope } = useScope()

  const {
    data: hubOverview,
    status: hubStatus,
    error: hubError,
    isFetching: isFetchingHub,
  } = useWorkspaceHubOverviewQuery({
    enabled: Boolean(user),
  })

  const organizations = hubOverview?.organizations ?? []
  const invitations = hubOverview?.invitations ?? []

  const enrichedOrganizations = useMemo(() => buildOrganizationCards(organizations), [organizations])

  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === 'pending'),
    [invitations],
  )

  const isLoadingOrganizations = hubStatus === 'pending' && !hubOverview
  const isOverviewLoading = isFetchingHub && Boolean(hubOverview)
  const organizationsError = hubError
  const invitationsLoading = isFetchingHub && !hubOverview

  const watchJoinOrganizationId = watch('joinOrganizationId')

  useEffect(() => {
    storedOrgIdRef.current = authStorage.getActiveOrganizationId()
    storedDivisionIdRef.current = authStorage.getActiveDivisionId()

    if (storedOrgIdRef.current) {
      setSelectedOrgId(storedOrgIdRef.current)
      setActiveOrgId(storedOrgIdRef.current)
    }
  }, [])

  useEffect(() => {
    if (!enrichedOrganizations.length) {
      setDivisionSelections({})
      return
    }

    setDivisionSelections((previous) => {
      const next: Record<string, string | null> = { ...previous }
      let hasChanged = false

      for (const organization of enrichedOrganizations) {
        const storedDivision =
          storedOrgIdRef.current === organization.id ? storedDivisionIdRef.current : null
        const existingSelection = next[organization.id]
        const isExistingValid = existingSelection
          ? organization.divisions.some((division) => division.id === existingSelection)
          : false
        const isStoredValid = storedDivision
          ? organization.divisions.some((division) => division.id === storedDivision)
          : false

        if (isExistingValid) {
          continue
        }

        const newSelection = isStoredValid
          ? storedDivision
          : organization.divisions[0]?.id ?? null

        if (next[organization.id] !== newSelection) {
          next[organization.id] = newSelection
          hasChanged = true
        }
      }

      return hasChanged ? next : previous
    })
  }, [enrichedOrganizations])

  useEffect(() => {
    if (!selectedOrgId && enrichedOrganizations.length === 1) {
      const onlyOrganization = enrichedOrganizations[0]
      setSelectedOrgId(onlyOrganization.id)
      setDivisionSelections((previous) => ({
        ...previous,
        [onlyOrganization.id]: previous[onlyOrganization.id] ?? onlyOrganization.divisions[0]?.id ?? null,
      }))
    }
  }, [enrichedOrganizations, selectedOrgId])

  useEffect(() => {
    if (!selectedOrgId) {
      return
    }

    const currentValue = (watchJoinOrganizationId ?? '').trim()
    if (currentValue !== selectedOrgId) {
      setValue('joinOrganizationId', selectedOrgId, {
        shouldDirty: false,
        shouldValidate: false,
      })
    }
  }, [selectedOrgId, watchJoinOrganizationId, setValue])

  const resetProcessing = useCallback(() => {
    setIsProcessing(false)
    setProcessingOrgId(null)
  }, [])

  const openOrganization = useCallback<
    UseWorkspaceHubControllerResult['organizations']['openOrganization']
  >(
    (organizationId, divisionId, fallbackOrganization) => {
      const organization = enrichedOrganizations.find((candidate) => candidate.id === organizationId)
      const divisions = organization?.divisions ?? fallbackOrganization?.divisions ?? []
      const organizationName = organization?.name ?? fallbackOrganization?.name ?? 'organization'

      // Get organization slug with fallback to ID for backward compatibility
      const orgSlug = organization?.slug ?? fallbackOrganization?.slug ?? organizationId

      if (divisions.length === 0) {
        toast({
          title: 'Division required',
          description: `Ask an admin to create a division for ${organizationName} before entering the workspace.`,
          variant: 'destructive',
        })
        setSelectedOrgId(organizationId)
        resetProcessing()
        return
      }

      const targetDivision = divisionId
        ? divisions.find((division) => division.id === divisionId) ?? divisions[0]
        : divisions[0]

      if (!targetDivision) {
        toast({
          title: 'Select a division',
          description: 'Choose a division to continue into the workspace.',
        })
        setSelectedOrgId(organizationId)
        resetProcessing()
        return
      }

      // Get division slug with fallback to key or ID for backward compatibility
      const divisionSlug = targetDivision.key ?? targetDivision.id

      setSelectedOrgId(organizationId)
      setIsProcessing(true)
      setProcessingOrgId(organizationId)

      setActiveOrgId(organizationId)
      setDivisionSelections((previous) => ({
        ...previous,
        [organizationId]: targetDivision.id,
      }))

      void setScope(organizationId, targetDivision.id, { reason: 'workspace-hub:enter' })
        .then(() => {
          router.push(`/${orgSlug}/${divisionSlug}/dashboard`)
        })
        .catch((error: unknown) => {
          toast({
            title: 'Failed to enter workspace',
            description:
              error instanceof Error
                ? error.message
                : 'We could not update your workspace scope. Please try again.',
            variant: 'destructive',
          })
        })
        .finally(resetProcessing)
    },
    [enrichedOrganizations, toast, resetProcessing, router, setScope],
  )

  const handleOrgCreationSuccess = useCallback(
    (result: WorkspaceCreationResult) => {
      setIsCreateDialogOpen(false)
      const defaultDivisionId = result.organization.divisions[0]?.id ?? null
      setDivisionSelections((previous) => ({
        ...previous,
        [result.organization.id]: defaultDivisionId,
      }))

      // Show success message and keep user on workspace hub
      toast({
        title: 'Organization created successfully!',
        description: `"${result.organization.name}" is now available in your organizations list.`,
        variant: 'default',
      })

      // The organizations list will automatically refresh due to query invalidation
      // No redirect - user stays on workspace hub
    },
    [toast],
  )

  const handleOrgCreationError = useCallback(
    (_error: unknown) => {
      toast({
        title: 'Failed to create organization',
        description: 'Something went wrong while setting up the workspace. Please try again.',
        variant: 'destructive',
      })
    },
    [toast],
  )

  const handleJoinDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open && selectedOrgId) {
        setValue('joinOrganizationId', selectedOrgId, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        })
      }
      setIsJoinDialogOpen(open)
    },
    [selectedOrgId, setValue],
  )

  const attemptJoinOrganization = useCallback(async () => {
    if (isProcessing || !user) {
      return false
    }

    const isValid = await trigger(['joinOrganizationId', 'joinNickname'])
    if (!isValid) {
      return false
    }

    const { joinOrganizationId } = getValues()
    const trimmedId = joinOrganizationId.trim()
    const organization = enrichedOrganizations.find((candidate) => candidate.id === trimmedId)

    if (!organization) {
      toast({
        title: 'Organization not found',
        description: 'Double-check the organization ID and try again.',
        variant: 'destructive',
      })
      return false
    }

    setSelectedOrgId(organization.id)
    const divisionId = divisionSelections[organization.id] ?? organization.divisions[0]?.id ?? null
    setIsJoinDialogOpen(false)
    openOrganization(organization.id, divisionId)
    return true
  }, [
    divisionSelections,
    enrichedOrganizations,
    getValues,
    isProcessing,
    openOrganization,
    toast,
    trigger,
    user,
  ])

  const handleJoinDialogSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await attemptJoinOrganization()
    },
    [attemptJoinOrganization],
  )

  const handleOrgSelection = useCallback(
    (organizationId: string, divisionId: string | null) => {
      setSelectedOrgId(organizationId)
      setValue('joinOrganizationId', organizationId, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })

      if (divisionId) {
        setDivisionSelections((previous) => ({
          ...previous,
          [organizationId]: divisionId,
        }))
      }

      resetProcessing()
    },
    [resetProcessing, setValue],
  )

  const handleDivisionSelect = useCallback((organizationId: string, divisionId: string | null) => {
    setDivisionSelections((previous) => ({
      ...previous,
      [organizationId]: divisionId,
    }))

    if (selectedOrgId === organizationId) {
      setSelectedOrgId(organizationId)
    }
  }, [selectedOrgId])

  const handleInvitationAccept = useCallback(
    (_invitation: HubInvitation, organization: HubOrganization) => {
      const defaultDivisionId = organization.divisions[0]?.id ?? null
      setDivisionSelections((previous) => ({
        ...previous,
        [organization.id]: defaultDivisionId,
      }))
      openOrganization(organization.id, defaultDivisionId, organization)
    },
    [openOrganization],
  )

  const handleInvitationDecline = useCallback((_invitation: HubInvitation) => {
    // The mutation hook invalidates pending invitations, so no additional state updates are required here.
  }, [])

  const isInitialLoading = useMemo(() => {
    const hasOverview = Boolean(hubOverview)
    const hasInvitations = Boolean(invitations.length)

    return (
      (isLoadingOrganizations && !hasOverview) ||
      (invitationsLoading && !hasInvitations) ||
      (isOverviewLoading && enrichedOrganizations.length === 0)
    )
  }, [
    enrichedOrganizations.length,
    invitations,
    invitationsLoading,
    isLoadingOrganizations,
    isOverviewLoading,
    hubOverview,
  ])

  return {
    user,
    isProtecting,
    tutorial,
    organizations: {
      list: enrichedOrganizations,
      isOverviewLoading,
      isLoadingOrganizations,
      selectedId: selectedOrgId,
      activeId: activeOrgId,
      divisionSelections,
      isProcessing,
      processingId: processingOrgId,
      onSelect: handleOrgSelection,
      onDivisionSelect: handleDivisionSelect,
      openOrganization,
    },
    joinDialog: {
      isOpen: isJoinDialogOpen,
      onOpenChange: handleJoinDialogOpenChange,
      onSubmit: handleJoinDialogSubmit,
      register,
      errors: formState.errors,
      triggerAttempt: attemptJoinOrganization,
    },
    createDialog: {
      isOpen: isCreateDialogOpen,
      onOpenChange: setIsCreateDialogOpen,
      open: () => setIsCreateDialogOpen(true),
      onSuccess: handleOrgCreationSuccess,
      onError: handleOrgCreationError,
    },
    invitations: {
      list: pendingInvitations,
      isLoading: invitationsLoading,
      onAccept: handleInvitationAccept,
      onDecline: handleInvitationDecline,
    },
    statuses: {
      isInitialLoading,
      organizationsError,
    },
  }
}

function buildOrganizationCards(organizations: HubOrganization[]): OrganizationCardData[] {
  const sorted = [...organizations].sort(compareOrganizationsByRole)

  return sorted.map<OrganizationCardData>((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug ?? organization.id,
    role: organization.userRole ?? 'member',
    divisions: organization.divisions ?? [],
    description: organization.description ?? undefined,
    tagline: organization.industry ?? undefined,
    industry: organization.industry ?? undefined,
    location: organization.location ?? undefined,
    timezone: organization.timezone ?? undefined,
    memberCount: organization.memberCount ?? undefined,
    activeProjects: organization.activeProjects ?? undefined,
    lastActive: organization.lastActiveAt ?? undefined,
    tags: organization.tags ?? undefined,
    accentColor: organization.accentColor ?? undefined,
    logoUrl: organization.logoUrl ?? undefined,
  }))
}

function compareOrganizationsByRole(a: HubOrganization, b: HubOrganization) {
  const roleWeightA = rolePriority[a.userRole?.toLowerCase() ?? 'member'] ?? 3
  const roleWeightB = rolePriority[b.userRole?.toLowerCase() ?? 'member'] ?? 3

  if (roleWeightA !== roleWeightB) {
    return roleWeightA - roleWeightB
  }

  return a.name.localeCompare(b.name)
}

export const WORKSPACE_HUB_TUTORIALS = [
  {
    id: 'workspace-hub-intro',
    steps: WORKSPACE_HUB_TUTORIAL_STEPS,
    triggerOnMount: true,
  },
]
