'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MessageInput from '@/components/chat/message-input'
import { 
  Hash, 
  Lock, 
  Search,
  Phone,
  Video,
  Users,
  Pin,
  Smile,
  Paperclip,
  Send,
  MoreHorizontal,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Laugh,
  AlertCircle,
  MessageSquare,
  Reply,
  FileText,
  Image as ImageIcon,
  Download,
  X
} from 'lucide-react'
import {
  useMockConversationStore,
  selectChannelById,
  selectChannelMessages,
  type ChannelMessage,
  type MockChannel
} from '@/mocks/data/conversations'
import { useBottomPanel } from "@/hooks/use-bottom-panel"
import { startChannelHuddle } from "@/lib/huddle-session"

export default function ChannelPage() {
  const params = useParams<{ orgId: string; divisionId: string; channelId: string }>()
  const router = useRouter()
  const channelId = params.channelId
  const channel = useMockConversationStore((state) =>
    selectChannelById(state, params.orgId, params.divisionId, channelId)
  )
  const messages = useMockConversationStore((state) => selectChannelMessages(state, channelId))
  const appendChannelMessage = useMockConversationStore((state) => state.appendChannelMessage)
  const reactToChannelMessage = useMockConversationStore((state) => state.reactToChannelMessage)
  const markChannelRead = useMockConversationStore((state) => state.markChannelRead)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const bottomPanel = useBottomPanel()

  const toggleHuddle = useCallback(() => {
    if (bottomPanel.isOpen) {
      bottomPanel.close()
      return
    }

    startChannelHuddle(
      (session) => bottomPanel.open(session),
      () => messages,
      channel ?? { id: channelId, name: "Channel" },
      {
        metadata: channel ? { agenda: `Standup for #${channel.name}` } : undefined,
      }
    )
  }, [bottomPanel, channel, channelId, messages])

  useEffect(() => () => bottomPanel.close(), [bottomPanel])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!channel) {
      router.replace(`/${params.orgId}/${params.divisionId}/channels`)
      return
    }
    markChannelRead(channelId)
  }, [channel, channelId, markChannelRead, params.divisionId, params.orgId, router])

  // Get status indicator color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
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
      const message: ChannelMessage = {
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
      appendChannelMessage(channelId, message)
    }
  }

  // Add reaction
  const addReaction = (messageId: string, emoji: string) => {
    reactToChannelMessage(channelId, messageId, emoji, 'You')
  }

  if (!channel) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Channel not found</h2>
          <p className="text-muted-foreground">The channel you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const memberCount = channel.memberCount ?? 0

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {channel.channelType === 'private' ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 text-muted-foreground" />
          )}
          <h1 className="font-semibold">{channel.name}</h1>
          <Badge variant="secondary" className="text-xs">
            {memberCount} members
          </Badge>
          <div className="flex items-center gap-1 ml-4">
            <div className="flex -space-x-2">
              {['Sarah', 'Mike', 'Emily'].map((name, i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {Math.max(0, memberCount - 3) > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                +{Math.max(0, memberCount - 3)} others
              </span>
            )}
          </div>
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
            Start huddle
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Pinned Message */}
          {messages.filter(msg => msg.isPinned).map(message => (
            <Card key={message.id} className="mb-4 border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Pin className="h-4 w-4 text-yellow-500 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.author.avatar} />
                        <AvatarFallback>{message.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{message.author.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{message.timestamp}</span>
                        <Badge variant="outline" className="ml-2 text-xs">Pinned</Badge>
                      </div>
                    </div>
                    <p className="text-sm mb-3">{message.content}</p>
                    
                    {/* Attachments */}
                    {message.attachments && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {message.attachments.map(attachment => {
                          const Icon = getFileIcon(attachment.type)
                          return (
                            <div key={attachment.id} className="flex items-center gap-2 bg-surface rounded p-2 text-sm">
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
                    
                    {/* Reactions */}
                    <div className="flex items-center gap-2">
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
              </CardContent>
            </Card>
          ))}

          {/* Regular Messages */}
          {messages.filter(msg => !msg.isPinned).map(message => (
            <div key={message.id} className="mb-6">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.author.avatar} />
                    <AvatarFallback>{message.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(message.author.status)}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.author.name}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  
                  <p className="text-sm mb-2">{message.content}</p>
                  
                  {/* Attachments */}
                  {message.attachments && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {message.attachments.map(attachment => {
                        const Icon = getFileIcon(attachment.type)
                        return (
                          <div key={attachment.id} className="flex items-center gap-2 bg-surface rounded p-2 text-sm">
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
                  
                  {/* Reactions */}
                  <div className="flex items-center gap-2 mb-2">
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
                  
                  {/* Thread Indicator */}
                  {message.threadCount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
