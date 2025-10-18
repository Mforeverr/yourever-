'use client'

import type { ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ExistingOrgsList } from './components/ExistingOrgsList'
import { InvitationCard } from './components/InvitationCard'
import { JoinOrganizationDialog } from './components/JoinOrganizationDialog'
import { OrgCreationForm } from './components/OrgCreationForm'
import { TutorialProvider } from '@/components/tutorial/tutorial-provider'
import {
  WORKSPACE_HUB_TUTORIALS,
  useWorkspaceHubController,
  type WorkspaceHubForm,
} from './hooks/useWorkspaceHubController'
import { Loader2, Building2, Users, Mail, Sparkles } from 'lucide-react'
import type { Invitation, Organization } from '@/hooks/use-organizations'
import { ScopeProvider } from '@/contexts/scope-context'

function WorkspaceHubContent() {
  const {
    user,
    isProtecting,
    tutorial,
    organizations,
    joinDialog,
    createDialog,
    invitations,
    statuses,
  } = useWorkspaceHubController()

  if (isProtecting) {
    return <FullScreenState message="Setting up your workspace..." variant="muted" />
  }

  if (!user) {
    return null
  }

  if (statuses.isInitialLoading) {
    return <LoadingState />
  }

  if (statuses.organizationsError) {
    return <ErrorState error={statuses.organizationsError} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <WorkspaceHubHeader tutorial={tutorial} />

        <main data-tutorial="choice-options" className="grid gap-6 lg:grid-cols-[3fr_1fr]">
          <section className="space-y-6">
            {invitations.list.length > 0 && (
              <PendingInvitationsCard
                invitations={invitations.list}
                onAccept={invitations.onAccept}
                onDecline={invitations.onDecline}
              />
            )}

            <JoinExistingOrganizationsCard
              joinDialog={joinDialog}
              organizations={organizations}
            />
          </section>

          <WorkspaceActionsSidebar
            createDialog={createDialog}
            organizations={organizations}
          />
        </main>

        <CreateOrganizationDialog createDialog={createDialog} />
      </div>
    </div>
  )
}

export default function WorkspaceHubPage() {
  return (
    <ScopeProvider>
      <TutorialProvider tutorials={WORKSPACE_HUB_TUTORIALS}>
        <WorkspaceHubContent />
      </TutorialProvider>
    </ScopeProvider>
  )
}

// -------------------------------------------------------------------------------------
// Section components
// -------------------------------------------------------------------------------------

type WorkspaceHubState = ReturnType<typeof useWorkspaceHubController>

interface WorkspaceHubHeaderProps {
  tutorial: WorkspaceHubState['tutorial']
}

function WorkspaceHubHeader({ tutorial }: WorkspaceHubHeaderProps) {
  // TODO: TESTING MODIFICATION - Always show tour button for testing purposes
  // This bypasses the normal completion check to allow repeated tutorial testing
  // In production, revert to: const shouldShowTourButton = !tutorial.isCompleted && !tutorial.isActive
  const shouldShowTourButton = true

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace Hub</h1>
        <p className="text-sm text-muted-foreground">
          Review your invitations, jump into an existing organization, or spin up something new.
        </p>
      </div>
      {shouldShowTourButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={tutorial.start}
          className="flex w-fit items-center gap-2 border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
        >
          <Sparkles className="h-4 w-4" />
          <span>{tutorial.isActive ? 'Restart tour' : 'Start tour'}</span>
        </Button>
      )}
    </header>
  )
}

interface PendingInvitationsCardProps {
  invitations: Invitation[]
  onAccept: (invitation: Invitation, organization: Organization) => void
  onDecline: (invitation: Invitation) => void
}

