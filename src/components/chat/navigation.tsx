'use client'

import React, { useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Hash, Users, MessageSquare, Phone, Video, Settings } from "lucide-react"
import { useScope } from "@/contexts/scope-context"
import {
  useMockConversationStore,
  selectChannelsForScope,
  selectDirectMessageUsersForScope,
  getChannelMessages,
} from "@/lib/mock-conversations"
import { startChannelHuddle } from "@/lib/huddle-session"
import { useBottomPanel } from "@/hooks/use-bottom-panel"

export default function ChatNavigation() {
  const { currentOrgId, currentDivisionId } = useScope()
  const bottomPanel = useBottomPanel()
  const scopedHref = React.useCallback(
    (suffix: string) => {
      if (!currentOrgId || !currentDivisionId) return '/select-org'
      return `/${currentOrgId}/${currentDivisionId}${suffix}`
    },
    [currentDivisionId, currentOrgId]
  )

  const scopedChannels = useMockConversationStore((state) =>
    selectChannelsForScope(state, currentOrgId, currentDivisionId).slice(0, 3)
  )

  const scopedDMs = useMockConversationStore((state) =>
    selectDirectMessageUsersForScope(state, currentOrgId, currentDivisionId).slice(0, 2)
  )

  const handleStartHuddle = useCallback(() => {
    const firstChannel = scopedChannels[0]
    if (firstChannel) {
      startChannelHuddle(
        (session) => bottomPanel.open(session),
        () => getChannelMessages(firstChannel.id),
        firstChannel
      )
    } else {
      bottomPanel.open()
    }
  }, [bottomPanel, scopedChannels])

  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4">Chat Navigation</h3>
        
        <div className="space-y-2">
          <Link href={scopedHref('/channels')}>
            <Button variant="ghost" className="w-full justify-start">
              <Hash className="h-4 w-4 mr-2" />
              Channel Directory
            </Button>
          </Link>

          {scopedChannels.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2">No scoped channels yet.</p>
          ) : (
            scopedChannels.map((channel) => (
              <Link key={channel.id} href={scopedHref(`/c/${channel.id}`)}>
                <Button variant="ghost" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  #{channel.name}
                </Button>
              </Link>
            ))
          )}

          {scopedDMs.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2">No teammates tied to this division.</p>
          ) : (
            scopedDMs.map((dm) => (
              <Link key={dm.id} href={scopedHref(`/dm/${dm.id}`)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  {dm.name}
                </Button>
              </Link>
            ))
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleStartHuddle}
            >
              <Phone className="h-3 w-3 mr-2" />
              Start Huddle
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Video className="h-3 w-3 mr-2" />
              Start Meeting
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Settings className="h-3 w-3 mr-2" />
              Chat Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
