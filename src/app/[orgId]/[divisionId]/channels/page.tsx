'use client'

import React from 'react'
import Link from 'next/link'
import { useScope } from '@/contexts/scope-context'
import {
  useMockConversationStore,
  selectChannelsForScope
} from '@/mocks/data/conversations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Hash, Lock, Users } from 'lucide-react'

export default function ChannelsDirectoryPage() {
  const { currentOrgId, currentDivisionId } = useScope()

  const channels = useMockConversationStore((state) =>
    selectChannelsForScope(state, currentOrgId, currentDivisionId)
  )

  if (!currentOrgId || !currentDivisionId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select an organization to view its channels.</p>
      </div>
    )
  }

  return (
    <div className="h-full bg-background">
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Channels</h1>
          <p className="text-sm text-muted-foreground">
            Conversation spaces scoped to your current organization and division.
          </p>
        </div>

        {channels.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 p-8 text-center">
            <div>
              <p className="text-lg font-medium">No channels for this division yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a new channel from the sidebar or switch to a different division.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((channel) => {
              const Icon = channel.channelType === 'private' ? Lock : Hash
              const memberCount = channel.memberCount ?? 0
              return (
                <Card key={channel.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg font-semibold">#{channel.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {memberCount} members
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription>{channel.topic || 'No topic yet.'}</CardDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {channel.channelType === 'private' ? 'Private' : 'Public'} channel
                        </span>
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/${currentOrgId}/${currentDivisionId}/c/${channel.id}`}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
