'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import {
  useUserOrganizations,
  usePendingInvitations,
  type Organization,
  type Invitation,
  type WorkspaceCreationResult,
} from '@/hooks/use-organizations'
import { authStorage } from '@/lib/auth-utils'
import { OrgCreationForm } from './components/OrgCreationForm'
import { ExistingOrgsList } from './components/ExistingOrgsList'
import { InvitationCard } from './components/InvitationCard'
import { Loader2, Building2, Users, Mail, ArrowLeft, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  TutorialProvider,
  useTutorialManager,
  WORKSPACE_HUB_TUTORIAL_STEPS,
} from '@/components/tutorial/tutorial-provider'
import { fetchOrganizationOverviews, type OrganizationOverview } from '@/lib/mock-organizations'
import type { OrganizationCardData } from './components/OrganizationCard'
import { useToast } from '@/hooks/use-toast'

type Choice = 'join-existing' | 'create-new' | 'accept-invitation'

interface WorkspaceHubForm {
  choice: Choice
  organizationName?: string
  divisionName?: string
  template?: string
}

const rolePriority: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
}

function WorkspaceHubContent() {
  const { user } = useCurrentUser()
  const { isLoading: isProtecting } = useProtectedRoute()
  const router = useRouter()
  const { start, isActive, isCompleted } = useTutorialManager('workspace-hub-intro')
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<Choice>('join-existing')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingOrgId, setProcessingOrgId] = useState<string | null>(null)
  const [enrichedOrganizations, setEnrichedOrganizations] = useState<OrganizationCardData[]>([])
  const [isFetchingOverviews, setIsFetchingOverviews] = useState(false)
  const [divisionSelections, setDivisionSelections] = useState<Record<string, string | null>>({})
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const storedOrgIdRef = useRef<string | null>(null)
  const storedDivisionIdRef = useRef<string | null>(null)

  const form = useForm<WorkspaceHubForm>({
    defaultValues: {
      choice: 'join-existing'
    },
    mode: 'onChange'
  })
  const { control, watch, setValue } = form

  // API hooks
  const { data: organizations, isLoading: orgsLoading, error: orgsError } = useUserOrganizations()
  const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations()

  const watchChoice = watch('choice')
  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') || []

  useEffect(() => {
    storedOrgIdRef.current = authStorage.getActiveOrganizationId()
    storedDivisionIdRef.current = authStorage.getActiveDivisionId()

    if (storedOrgIdRef.current) {
      setSelectedOrgId(storedOrgIdRef.current)
      setActiveOrgId(storedOrgIdRef.current)
    }
  }, [])

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

  // Auto-select tab based on available data
  useEffect(() => {
    if (pendingInvitations.length > 0 && !activeTab.includes('invitation')) {
      setActiveTab('accept-invitation')
      setValue('choice', 'accept-invitation')
    } else if (organizations && organizations.length > 0 && activeTab === 'create-new') {
      setActiveTab('join-existing')
      setValue('choice', 'join-existing')
    } else if (organizations && organizations.length === 0 && activeTab === 'join-existing') {
      setActiveTab('create-new')
      setValue('choice', 'create-new')
    }
  }, [organizations, pendingInvitations, activeTab, setActiveTab, setValue])

  useEffect(() => {
    if (!organizations) {
      setEnrichedOrganizations([])
      setDivisionSelections({})
      return
    }

    let isMounted = true

    const sortedOrganizations = [...organizations].sort((a, b) => {
      const roleWeightA = rolePriority[a.user_role?.toLowerCase() ?? 'member'] ?? 3
      const roleWeightB = rolePriority[b.user_role?.toLowerCase() ?? 'member'] ?? 3

      if (roleWeightA !== roleWeightB) {
        return roleWeightA - roleWeightB
      }

      return a.name.localeCompare(b.name)
    })

    const loadOverviews = async () => {
      setIsFetchingOverviews(true)
      let overviewByKey: Map<string, OrganizationOverview> = new Map()
      let overviewByName: Map<string, OrganizationOverview> = new Map()

      try {
        const identifiers = sortedOrganizations.map((organization) => organization.slug ?? organization.id)
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

        const enriched = sortedOrganizations.map<OrganizationCardData>((organization) => {
          const overview =
            overviewByKey.get(organization.slug ?? '')
            ?? overviewByKey.get(organization.id)
            ?? overviewByName.get(organization.name)

          return {
            id: organization.id,
            name: organization.name,
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

        setEnrichedOrganizations(enriched)
        setDivisionSelections((previous) => {
          const next = { ...previous }

          enriched.forEach((organization) => {
            const storedDivision =
              storedOrgIdRef.current === organization.id
                ? storedDivisionIdRef.current
                : null

            const existingSelection = next[organization.id]
            const existingIsValid = existingSelection
              ? organization.divisions.some((division) => division.id === existingSelection)
              : false

            const storedIsValid = storedDivision
              ? organization.divisions.some((division) => division.id === storedDivision)
              : false

            if (existingIsValid) {
              return
            }

            if (storedIsValid) {
              next[organization.id] = storedDivision
              return
            }

            next[organization.id] = organization.divisions[0]?.id ?? null
          })

          return next
        })

        setIsFetchingOverviews(false)
      }
    }

    void loadOverviews()

    return () => {
      isMounted = false
    }
  }, [organizations])

  const openOrganization = (
    organizationId: string,
    divisionId: string | null,
    fallbackOrganization?: Pick<Organization, 'id' | 'name' | 'divisions'>
  ) => {
    const organization = enrichedOrganizations.find((candidate) => candidate.id === organizationId)
    const divisions = organization?.divisions ?? fallbackOrganization?.divisions ?? []
    const organizationName = organization?.name ?? fallbackOrganization?.name ?? 'organization'

    if (divisions.length === 0) {
      toast({
        title: 'Division required',
        description: `Ask an admin to create a division for ${organizationName} before entering the workspace.`,
        variant: 'destructive',
      })
      setSelectedOrgId(organizationId)
      setIsProcessing(false)
      setProcessingOrgId(null)
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
      setIsProcessing(false)
      setProcessingOrgId(null)
      return
    }

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

    router.push(`/${organizationId}/${targetDivision.id}/dashboard`)
  }

  const handleOrgCreationSuccess = (result: WorkspaceCreationResult) => {
    const defaultDivisionId = result.organization.divisions[0]?.id ?? null
    setDivisionSelections((previous) => ({
      ...previous,
      [result.organization.id]: defaultDivisionId,
    }))

    openOrganization(result.organization.id, defaultDivisionId, {
      id: result.organization.id,
      name: result.organization.name,
      divisions: result.organization.divisions,
    })
  }

  const handleOrgSelection = (organizationId: string, divisionId: string | null) => {
    setSelectedOrgId(organizationId)
    if (divisionId) {
      setDivisionSelections((previous) => ({
        ...previous,
        [organizationId]: divisionId,
      }))
    }
    setProcessingOrgId(null)
    setIsProcessing(false)
  }

  const handleInvitationAccept = (_invitation: Invitation, organization: Organization) => {
    const defaultDivisionId = organization.divisions[0]?.id ?? null
    setDivisionSelections((previous) => ({
      ...previous,
      [organization.id]: defaultDivisionId,
    }))
    openOrganization(organization.id, defaultDivisionId, organization)
  }

  const handleDivisionSelect = (organizationId: string, divisionId: string | null) => {
    setDivisionSelections((previous) => ({
      ...previous,
      [organizationId]: divisionId,
    }))
    if (selectedOrgId === organizationId) {
      setSelectedOrgId(organizationId)
    }
  }

  const handleContinue = () => {
    if (isProcessing || !user || !selectedOrgId) return

    const divisionId = divisionSelections[selectedOrgId] ?? null
    openOrganization(selectedOrgId, divisionId)
  }

  const canContinue = useMemo(() => {
    if (isProcessing) return false

    switch (activeTab) {
      case 'join-existing': {
        if (!selectedOrgId) return false
        const organization = enrichedOrganizations.find((candidate) => candidate.id === selectedOrgId)
        if (!organization || organization.divisions.length === 0) return false
        const divisionId = divisionSelections[selectedOrgId] ?? organization.divisions[0]?.id ?? null
        return Boolean(divisionId)
      }
      case 'create-new':
        return true
      case 'accept-invitation':
        return pendingInvitations.length > 0
      default:
        return false
    }
  }, [activeTab, divisionSelections, enrichedOrganizations, isProcessing, pendingInvitations.length, selectedOrgId])

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 text-muted-foreground">
        <p>Setting up your workspace...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Loading state
  if ((orgsLoading && !organizations) || (invitationsLoading && !invitations) || (isFetchingOverviews && enrichedOrganizations.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Loading workspace options...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (orgsError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTitle>Unable to load organizations</AlertTitle>
            <AlertDescription>
              {orgsError instanceof Error ? orgsError.message : 'Please try refreshing the page.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/welcome')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Workspace Setup</h1>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to get started with your team
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto flex-1 px-6 py-8">
        <Card className="border-none shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold text-foreground">
              Let's Set Up Your Workspace
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Pick the option that works best for you. You can always change this later.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Choice Radio Buttons */}
            <div className="space-y-4" data-tutorial="choice-options">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium text-foreground">How would you like to get started?</Label>
                {!isCompleted && !isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={start}
                    className="flex items-center space-x-2 border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Start Tour</span>
                  </Button>
                )}
              </div>
              <Controller
                control={control}
                name="choice"
                render={({ field }) => (
                  <RadioGroup
                    {...field}
                    value={activeTab}
                    onValueChange={(value: Choice) => {
                      setActiveTab(value)
                      field.onChange(value)
                    }}
                  >
                    {pendingInvitations.length > 0 && (
                      <label
                        className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-blue-600/30 bg-blue-600/10 p-4 shadow-sm transition-all hover:border-blue-600/50 hover:bg-blue-600/20"
                        data-tutorial="accept-invitation-option"
                      >
                        <RadioGroupItem value="accept-invitation" className="mt-1" />
                        <div className="space-y-2">
                          <p className="font-medium text-foreground flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-400" />
                            Accept invitation
                            {pendingInvitations.length > 0 && (
                              <span className="text-xs bg-blue-600/20 text-blue-200 px-2 py-1 rounded-full">
                                {pendingInvitations.length} pending
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            You have pending invitations to join existing teams.
                          </p>
                        </div>
                      </label>
                    )}

                    <label
                      className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-border/60 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50"
                      data-tutorial="join-existing-option"
                    >
                      <RadioGroupItem value="join-existing" className="mt-1" />
                      <div className="space-y-2">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Join existing organization
                        </p>
                        <p className="text-sm text-muted-foreground">
                          We'll take you to the organization list so you can start collaborating right away.
                        </p>
                      </div>
                    </label>

                    <label
                      className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-border/60 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/50"
                      data-tutorial="create-new-option"
                    >
                      <RadioGroupItem value="create-new" className="mt-1" />
                      <div className="space-y-2">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Create new organization
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Spin up a fresh workspace, invite teammates, and optionally start from a template.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'accept-invitation' && pendingInvitations.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Pending Invitations</h3>
                  <div className="space-y-4">
                    {pendingInvitations.map((invitation) => (
                      <InvitationCard
                        key={invitation.id}
                        invitation={invitation}
                        onAccept={handleInvitationAccept}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'join-existing' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Your Organizations</h3>
                  {enrichedOrganizations.length > 0 || orgsLoading || isFetchingOverviews ? (
                    <ExistingOrgsList
                      organizations={enrichedOrganizations}
                      isLoading={orgsLoading || isFetchingOverviews}
                      onSelect={handleOrgSelection}
                      onDivisionSelect={handleDivisionSelect}
                      onEnter={(orgId, divisionId) => openOrganization(orgId, divisionId)}
                      selectedOrgId={selectedOrgId}
                      divisionSelections={divisionSelections}
                      activeOrgId={activeOrgId}
                      processingOrgId={processingOrgId}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                      <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
                      <h3 className="mt-6 text-xl font-semibold text-foreground">No organizations yet</h3>
                      <p className="mt-3 text-muted-foreground">
                        You can create your first organization using the option above.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'create-new' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold">Create New Organization</h3>
                  <OrgCreationForm
                    onSuccess={handleOrgCreationSuccess}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {activeTab === 'join-existing' && (
              <div className="flex justify-center pt-6 border-t">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={!canContinue || isProcessing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold transition-all duration-300"
                >
                  {isProcessing ? (
                    <span>Joining organization...</span>
                  ) : (
                    <>
                      Continue to Workspace
                      <Users className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Tutorial definitions for the workspace hub
const WORKSPACE_HUB_TUTORIALS = [
  {
    id: 'workspace-hub-intro',
    steps: WORKSPACE_HUB_TUTORIAL_STEPS,
    triggerOnMount: true,
  },
]

// Main export with tutorial provider
export default function WorkspaceHubPage() {
  return (
    <TutorialProvider tutorials={WORKSPACE_HUB_TUTORIALS}>
      <WorkspaceHubContent />
    </TutorialProvider>
  )
}