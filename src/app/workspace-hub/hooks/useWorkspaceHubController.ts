'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import { useCurrentUser } from '@/hooks/use-auth'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import {
  usePendingInvitations,
  useUserOrganizations,
  type Invitation,
  type Organization,
  type WorkspaceCreationResult,
} from '@/hooks/use-organizations'
import { useToast } from '@/hooks/use-toast'
import { authStorage } from '@/lib/auth-utils'
import { fetchOrganizationOverviews, type OrganizationOverview } from '@/lib/mock-organizations'
import {
  WORKSPACE_HUB_TUTORIAL_STEPS,
  useTutorialManager,
} from '@/components/tutorial/tutorial-provider'
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
      fallbackOrganization?: Pick<Organization, 'id' | 'name' | 'slug' | 'divisions'>,
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
    list: Invitation[]
    isLoading: boolean
    onAccept: (invitation: Invitation, organization: Organization) => void
    onDecline: (invitation: Invitation) => void
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

  const {
    data: organizations,
    isLoading: isLoadingOrganizations,
    error: organizationsError,
  } = useUserOrganizations()
  const {
    data: invitations,
    isLoading: invitationsLoading,
  } = usePendingInvitations()

  const pendingInvitations = useMemo(
    () => invitations?.filter((invitation) => invitation.status === 'pending') ?? [],
    [invitations],
  )

  const {
    list: enrichedOrganizations,
    isLoading: isOverviewLoading,
  } = useEnrichedOrganizations(organizations)

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

      authStorage.setActiveOrganizationId(organizationId)
      authStorage.setActiveDivisionId(targetDivision.id)
      setActiveOrgId(organizationId)
      setDivisionSelections((previous) => ({
        ...previous,
        [organizationId]: targetDivision.id,
      }))

      // Construct URL using slugs instead of IDs
      router.push(`/${orgSlug}/${divisionSlug}/dashboard`)
    },
    [enrichedOrganizations, toast, resetProcessing, router],
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
    (_invitation: Invitation, organization: Organization) => {
      const defaultDivisionId = organization.divisions[0]?.id ?? null
      setDivisionSelections((previous) => ({
        ...previous,
        [organization.id]: defaultDivisionId,
      }))
      openOrganization(organization.id, defaultDivisionId, organization)
    },
    [openOrganization],
  )

  const handleInvitationDecline = useCallback((_invitation: Invitation) => {
    // The mutation hook invalidates pending invitations, so no additional state updates are required here.
  }, [])

  const isInitialLoading = useMemo(() => {
    const noOrgsYet = !organizations
    const noInvitationsYet = !invitations

    return (
      (isLoadingOrganizations && noOrgsYet) ||
      (invitationsLoading && noInvitationsYet) ||
      (isOverviewLoading && enrichedOrganizations.length === 0)
    )
  }, [
    enrichedOrganizations.length,
    invitations,
    invitationsLoading,
    isLoadingOrganizations,
    isOverviewLoading,
    organizations,
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

interface EnrichedOrganizationsState {
  list: OrganizationCardData[]
  isLoading: boolean
}

function useEnrichedOrganizations(organizations?: Organization[] | null): EnrichedOrganizationsState {
  const [state, setState] = useState<EnrichedOrganizationsState>({ list: [], isLoading: false })

  useEffect(() => {
    if (!organizations || organizations.length === 0) {
      setState({ list: [], isLoading: false })
      return
    }

    let isMounted = true
    const sorted = [...organizations].sort(compareOrganizationsByRole)

    const loadOverviews = async () => {
      setState((previous) => ({ ...previous, isLoading: true }))

      let overviewByKey: Map<string, OrganizationOverview> = new Map()
      let overviewByName: Map<string, OrganizationOverview> = new Map()

      try {
        const identifiers = sorted.map((organization) => organization.slug ?? organization.id)
        if (identifiers.length > 0) {
          const overviews = await fetchOrganizationOverviews(identifiers)
          overviewByKey = new Map(overviews.map((overview) => [overview.id, overview]))
          overviewByName = new Map(overviews.map((overview) => [overview.name, overview]))
        }
      } catch (error) {
        console.warn('Failed to load organization overviews', error)
      } finally {
        if (!isMounted) {
          return
        }

        const list = sorted.map<OrganizationCardData>((organization) => {
          const overview =
            overviewByKey.get(organization.slug ?? '') ??
            overviewByKey.get(organization.id) ??
            overviewByName.get(organization.name)

          return {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            role: organization.user_role,
            divisions: organization.divisions,
            description: organization.description,
            tagline: overview?.tagline,
            industry: overview?.industry,
            location: overview?.location,
            timezone: overview?.timezone,
            memberCount: overview?.memberCount,
            activeProjects: overview?.activeProjects,
            lastActive: overview?.lastActive,
            tags: overview?.tags,
            accentColor: overview?.accentColor,
            logoUrl: overview?.logoUrl ?? organization.logo_url,
          }
        })

        setState({ list, isLoading: false })
      }
    }

    void loadOverviews()

    return () => {
      isMounted = false
    }
  }, [organizations])

  return state
}

function compareOrganizationsByRole(a: Organization, b: Organization) {
  const roleWeightA = rolePriority[a.user_role?.toLowerCase() ?? 'member'] ?? 3
  const roleWeightB = rolePriority[b.user_role?.toLowerCase() ?? 'member'] ?? 3

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
