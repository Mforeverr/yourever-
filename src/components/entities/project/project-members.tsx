'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  type ProjectMembersResponse,
  PROJECT_I18N_KEYS,
  projectQueryKeys,
  useAddProjectMember,
  useProjectEnvironment,
  useProjectMembers,
  useRemoveProjectMember,
} from "@/modules/projects"
import { mockUsers } from "@/lib/mock-users"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2 } from "lucide-react"
import { enMessages } from "@/locales/en"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectMembersProps {
  projectId: string
}

const messages = enMessages

const ROLE_LABELS: Record<ProjectMembersResponse["members"][number]["role"], string> = {
  owner: messages[PROJECT_I18N_KEYS.members.roleOwner],
  editor: messages[PROJECT_I18N_KEYS.members.roleEditor],
  viewer: messages[PROJECT_I18N_KEYS.members.roleViewer],
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const { toast } = useToast()
  const { scope } = useProjectEnvironment()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectMembersResponse["members"][number]["role"]>("editor")

  useEffect(() => {
    if (!dialogOpen) {
      setSelectedUserId(null)
      setSelectedRole("editor")
    }
  }, [dialogOpen])

  const membersQuery = useProjectMembers(projectId)

  const members = membersQuery.data?.members ?? []

  const addMember = useAddProjectMember(projectId, {
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: projectQueryKeys.members(scope, projectId) })
      const previous = queryClient.getQueryData<ProjectMembersResponse>(projectQueryKeys.members(scope, projectId))
      if (previous) {
        const user = mockUsers.find((candidate) => candidate.id === payload.userId)
        const fullName = user ? `${user.firstName} ${user.lastName}` : payload.userId
        const email = user?.email ?? `${payload.userId}@example.com`
        const optimistic: ProjectMembersResponse = {
          projectId,
          members: [
            ...previous.members,
            {
              userId: payload.userId,
              fullName,
              email,
              role: payload.role,
              joinedAt: new Date().toISOString(),
              isActive: true,
              avatarUrl: user?.avatar,
            },
          ],
        }
        queryClient.setQueryData(projectQueryKeys.members(scope, projectId), optimistic)
      }

      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectQueryKeys.members(scope, projectId), context.previous)
      }
      toast({
        variant: "destructive",
        title: "Unable to add member",
        description: "Please try again later.",
      })
    },
    onSuccess: () => {
      toast({
        title: messages[PROJECT_I18N_KEYS.feedback.memberAdded],
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(scope, projectId) })
    },
  })

  const removeMember = useRemoveProjectMember({
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: projectQueryKeys.members(scope, payload.projectId) })
      const previous = queryClient.getQueryData<ProjectMembersResponse>(
        projectQueryKeys.members(scope, payload.projectId)
      )
      if (previous) {
        const optimistic: ProjectMembersResponse = {
          projectId: payload.projectId,
          members: previous.members.filter((member) => member.userId !== payload.userId),
        }
        queryClient.setQueryData(projectQueryKeys.members(scope, payload.projectId), optimistic)
      }
      return { previous }
    },
    onError: (_error, payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(projectQueryKeys.members(scope, payload.projectId), context.previous)
      }
      toast({
        variant: "destructive",
        title: "Unable to remove member",
      })
    },
    onSuccess: () => {
      toast({
        title: messages[PROJECT_I18N_KEYS.feedback.memberRemoved],
      })
    },
    onSettled: (data) => {
      const id = data?.projectId ?? projectId
      queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(scope, id) })
    },
  })

  const availableUsers = useMemo(() => {
    const existingIds = new Set(members.map((member) => member.userId))
    return mockUsers.filter((user) => !existingIds.has(user.id)).map((user) => ({
      id: user.id,
      label: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatar: user.avatar,
    }))
  }, [members])

  const handleAddMember = () => {
    if (!selectedUserId) return
    addMember.mutate({
      userId: selectedUserId,
      role: selectedRole,
    })
    setDialogOpen(false)
    setSelectedUserId(null)
  }

  if (membersQuery.isLoading) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{messages[PROJECT_I18N_KEYS.members.title]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{messages[PROJECT_I18N_KEYS.members.title]}</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">{messages[PROJECT_I18N_KEYS.members.addButton]}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{messages[PROJECT_I18N_KEYS.members.addDialogTitle]}</DialogTitle>
              <DialogDescription>{messages[PROJECT_I18N_KEYS.members.addDialogDescription]}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {messages[PROJECT_I18N_KEYS.members.memberLabel]}
                </p>
                <Select value={selectedUserId ?? ""} onValueChange={(value) => setSelectedUserId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={messages[PROJECT_I18N_KEYS.members.selectPlaceholder]} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {availableUsers.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        {messages[PROJECT_I18N_KEYS.members.allAdded]}
                      </SelectItem>
                    ) : (
                      availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.label.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{user.label}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {messages[PROJECT_I18N_KEYS.members.roleLabel]}
                </p>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as typeof selectedRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
                    <SelectItem value="editor">{ROLE_LABELS.editor}</SelectItem>
                    <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddMember}
                disabled={!selectedUserId || addMember.isPending}
              >
                {messages[PROJECT_I18N_KEYS.members.addButton]}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{messages[PROJECT_I18N_KEYS.members.emptyState]}</p>
        ) : (
          <ScrollArea className="max-h-[320px] pr-4">
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-4 py-3",
                    !member.isActive && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback>{member.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        removeMember.mutate({
                          projectId,
                          userId: member.userId,
                        })
                      }
                      disabled={removeMember.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
