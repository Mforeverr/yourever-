import * as React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"
import { Textarea } from "./textarea"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { 
  Bold,
  Italic,
  Link,
  List,
  Quote,
  Code,
  HelpCircle,
  Send,
  X
} from "lucide-react"

interface WhyNoteEditorProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  maxLength?: number
  showToolbar?: boolean
  compact?: boolean
  disabled?: boolean
  onSubmit?: (value: string) => void
  onCancel?: () => void
  showCharacterCount?: boolean
  autoResize?: boolean
}

function WhyNoteEditor({
  value = "",
  onChange,
  placeholder = "Add a note...",
  maxLength,
  showToolbar = true,
  compact = false,
  disabled = false,
  onSubmit,
  onCancel,
  showCharacterCount = true,
  autoResize = true,
  className,
  ...props
}: WhyNoteEditorProps) {
  const [editorValue, setEditorValue] = React.useState(value)
  const [isFocused, setIsFocused] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setEditorValue(value)
  }, [value])

  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editorValue, autoResize])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (maxLength && newValue.length > maxLength) return
    
    setEditorValue(newValue)
    onChange?.(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleSubmit = () => {
    if (editorValue.trim()) {
      onSubmit?.(editorValue.trim())
      setEditorValue("")
    }
  }

  const handleCancel = () => {
    setEditorValue("")
    onCancel?.()
  }

  const execCommand = (command: string, value?: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd
      const selectedText = editorValue.substring(start, end)
      
      let newText = ""
      let cursorPosition = start
      
      switch (command) {
        case 'bold':
          newText = `**${selectedText}**`
          cursorPosition = start + newText.length
          break
        case 'italic':
          newText = `*${selectedText}*`
          cursorPosition = start + newText.length
          break
        case 'link':
          const url = prompt('Enter URL:')
          if (url) {
            newText = `[${selectedText}](${url})`
            cursorPosition = start + newText.length
          } else {
            return
          }
          break
        case 'list':
          newText = `- ${selectedText}`
          cursorPosition = start + newText.length
          break
        case 'quote':
          newText = `> ${selectedText}`
          cursorPosition = start + newText.length
          break
        case 'code':
          newText = `\`${selectedText}\``
          cursorPosition = start + newText.length
          break
        default:
          return
      }
      
      const newValue = editorValue.substring(0, start) + newText + editorValue.substring(end)
      setEditorValue(newValue)
      onChange?.(newValue)
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  }

  const toolbarButtons = [
    { icon: Bold, command: 'bold', tooltip: 'Bold (Cmd+B)' },
    { icon: Italic, command: 'italic', tooltip: 'Italic (Cmd+I)' },
    { icon: Link, command: 'link', tooltip: 'Add Link' },
    { icon: List, command: 'list', tooltip: 'Bullet List' },
    { icon: Quote, command: 'quote', tooltip: 'Quote' },
    { icon: Code, command: 'code', tooltip: 'Inline Code' }
  ]

  const characterCount = editorValue.length
  const isOverLimit = maxLength && characterCount > maxLength
  const isNearLimit = maxLength && characterCount > maxLength * 0.9

  return (
    <Card className={cn("", className)} {...props}>
      <CardContent className={cn("p-0", compact && "p-2")}>
        {showToolbar && (
          <div className="flex items-center gap-1 p-2 border-b border-border bg-surface-elevated">
            {toolbarButtons.map(({ icon: Icon, command, tooltip }) => (
              <Button
                key={command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => execCommand(command)}
                disabled={disabled}
                title={tooltip}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
            
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Formatting Help"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={editorValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "border-0 resize-none focus-visible:ring-0",
              compact ? "min-h-20 p-2 text-sm" : "min-h-32 p-4",
              autoResize && "overflow-hidden"
            )}
            style={autoResize ? { height: 'auto' } : undefined}
          />
          
          {showCharacterCount && maxLength && (
            <div className="absolute bottom-2 right-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  isOverLimit && "border-destructive text-destructive",
                  isNearLimit && !isOverLimit && "border-yellow-500 text-yellow-500"
                )}
              >
                {characterCount}/{maxLength}
              </Badge>
            </div>
          )}
        </div>
        
        {(isFocused || editorValue.trim()) && (onSubmit || onCancel) && (
          <div className="flex items-center justify-between p-2 border-t border-border bg-surface-elevated">
            <div className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Cmd+Enter</kbd> to submit
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={disabled}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
              
              {onSubmit && (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={disabled || !editorValue.trim()}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Submit
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { WhyNoteEditor }