'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MessageInput from '@/components/chat/message-input'
import {
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Smile,
  FileText,
  Image as ImageIcon,
  Download
} from 'lucide-react'
import {
  useMockConversationStore,
  selectDirectMessageUser,
  selectDirectMessages,
  type DirectMessage,
  type MockDMUser
} from '@/mocks/data/conversations'
import { useBottomPanel } from "@/hooks/use-bottom-panel"
import { buildParticipant, buildCurrentUserParticipant, startHuddle } from "@/lib/huddle-session"

export default function DMPage() {
  const params = useParams<{ orgId: string; divisionId: string; userId: string }>()
  const router = useRouter()
  const userId = params.userId
  const user = useMockConversationStore(
    React.useCallback(
      (state) => selectDirectMessageUser(state, params.orgId, params.divisionId, userId),
      [params.divisionId, params.orgId, userId]
    )
  )
  const messages = useMockConversationStore(
    React.useCallback(
      (state) => selectDirectMessages(state, userId),
      [userId]
    )
  )
  const appendDirectMessage = useMockConversationStore((state) => state.appendDirectMessage)
  const reactToDirectMessage = useMockConversationStore((state) => state.reactToDirectMessage)
  const markDirectMessageRead = useMockConversationStore((state) => state.markDirectMessageRead)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bottomPanel = useBottomPanel()
  const toggleHuddle = useCallback(() => {
    if (bottomPanel.isOpen) {
      bottomPanel.close()
      return
    }

    const participants = [
      buildCurrentUserParticipant(),
      user ? buildParticipant(user) : buildParticipant({
        id: "teammate",
        name: "Teammate",
        status: "online",
        orgIds: "all",
        divisions: ["all"],
        unreadCount: 0,
      }),
    ]

    startHuddle(
      (session) => bottomPanel.open(session),
      {
        id: `dm-huddle-${userId}`,
        title: `Call with ${user?.name ?? 'Teammate'}`,
        participants,
        metadata: {
          agenda: `Catch up with ${user?.name ?? 'teammate'}`,
        },
      }
    )
  }, [bottomPanel, user, userId])

  useEffect(() => () => bottomPanel.close(), [bottomPanel])

  useEffect(() => {
    if (!user) {
      router.replace(`/${params.orgId}/${params.divisionId}/channels`)
      return
    }
    markDirectMessageRead(userId)
  }, [markDirectMessageRead, params.divisionId, params.orgId, router, user, userId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Get status indicator color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  // Get status text
  const getStatusText = (user: MockDMUser) => {
    switch (user.status) {
      case 'online': return 'Active now'
      case 'away': return 'Away'
      case 'offline': return user.lastSeen || 'Offline'
      default: return 'Offline'
    }
  }

  // Format file size
  const formatFileSize = (size: string) => size

  // Get file icon
  const getFileIcon = (type: string) => {
    return type === 'image' ? ImageIcon : FileText
  }

  // Send message
  const sendMessage = (content: string, attachments?: File[]) => {
    if (content.trim() || attachments) {
      const message: DirectMessage = {
        id: Date.now().toString(),
        content,
        author: {
          id: 'current-user',
          name: 'You',
          status: 'online'
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reactions: [],
        attachments: attachments?.map(file => ({
          id: file.name,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          size: `${(file.size / 1024).toFixed(1)} KB`,
          url: URL.createObjectURL(file)
        }))
      }
      appendDirectMessage(userId, message)
    }
  }

  // Add reaction
  const addReaction = (messageId: string, emoji: string) => {
    reactToDirectMessage(userId, messageId, emoji, 'You')
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">User not found</h2>
          <p className="text-muted-foreground">The user you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
          </div>
          <div>
            <h1 className="font-semibold">{user.name}</h1>
            <p className="text-xs text-muted-foreground">{getStatusText(user)}</p>
          </div>
          {user.role && (
            <Badge variant="outline" className="text-xs">
              {user.role}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              className="pl-8 w-64 h-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Huddle Button */}
          <Button
            variant={bottomPanel.isOpen ? "default" : "outline"}
            size="sm"
            onClick={toggleHuddle}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
            Start call
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Avatar className="h-16 w-16 mx-auto mb-4">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-lg">{user.name[0]}</AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold mb-2">{user.name}</h3>
              <p className="text-muted-foreground mb-4">
                {user.status === 'online' 
                  ? 'Active now' 
                  : user.lastSeen || 'Offline'
                }
              </p>
              {user.email && (
                <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
              )}
              {user.timezone && (
                <p className="text-sm text-muted-foreground">{user.timezone}</p>
              )}
              <div className="mt-8 p-4 bg-surface rounded-lg max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  This is the beginning of your direct message history with {user.name}.
                </p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`mb-6 ${message.author.id === 'current-user' ? 'flex justify-end' : ''}`}>
                <div className={`flex items-start gap-3 max-w-2xl ${message.author.id === 'current-user' ? 'flex-row-reverse' : ''}`}>
                  {message.author.id !== 'current-user' && (
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.author.avatar} />
                        <AvatarFallback>{message.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-background ${getStatusColor(message.author.status)}`} />
                    </div>
                  )}
                  
                  <div className={`flex-1 min-w-0 ${message.author.id === 'current-user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.author.id !== 'current-user' && (
                        <span className="font-medium text-sm">{message.author.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    </div>
                    
                    <div className={`inline-block p-3 rounded-lg ${
                      message.author.id === 'current-user' 
                        ? 'bg-brand text-brand-foreground' 
                        : 'bg-surface'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Attachments */}
                      {message.attachments && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.attachments.map(attachment => {
                            const Icon = getFileIcon(attachment.type)
                            return (
                              <div key={attachment.id} className="flex items-center gap-2 bg-surface-elevated rounded p-2 text-sm">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span>{attachment.name}</span>
                                <span className="text-xs text-muted-foreground">({formatFileSize(attachment.size)})</span>
                                <Button size="icon" variant="ghost" className="h-4 w-4 ml-1">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Reactions */}
                    <div className={`flex items-center gap-2 mt-2 ${message.author.id === 'current-user' ? 'justify-end' : ''}`}>
                      {message.reactions.map((reaction, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => addReaction(message.id, reaction.emoji)}
                        >
                          {reaction.emoji} {reaction.count}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        <Smile className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <MessageInput onSend={sendMessage} />
      </div>

    </div>
  )
}
