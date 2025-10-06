'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Hash,
  Users,
  MessageSquare,
  Phone,
  Video,
  Settings
} from 'lucide-react'

export default function ChatNavigation() {
  return (
    <Card className="w-64">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4">Chat Navigation</h3>
        
        <div className="space-y-2">
          <Link href="/channels">
            <Button variant="ghost" className="w-full justify-start">
              <Hash className="h-4 w-4 mr-2" />
              Channels List
            </Button>
          </Link>
          
          <Link href="/c/general">
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              #general Channel
            </Button>
          </Link>
          
          <Link href="/c/development">
            <Button variant="ghost" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              #development Channel
            </Button>
          </Link>
          
          <Link href="/dm/sarah">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Sarah Chen (DM)
            </Button>
          </Link>
          
          <Link href="/dm/mike">
            <Button variant="ghost" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              Mike Johnson (DM)
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
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