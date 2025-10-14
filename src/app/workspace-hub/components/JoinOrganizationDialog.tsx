'use client'

import { FormEvent } from 'react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import type { WorkspaceHubForm } from '../page'

export interface JoinOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  register: UseFormRegister<WorkspaceHubForm>
  errors: FieldErrors<WorkspaceHubForm>
}

export function JoinOrganizationDialog({
  open,
  onOpenChange,
  onSubmit,
  register,
  errors,
}: JoinOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Join an existing organization</CardTitle>
              <CardDescription>
                Enter the organization ID provided by your admin and choose how your name should appear to teammates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinOrganizationId">Organization ID</Label>
                <Input
                  id="joinOrganizationId"
                  autoComplete="off"
                  placeholder="e.g. org_12345"
                  {...register('joinOrganizationId', { required: 'Organization ID is required' })}
                />
                {errors.joinOrganizationId && (
                  <p className="text-sm text-destructive">{errors.joinOrganizationId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinNickname">Join as</Label>
                <Input
                  id="joinNickname"
                  autoComplete="nickname"
                  placeholder="Your display name"
                  {...register('joinNickname', { required: 'Please provide a nickname' })}
                />
                {errors.joinNickname && (
                  <p className="text-sm text-destructive">{errors.joinNickname.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" size="lg" className="flex w-full items-center justify-center gap-2 sm:w-auto">
                Continue to Workspace
                <Users className="h-5 w-5" />
              </Button>
            </CardFooter>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  )
}
