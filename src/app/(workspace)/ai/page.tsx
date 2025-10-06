'use client'

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AIArtifact, ArtifactList, Artifact, ArtifactType, typeConfig } from "@/components/ui/ai-artifact"
import {
  Send,
  Paperclip,
  Image,
  Mic,
  MicOff,
  Square,
  Bot,
  User,
  Sparkles,
  Clock,
  Trash2,
  Edit3,
  Code2
} from "lucide-react"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  attachments?: Array<{
    type: 'image' | 'file'
    name: string
    url: string
  }>
  artifacts?: Artifact[]
}

interface ChatHistory {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  messageCount: number
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m Yourever AI, your intelligent assistant. I can help you create various types of content including documents, code, websites, diagrams, and more. How can I help you today?',
      role: 'assistant',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [showArtifacts, setShowArtifacts] = useState(true)
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([
    {
      id: '1',
      title: 'React Component Example',
      type: 'react-component',
      content: `import React from 'react'

export default function ExampleComponent() {
  return (
    <div className="p-4 bg-blue-100 rounded-lg">
      <h2 className="text-xl font-bold">Example Component</h2>
      <p>This is a sample React component artifact.</p>
      <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Click me
      </button>
    </div>
  )
}`,
      language: 'tsx',
      description: 'A sample React component with interactive elements',
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      messageId: '2'
    },
    {
      id: '2',
      title: 'Sample API Documentation',
      type: 'document',
      content: `# API Documentation

## Overview
This document describes the REST API for the application.

## Authentication
All requests must include an API key in the header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### GET /api/users
Retrieve a list of all users.

**Response:**
\`\`\`json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
\`\`\``,
      description: 'Complete API documentation with examples',
      createdAt: new Date(Date.now() - 1000 * 60 * 15),
      messageId: '2'
    }
  ])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const chatHistory: ChatHistory[] = [
    {
      id: '1',
      title: 'Project Planning Discussion',
      lastMessage: 'Let\'s create a timeline for the new features...',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      messageCount: 15
    },
    {
      id: '2',
      title: 'Code Review Help',
      lastMessage: 'Can you help me optimize this React component?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      messageCount: 8
    },
    {
      id: '3',
      title: 'Design System Questions',
      lastMessage: 'What\'s the best approach for dark mode...',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      messageCount: 23
    },
    {
      id: '4',
      title: 'API Integration Ideas',
      lastMessage: 'How should we structure the database schema?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      messageCount: 12
    }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim() && selectedFiles.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
      attachments: selectedFiles.map(file => ({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file)
      }))
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSelectedFiles([])
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const shouldGenerateArtifact = Math.random() > 0.5 && input.length > 10
      let artifacts: Artifact[] = []

      if (shouldGenerateArtifact) {
        const types: ArtifactType[] = ['code', 'document', 'website', 'svg', 'diagram', 'react-component']
        const randomType = types[Math.floor(Math.random() * types.length)]
        const newArtifact = generateSampleArtifact(randomType)
        artifacts = [newArtifact]
        setAllArtifacts(prev => [newArtifact, ...prev])
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: shouldGenerateArtifact
          ? `I've created a ${artifacts[0]?.type} artifact for you based on your request. You can view it in the chat or access it from the artifacts section in the sidebar. This is a preview response for demonstration purposes.`
          : 'I understand your request. Let me help you with that. This is a preview response for demonstration purposes.',
        role: 'assistant',
        timestamp: new Date(),
        artifacts: artifacts
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 2000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    // Speech to text logic would go here
  }

