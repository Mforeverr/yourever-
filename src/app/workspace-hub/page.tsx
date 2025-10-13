'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useCurrentUser } from '@/hooks/use-auth'
import { useUserOrganizations, usePendingInvitations } from '@/hooks/use-organizations'
import { authStorage } from '@/lib/auth-utils'
import { OrgCreationForm } from './components/OrgCreationForm'
import { ExistingOrgsList } from './components/ExistingOrgsList'
import { InvitationCard } from './components/InvitationCard'
import { Loader2, Building2, Users, Mail, ArrowLeft, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TutorialProvider, useTutorialManager } from '@/components/tutorial/tutorial-provider'

type Choice = 'join-existing' | 'create-new' | 'accept-invitation'

interface WorkspaceHubForm {
  choice: Choice
  organizationName?: string
  divisionName?: string
  template?: string
}

function WorkspaceHubContent() {
  const { user } = useCurrentUser()
  const { isLoading: isProtecting } = useProtectedRoute()
  const router = useRouter()
  const { start, isActive, isCompleted } = useTutorialManager('workspace-hub-intro')

  const [activeTab, setActiveTab] = useState<Choice>('join-existing')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

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

  const handleOrgCreationSuccess = (result: any) => {
    setIsProcessing(true)

    // Set active organization and division
    authStorage.setActiveOrganizationId(result.organization.id)
    if (result.organization.divisions.length > 0) {
      authStorage.setActiveDivisionId(result.organization.divisions[0].id)
    }

    // Navigate to dashboard
    setTimeout(() => {
      if (result.organization.divisions.length > 0) {
        router.push(`/${result.organization.id}/${result.organization.divisions[0].id}/dashboard`)
      } else {
        router.push('/select-org')
      }
    }, 1000)
  }

  const handleOrgSelection = (organization: any) => {
    setSelectedOrgId(organization.id)
  }

  const handleInvitationAccept = () => {
    setIsProcessing(true)
    // Invitation acceptance is handled by the mutation hook
    // We'll navigate after successful acceptance
    setTimeout(() => {
      router.push('/select-org')
      setIsProcessing(false)
    }, 1000)
  }

  const handleContinue = () => {
    if (isProcessing || !user) return

    if (watchChoice === 'join-existing' && selectedOrgId) {
      const targetOrg = organizations?.find(org => org.id === selectedOrgId)
      if (targetOrg) {
        authStorage.setActiveOrganizationId(targetOrg.id)
        if (targetOrg.divisions[0]) {
          authStorage.setActiveDivisionId(targetOrg.divisions[0].id)
          router.push(`/${targetOrg.id}/${targetOrg.divisions[0].id}/dashboard`)
        } else {
          router.push('/select-org')
        }
      }
    }
  }

  const canContinue = useMemo(() => {
    if (isProcessing) return false

    switch (activeTab) {
      case 'join-existing':
        return organizations && organizations.length > 0 && selectedOrgId !== null
      case 'create-new':
        return true // Form validation handles this
      case 'accept-invitation':
        return pendingInvitations.length > 0
      default:
        return false
    }
  }, [activeTab, organizations, selectedOrgId, pendingInvitations.length, isProcessing])

  if (isProtecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-muted-foreground">
        <p>Setting up your workspace...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Loading state
  if (orgsLoading || invitationsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading workspace options...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (orgsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
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
                    className="flex items-center space-x-2 border-blue-200 text-blue-600 hover:bg-blue-50"
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
                        className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-100/50"
                        data-tutorial="accept-invitation-option"
                      >
                        <RadioGroupItem value="accept-invitation" className="mt-1" />
                        <div className="space-y-2">
                          <p className="font-medium text-foreground flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-600" />
                            Accept invitation
                            {pendingInvitations.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
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
                  {organizations && organizations.length > 0 ? (
                    <ExistingOrgsList
                      organizations={organizations}
                      onSelect={handleOrgSelection}
                      selectedOrgId={selectedOrgId}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
                      <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
                      <h3 className="mt-6 text-xl font-semibold">No organizations yet</h3>
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
    steps: [
      {
        id: 'welcome-choice',
        title: 'Welcome to Workspace Setup! 👋',
        description: 'Let me guide you through setting up your workspace. You can choose how you want to get started - create your own, join existing, or accept invitations.',
        targetSelector: '[data-tutorial="choice-options"]',
        position: 'bottom' as const,
        nextLabel: 'Next Step',
        showProgress: true,
      },
      {
        id: 'create-option',
        title: 'Create Your Own Workspace',
        description: 'Choose this option if you want to be the admin and set up everything yourself. Perfect for new teams!',
        targetSelector: '[data-tutorial="create-new-option"]',
        position: 'right' as const,
        nextLabel: 'Learn More',
        showProgress: true,
      },
      {
        id: 'join-option',
        title: 'Join an Existing Team',
        description: 'Already have a team? Select this to join an organization you\'re already a member of.',
        targetSelector: '[data-tutorial="join-existing-option"]',
        position: 'left' as const,
        nextLabel: 'See Invitations',
        showProgress: true,
      },
      {
        id: 'invitation-option',
        title: 'Accept Team Invitations',
        description: 'If someone invited you to their workspace, you\'ll see those invitations here. Just click to join!',
        targetSelector: '[data-tutorial="accept-invitation-option"]',
        position: 'left' as const,
        nextLabel: 'Got it!',
        showProgress: true,
      },
    ],
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