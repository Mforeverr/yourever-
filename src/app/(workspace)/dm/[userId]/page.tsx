'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BottomPanel from '@/components/chat/bottom-panel'
import MessageInput from '@/components/chat/message-input'
import { 
  Search,
  Phone,
  Video,
  MoreHorizontal,
  Smile,
  Paperclip,
  Send,
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
  X,
  Circle
} from 'lucide-react'

// Types
interface Message {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    status: 'online' | 'away' | 'offline'
  }
  timestamp: string
  reactions: Array<{
    emoji: string
    count: number
    users: string[]
  }>
  attachments?: Array<{
    id: string
    name: string
    type: 'image' | 'file'
    size: string
    url: string
  }>
  threadCount?: number
  isPinned?: boolean
}

interface User {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'away' | 'offline'
  email?: string
  role?: string
  timezone?: string
  lastSeen?: string
}

// Mock data
const mockUsers: Record<string, User> = {
  '1': {
    id: '1',
    name: 'Sarah Chen',
    avatar: '/avatars/sarah.jpg',
    status: 'online',
    email: 'sarah.chen@company.com',
    role: 'Product Designer',
    timezone: 'PST (UTC-8)'
  },
  '2': {
    id: '2',
    name: 'Mike Johnson',
    avatar: '/avatars/mike.jpg',
    status: 'online',
    email: 'mike.johnson@company.com',
    role: 'Frontend Developer',
    timezone: 'PST (UTC-8)'
  },
  '3': {
    id: '3',
    name: 'Emily Davis',
    avatar: '/avatars/emily.jpg',
    status: 'away',
    email: 'emily.davis@company.com',
    role: 'UX Designer',
    timezone: 'PST (UTC-8)',
    lastSeen: '5 minutes ago'
  },
  '4': {
    id: '4',
    name: 'Tom Wilson',
    avatar: '/avatars/tom.jpg',
    status: 'offline',
    email: 'tom.wilson@company.com',
    role: 'Backend Developer',
    timezone: 'EST (UTC-5)',
    lastSeen: '2 hours ago'
  }
}

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      content: 'Hey! I wanted to show you the new designs I\'ve been working on.',
      author: {
        id: '1',
        name: 'Sarah Chen',
        avatar: '/avatars/sarah.jpg',
        status: 'online'
      },
      timestamp: '2:34 PM',
      reactions: []
    },
    {
      id: '2',
      content: 'That sounds great! I\'d love to see them. Are you free to walk through them now?',
      author: {
        id: 'current-user',
        name: 'You',
        status: 'online'
      },
      timestamp: '2:35 PM',
      reactions: []
    },
    {
      id: '3',
      content: 'Absolutely! Let me share my screen. I\'ve made some really interesting changes to the user flow.',
      author: {
        id: '1',
        name: 'Sarah Chen',
        avatar: '/avatars/sarah.jpg',
        status: 'online'
      },
      timestamp: '2:36 PM',
      reactions: [
        { emoji: '🎉', count: 1, users: ['You'] }
      ]
    }
  ],
  '2': [
    {
      id: '1',
      content: 'Did you get a chance to review my PR?',
      author: {
        id: '2',
        name: 'Mike Johnson',
        avatar: '/avatars/mike.jpg',
        status: 'online'
      },
      timestamp: '1:15 PM',
      reactions: []
    },
    {
      id: '2',
      content: 'Yes! Just left some comments. Overall looks good, just a few minor suggestions.',
      author: {
        id: 'current-user',
        name: 'You',
        status: 'online'
      },
      timestamp: '1:20 PM',
      reactions: []
    }
  ]
}

export default function DMPage() {
  const params = useParams()
  const userId = params.userId as string
  const [messages, setMessages] = useState<Message[]>(mockMessages[userId] || [])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showHuddle, setShowHuddle] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const user = mockUsers[userId]

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
  const getStatusText = (user: User) => {
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
      const message: Message = {
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
      setMessages(prev => [...prev, message])
    }
  }

  // Add reaction
  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji)
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, users: [...r.users, 'You'] }
                : r
            )
          }
        } else {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1, users: ['You'] }]
          }
        }
      }
      return msg
    }))
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
            variant={showHuddle ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHuddle(!showHuddle)}
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

      {/* Bottom Panel for Huddle */}
      <BottomPanel
        isOpen={showHuddle}
        onClose={() => setShowHuddle(false)}
      />
    </div>
  )
}