  const generateSampleArtifact = (type: ArtifactType): Artifact => {
    const timestamp = Date.now().toString()

    switch (type) {
      case 'code':
        return {
          id: timestamp,
          title: 'Data Processing Function',
          type: 'code',
          content: `async function processData(data) {
  try {
    const processed = data.map(item => ({
      ...item,
      processed: true,
      timestamp: new Date().toISOString()
    }))

    console.log('Processed', processed.length, 'items')
    return processed
  } catch (error) {
    console.error('Processing failed:', error)
    throw error
  }
}

export { processData }`,
          language: 'javascript',
          description: 'JavaScript function for processing data asynchronously',
          createdAt: new Date(),
          messageId: timestamp
        }

      case 'website':
        return {
          id: timestamp,
          title: 'Interactive Landing Page',
          type: 'website',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample Landing Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; text-align: center; border-radius: 10px; }
        .cta { background: #ff6b6b; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 18px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="hero">
        <h1>Welcome to Our Platform</h1>
        <p>Build amazing things with our tools</p>
        <button class="cta" onclick="alert('Hello World!')">Get Started</button>
    </div>
</body>
</html>`,
          description: 'Interactive landing page with gradient background and call-to-action',
          createdAt: new Date(),
          messageId: timestamp
        }

      case 'svg':
        return {
          id: timestamp,
          title: 'Custom SVG Icon',
          type: 'svg',
          content: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="#667eea" stroke-width="4" fill="none"/>
  <path d="M30 50 L45 65 L70 35" stroke="#ff6b6b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
          description: 'Custom SVG checkmark icon with gradient colors',
          createdAt: new Date(),
          messageId: timestamp
        }

      case 'diagram':
        return {
          id: timestamp,
          title: 'Process Flow Diagram',
          type: 'diagram',
          content: `[Start] --> [Input Validation]
[Input Validation] --> [Process Data]
[Process Data] --> [Store Results]
[Store Results] --> [Send Notification]
[Send Notification] --> [End]

Note: This is a simplified flowchart representation`,
          description: 'Process flow diagram showing the main application workflow',
          createdAt: new Date(),
          messageId: timestamp
        }

      default:
        return {
          id: timestamp,
          title: 'Sample Document',
          type: 'document',
          content: `# Sample Document

This is a sample markdown document artifact.

## Features
- **Bold text**
- *Italic text*
- \`Code snippets\`

## Lists
1. First item
2. Second item
3. Third item

## Code Example
\`\`\`javascript
console.log('Hello World!');
\`\`\`

> This is a blockquote example.

---

Generated by Yourever AI`,
          description: 'Sample markdown document with various formatting elements',
          createdAt: new Date(),
          messageId: timestamp
        }
    }
  }

  return (
    <div className="h-full flex">
      {/* Chat History Sidebar */}
      <div className="w-80 border-r border-border bg-surface-panel flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h2 className="font-semibold">Yourever AI</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit3 className="size-4" />
            </Button>
          </div>
          <Button className="w-full justify-start gap-2 mb-3" variant="outline">
            <Bot className="size-4" />
            New Chat
          </Button>
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => {
              const types: ArtifactType[] = ['code', 'document', 'website', 'svg', 'diagram', 'react-component']
              const randomType = types[Math.floor(Math.random() * types.length)]
              const newArtifact = generateSampleArtifact(randomType)
              setAllArtifacts(prev => [newArtifact, ...prev])
            }}
          >
            <Code2 className="size-4" />
            Generate Sample Artifact
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between mb-3"
              onClick={() => setShowArtifacts(!showArtifacts)}
            >
              <span className="text-sm font-medium">Artifacts ({allArtifacts.length})</span>
              <Sparkles className={`size-3 transition-transform ${showArtifacts ? 'rotate-180' : ''}`} />
            </Button>

            {showArtifacts && (
              <div className="space-y-2">
                {allArtifacts.slice(0, 5).map((artifact) => {
                  console.log('typeConfig:', typeConfig)
                  console.log('artifact.type:', artifact.type)
                  const config = typeConfig[artifact.type]
                  const Icon = config.icon

                  return (
                    <div
                      key={artifact.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Icon className={`size-3 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{artifact.title}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                  )
                })}
                {allArtifacts.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all {allArtifacts.length} artifacts
                  </Button>
                )}
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors group"
                >
                  <h3 className="font-medium text-sm truncate flex-1">{chat.title}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-surface-panel">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold">Yourever AI</h1>
              <p className="text-sm text-muted-foreground">Your intelligent workspace assistant</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              <Sparkles className="size-3 mr-1" />
              Online
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>

                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {attachment.type === 'image' ? (
                              <Image className="size-4" />
                            ) : (
                              <Paperclip className="size-4" />
                            )}
                            <span className="text-xs">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.artifacts && message.artifacts.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold flex items-center gap-1">
                          <Sparkles className="size-3" />
                          Generated Artifacts
                        </p>
                        <div className="space-y-2">
                          {message.artifacts.map((artifact) => (
                            <AIArtifact
                              key={artifact.id}
                              artifact={artifact}
                              className="max-h-64"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 px-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-secondary">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted rounded-md px-2 py-1 text-xs">
                  {file.type.startsWith('image/') ? (
                    <Image className="size-3" />
                  ) : (
                    <Paperclip className="size-3" />
                  )}
                  <span className="truncate max-w-32">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-surface-panel">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
            >
              <Paperclip className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="shrink-0"
            >
              <Image className="size-4" />
            </Button>

            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="pr-12"
              />
            </div>

            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="sm"
              onClick={toggleRecording}
              className="shrink-0"
            >
              {isRecording ? <Square className="size-4" /> : <Mic className="size-4" />}
            </Button>

            <Button
              onClick={handleSend}
              disabled={!input.trim() && selectedFiles.length === 0}
              size="sm"
              className="shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>

          {isRecording && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Recording... Click square to stop
            </div>
          )}
        </div>
      </div>
    </div>
  )
}