function PendingInvitationsCard({ invitations, onAccept, onDecline }: PendingInvitationsCardProps) {
  return (
    <Card
      data-tutorial="accept-invitation-option"
      className="relative overflow-hidden border border-blue-500/40 bg-blue-950/30 text-blue-100 backdrop-blur"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-500"
      />
      <CardHeader className="flex flex-col gap-4 p-6 pb-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-blue-200">
            <Mail className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-blue-50">
              Pending workspace invitations
              <span className="rounded-full border border-blue-400/40 bg-blue-500/20 px-2 py-0.5 text-xs font-normal">
                {invitations.length} pending
              </span>
            </CardTitle>
            <CardDescription className="max-w-xl text-sm text-blue-100/80">
              Review invitations from teammates. Accept to enter instantly or decline to keep your workspace list tidy.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onAccept={onAccept}
            onDecline={onDecline}
            compact
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface JoinExistingOrganizationsCardProps {
  joinDialog: WorkspaceHubState['joinDialog']
  organizations: WorkspaceHubState['organizations']
}

function JoinExistingOrganizationsCard({ joinDialog, organizations }: JoinExistingOrganizationsCardProps) {
  const showExistingOrgs =
    organizations.list.length > 0 || organizations.isLoadingOrganizations || organizations.isOverviewLoading

  return (
    <Card data-tutorial="join-existing-option">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-xl">Join an organization you already belong to</CardTitle>
          <CardDescription>
            Use the list below to open an organization or join with an invite code if it&apos;s not listed.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="flex items-center gap-2"
          onClick={() => joinDialog.onOpenChange(true)}
        >
          <Building2 className="h-4 w-4" />
          Join via ID
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <JoinOrganizationDialog
          open={joinDialog.isOpen}
          onOpenChange={joinDialog.onOpenChange}
          onSubmit={joinDialog.onSubmit}
          register={joinDialog.register}
          errors={joinDialog.errors}
        />

        {showExistingOrgs ? (
          <ExistingOrgsList
            organizations={organizations.list}
            isLoading={organizations.isLoadingOrganizations || organizations.isOverviewLoading}
            onSelect={organizations.onSelect}
            onDivisionSelect={organizations.onDivisionSelect}
            onEnter={organizations.openOrganization}
            selectedOrgId={organizations.selectedId}
            divisionSelections={organizations.divisionSelections}
            activeOrgId={organizations.activeId}
            processingOrgId={organizations.processingId}
          />
        ) : (
          <EmptyOrganizationsState>
            <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
            <h3 className="mt-6 text-lg font-semibold text-foreground">No organizations yet</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              You can create your first organization from the quick actions on the right.
            </p>
          </EmptyOrganizationsState>
        )}
      </CardContent>
    </Card>
  )
}

interface WorkspaceActionsSidebarProps {
  createDialog: WorkspaceHubState['createDialog']
  organizations: WorkspaceHubState['organizations']
}

function WorkspaceActionsSidebar({ createDialog, organizations }: WorkspaceActionsSidebarProps) {
  return (
    <aside className="space-y-6">
      <Card data-tutorial="create-new-option">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Create a new organization
          </CardTitle>
          <CardDescription>
            Launch a fresh workspace and invite teammates in just a few steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            variant="secondary"
            onClick={createDialog.open}
          >
            Create organization
          </Button>
          <p className="text-xs text-muted-foreground">
            We&apos;ll walk you through naming the organization, choosing a division, and inviting your team.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Active organization</CardTitle>
          <CardDescription>
            We remember where you left off so you can hop back in with one click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.activeId ? (
            <Button
              className="w-full"
              variant="secondary"
              disabled={organizations.isProcessing && organizations.processingId === organizations.activeId}
              onClick={() => {
                const activeId = organizations.activeId
                if (!activeId) return
                const divisionId = organizations.divisionSelections[activeId] ?? null
                organizations.openOrganization(activeId, divisionId)
              }}
            >
              Return to last workspace
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select any organization to set it as your default workspace.
            </p>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}

interface CreateOrganizationDialogProps {
  createDialog: WorkspaceHubState['createDialog']
}

function CreateOrganizationDialog({ createDialog }: CreateOrganizationDialogProps) {
  return (
    <Dialog open={createDialog.isOpen} onOpenChange={createDialog.onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0">
        <Card className="max-h-[85vh] overflow-hidden">
          <CardHeader className="space-y-2">
            <CardTitle>Create a new organization</CardTitle>
            <CardDescription>
              Spin up a fresh workspace and invite teammates without leaving this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto p-6">
            <OrgCreationForm onSuccess={createDialog.onSuccess} onError={createDialog.onError} />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// -------------------------------------------------------------------------------------
// State helpers
// -------------------------------------------------------------------------------------

function FullScreenState({ message, variant }: { message: string; variant: 'muted' | 'default' }) {
  const backgroundClass = variant === 'muted' ? 'bg-muted/30 text-muted-foreground' : 'bg-background text-muted-foreground'

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center ${backgroundClass}`}>
      <p>{message}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-muted-foreground">
      <div className="space-y-4 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        <p>Loading workspace options...</p>
      </div>
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertTitle>Unable to load organizations</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Please try refreshing the page.'}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

function EmptyOrganizationsState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
      {children}
    </div>
  )
}
