'use client'

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  Bot,
  User,
  MessageCircle
} from "lucide-react"
import { useUIStore } from "@/state/ui.store"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface FloatingAIAssistantProps {
  className?: string
}

export function FloatingAIAssistant({ className }: FloatingAIAssistantProps) {
  const isOpen = useUIStore((state) => state.floatingAssistantOpen)
  const isMinimized = useUIStore((state) => state.floatingAssistantMinimized)
  const openAssistant = useUIStore((state) => state.openFloatingAssistant)
  const closeAssistant = useUIStore((state) => state.closeFloatingAssistant)
  const toggleMinimized = useUIStore((state) => state.toggleFloatingAssistantMinimized)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hi! I\'m your quick AI assistant. How can I help you right now?',
      role: 'assistant',
      timestamp: new Date(),
    }
  ])
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I\'m here to help! This is a quick response demo.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={openAssistant}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-105"
        >
          <MessageCircle className="size-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className="w-96 h-[500px] shadow-xl border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-panel rounded-t-lg">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">Yourever AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Quick help</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={toggleMinimized}
            >
              {isMinimized ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={closeAssistant}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 h-[380px]">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            <Bot className="size-3" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`max-w-[280px] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground ml-auto'
                              : 'bg-muted'
                          }`}
                        >
                          {message.content}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarFallback className="bg-secondary text-xs">
                            <User className="size-3" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          <Bot className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border bg-surface-panel rounded-b-lg">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="text-sm"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="sm"
                  className="shrink-0"
                >
                  <Send className="size-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
