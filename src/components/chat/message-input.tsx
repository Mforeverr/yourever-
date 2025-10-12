'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Bold,
  Italic,
  Link,
  AtSign,
  Hash
} from 'lucide-react'

interface MessageInputProps {
  placeholder?: string
  onSend: (message: string, attachments?: File[]) => void
  disabled?: boolean
  showFormatting?: boolean
  className?: string
}

export default function MessageInput({ 
  placeholder = "Type a message...",
  onSend,
  disabled = false,
  showFormatting = true,
  className = ""
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFormattingMenu, setShowFormattingMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Handle send
  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments)
      setMessage('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      insertFormatting('**', '**')
    }
    
    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      insertFormatting('*', '*')
    }
  }

  // Insert formatting
  const insertFormatting = (before: string, after: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)
    const formattedText = before + selectedText + after
    
    const newMessage = message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Common emojis
  const commonEmojis = ['👍', '❤️', '😊', '🎉', '🤔', '👀', '🔥', '💯', '🚀', '✨']

  return (
    <div className={`border border-border rounded-lg bg-background ${className}`}>
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-surface rounded px-2 py-1 text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-32">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => removeAttachment(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formatting Toolbar */}
      {showFormatting && showFormattingMenu && (
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => insertFormatting('**', '**')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => insertFormatting('*', '*')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => insertFormatting('[', '](url)')}
              title="Link"
            >
              <Link className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMessage(prev => prev + '@')}
              title="Mention"
            >
              <AtSign className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMessage(prev => prev + '#')}
              title="Channel"
            >
              <Hash className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Input */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-32 resize-none border-0 p-0 focus-visible:ring-0"
            rows={1}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Emoji Picker */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-lg shadow-lg p-2">
                <div className="grid grid-cols-5 gap-1">
                  {commonEmojis.map(emoji => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 text-sm"
                      onClick={() => {
                        setMessage(prev => prev + emoji)
                        setShowEmojiPicker(false)
                        textareaRef.current?.focus()
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Image Upload */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.multiple = true
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || [])
                setAttachments(prev => [...prev, ...files])
              }
              input.click()
            }}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          {/* Voice Recording */}
          <Button
            variant={isRecording ? "destructive" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Formatting Toggle */}
          {showFormatting && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFormattingMenu(!showFormattingMenu)}
            >
              <Bold className="h-4 w-4" />
            </Button>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && attachments.length === 0)}
            size="icon"
            className="h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            Recording... Click to stop
          </div>
        </div>
      )}
    </div>
  )
}
