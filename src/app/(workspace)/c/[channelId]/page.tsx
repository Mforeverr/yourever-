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

interface Channel {
  id: string
  name: string
  type: 'public' | 'private'
  topic?: string
  memberCount?: number
}

// Mock data
const mockChannels: Record<string, Channel> = {
  '1': { id: '1', name: 'general', type: 'public', topic: 'Company-wide announcements and discussions', memberCount: 24 },
  '2': { id: '2', name: 'development', type: 'public', topic: 'Development team discussions and code reviews', memberCount: 18 },
  '3': { id: '3', name: 'design', type: 'public', topic: 'Design team collaboration and feedback', memberCount: 8 },
  '4': { id: '4', name: 'marketing', type: 'private', topic: 'Marketing strategy and campaigns', memberCount: 6 },
  '5': { id: '5', name: 'random', type: 'public', topic: 'Random conversations and fun stuff', memberCount: 32 },
}

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hey team! I\'ve just finished the initial design mockups for the new feature. Would love to get your feedback on them.',
    author: {
      id: '1',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      status: 'online'
    },
    timestamp: '2:34 PM',
    reactions: [
      { emoji: '👍', count: 3, users: ['Mike', 'Emily', 'Alex'] },
      { emoji: '❤️', count: 2, users: ['Tom', 'Lisa'] }
    ],
    attachments: [
      {
        id: '1',
        name: 'dashboard-mockup.fig',
        type: 'file',
        size: '2.4 MB',
        url: '#'
      },
      {
        id: '2',
        name: 'user-flow.png',
        type: 'image',
        size: '856 KB',
        url: '#'
      }
    ],
    threadCount: 3,
    isPinned: true
  },
  {
    id: '2',
    content: 'Great work Sarah! The designs look fantastic. I especially like the color scheme you chose.',
    author: {
      id: '2',
      name: 'Mike Johnson',
      avatar: '/avatars/mike.jpg',
      status: 'online'
    },
    timestamp: '2:36 PM',
    reactions: [
      { emoji: '🎉', count: 1, users: ['Sarah'] }
    ]
  },
  {
    id: '3',
    content: 'I agree with Mike! The user flow is very intuitive. One suggestion - maybe we could add a dark mode variant?',
    author: {
      id: '3',
      name: 'Emily Davis',
      avatar: '/avatars/emily.jpg',
      status: 'away'
    },
    timestamp: '2:38 PM',
    reactions: [
      { emoji: '💡', count: 2, users: ['Sarah', 'Mike'] }
    ],
    threadCount: 1
  },
  {
    id: '4',
    content: 'That\'s a great idea Emily! I\'ll work on the dark mode version and share it with you all tomorrow.',
    author: {
      id: '1',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      status: 'online'
    },
    timestamp: '2:40 PM',
    reactions: [
      { emoji: '🌙', count: 4, users: ['Mike', 'Emily', 'Alex', 'Tom'] }
    ]
  }
]

export default function ChannelPage() {
  const params = useParams()
  const channelId = params.channelId as string
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showHuddle, setShowHuddle] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const channel = mockChannels[channelId]

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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border bg-background px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {channel.type === 'private' ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Hash className="h-5 w-5 text-muted-foreground" />
          )}
          <h1 className="font-semibold">{channel.name}</h1>
          <Badge variant="secondary" className="text-xs">
            {channel.memberCount} members
          </Badge>
          <div className="flex items-center gap-1 ml-4">
            <div className="flex -space-x-2">
              {['Sarah', 'Mike', 'Emily'].map((name, i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-2">+{channel.memberCount! - 3} others</span>
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
            variant={showHuddle ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHuddle(!showHuddle)}
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

      {/* Bottom Panel for Huddle */}
      <BottomPanel
        isOpen={showHuddle}
        onClose={() => setShowHuddle(false)}
      />
    </div>
  )
}