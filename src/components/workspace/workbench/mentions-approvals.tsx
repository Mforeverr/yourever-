'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScope } from '@/contexts/scope-context'
import { cn } from '@/lib/utils'

interface MentionItem {
  id: string
  author: {
    name: string
    initials: string
    avatar?: string
  }
  project: string
  excerpt: string
  happenedAt: string
  type: 'mention' | 'approval'
}

const SAMPLE_MENTIONS: MentionItem[] = [
  {
    id: 'mention-1',
    author: { name: 'Maya Lopez', initials: 'ML' },
    project: 'Website Revamp',
    excerpt: '@You Could you confirm the hero stats before tomorrow’s sync?',
    happenedAt: '2h ago',
    type: 'mention',
  },
  {
    id: 'mention-2',
    author: { name: 'Tracey Kim', initials: 'TK' },
    project: 'Growth Experiments',
    excerpt: 'Approval requested: “Summer campaign budget”',
    happenedAt: '5h ago',
    type: 'approval',
  },
  {
    id: 'mention-3',
    author: { name: 'Devon Singh', initials: 'DS' },
    project: 'Design System Refresh',
    excerpt: 'Shared new figma exploration for the typography scale.',
    happenedAt: 'Yesterday',
    type: 'mention',
  },
]

export function MentionsApprovalsModule() {
  const { currentDivision } = useScope()

  const headline = currentDivision
    ? `Updates in ${currentDivision.name}`
    : 'Updates across your workspace'

  return (
    <Card className="border-border/80 bg-surface-panel/60 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Mentions & Approvals</CardTitle>
        <Badge variant="outline" className="text-xs">
          Live
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{headline}</p>
        {SAMPLE_MENTIONS.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-md border border-transparent bg-background/40 px-3 py-2 hover:border-border/60 hover:bg-background/70"
          >
            <Avatar className="size-8">
              {item.author.avatar ? (
                <AvatarImage src={item.author.avatar} alt={item.author.name} />
              ) : (
                <AvatarFallback>{item.author.initials}</AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.author.name}</span>
                <span className="text-xs text-muted-foreground">• {item.happenedAt}</span>
                <Badge
                  variant={item.type === 'approval' ? 'secondary' : 'outline'}
                  className={cn('text-[11px] uppercase tracking-wide', item.type === 'approval' && 'bg-amber-100 text-amber-900')}
                >
                  {item.type === 'approval' ? 'Approval' : 'Mention'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{item.project}</p>
              <p className="text-sm text-foreground line-clamp-2">{item.excerpt}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button variant="ghost" size="xs" className="text-xs">
                  Reply
                </Button>
                {item.type === 'approval' && (
                  <Button variant="ghost" size="xs" className="text-xs text-brand hover:text-brand">
                    Review
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
