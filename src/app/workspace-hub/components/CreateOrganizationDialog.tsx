'use client'

import { ReactNode } from 'react'
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import type { WorkspaceCreationResult } from '@/hooks/use-organizations'
import { OrgCreationForm } from './OrgCreationForm'

export interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (result: WorkspaceCreationResult) => void
  onError?: (error: unknown) => void
  trigger: ReactNode
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
  trigger,
}: CreateOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl p-0">
        <Card className="max-h-[85vh] overflow-hidden">
          <CardHeader className="space-y-2">
            <CardTitle>Create a new organization</CardTitle>
            <CardDescription>
              Spin up a fresh workspace, invite teammates, and optionally start from a template.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto p-6">
            <OrgCreationForm onSuccess={onSuccess} onError={onError} />
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
