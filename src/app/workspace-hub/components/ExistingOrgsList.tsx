'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Building2, Users, ChevronRight, Crown, Shield, User } from 'lucide-react'
import { type Organization } from '@/hooks/use-organizations'
import { authStorage } from '@/lib/auth-utils'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ExistingOrgsListProps {
  organizations: Organization[]
  onSelect?: (organization: Organization) => void
  selectedOrgId?: string
}

export function ExistingOrgsList({ organizations, onSelect, selectedOrgId }: ExistingOrgsListProps) {
  const router = useRouter()
  const [joiningOrg, setJoiningOrg] = useState<string | null>(null)

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleSelectOrganization = (organization: Organization) => {
    setJoiningOrg(organization.id)

    // Set active organization and division in local storage
    authStorage.setActiveOrganizationId(organization.id)

    // Select first available division
    if (organization.divisions.length > 0) {
      const firstDivision = organization.divisions[0]
      authStorage.setActiveDivisionId(firstDivision.id)

      // Navigate to the workspace
      router.push(`/${organization.id}/${firstDivision.id}/dashboard`)
    } else {
      // Fallback to select-org if no divisions
      router.push('/select-org')
    }

    onSelect?.(organization)
  }

  if (organizations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No organizations yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You can create your first organization once onboarding wraps up.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Your organizations</h3>
        <Badge variant="secondary" className="text-xs">
          {organizations.length} available
        </Badge>
      </div>

      <div className="grid gap-4">
        {organizations.map((organization) => (
          <Card
            key={organization.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
              selectedOrgId === organization.id && "border-primary/50 bg-primary/5",
              joiningOrg === organization.id && "opacity-75"
            )}
            onClick={() => handleSelectOrganization(organization)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={organization.logo_url} alt={organization.name} />
                    <AvatarFallback>
                      <Building2 className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{organization.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getRoleBadgeColor(organization.user_role))}
                      >
                        <span className="flex items-center space-x-1">
                          {getRoleIcon(organization.user_role)}
                          <span>{organization.user_role}</span>
                        </span>
                      </Badge>
                      {organization.divisions.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="mr-1 h-3 w-3" />
                          {organization.divisions.length} division{organization.divisions.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              {organization.description && (
                <CardDescription className="line-clamp-2">
                  {organization.description}
                </CardDescription>
              )}
            </CardHeader>

            {organization.divisions.length > 0 && (
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Divisions:</span> {organization.divisions.map(d => d.name).join(', ')}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {joiningOrg && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Joining organization...
          </p>
        </div>
      )}
    </div>
  )
}