import * as React from "react"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Table,
  Undo,
  Redo,
  Eye,
  Edit3
} from "lucide-react"

type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'list'
  | 'list-ordered'
  | 'quote'
  | 'code'
  | 'link'
  | 'image'
  | 'table'
  | 'undo'
  | 'redo'

interface RichTextEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  editable?: boolean
  showToolbar?: boolean
  showPreview?: boolean
  maxLength?: number
  toolbar?: ToolbarAction[]
}

function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  editable = true,
  showToolbar = true,
  showPreview = false,
  maxLength,
  toolbar = [
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'align-left',
    'align-center',
    'align-right',
    'list',
    'list-ordered',
    'quote',
    'code',
    'link',
    'image',
    'table',
    'undo',
    'redo'
  ],
  className,
  ...props
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)
  const [history, setHistory] = React.useState<string[]>([value])
  const [historyIndex, setHistoryIndex] = React.useState(0)

  const execCommand = (command: string, value?: string) => {
    if (!editable) return

    document.execCommand(command, false, value)
    const content = editorRef.current?.innerHTML || ''
    updateContent(content)
  }

  const insertLink = () => {
    if (!editable) return
    
    const url = prompt('Enter URL:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const insertImage = () => {
    if (!editable) return
    
    const url = prompt('Enter image URL:')
    if (url) {
      execCommand('insertImage', url)
    }
  }

  const insertTable = () => {
    if (!editable) return

    const rows = prompt('Number of rows:', '3')
    const cols = prompt('Number of columns:', '3')

    if (rows && cols) {
      const rowCount = Number.parseInt(rows, 10)
      const colCount = Number.parseInt(cols, 10)

      if (Number.isNaN(rowCount) || Number.isNaN(colCount)) return

      const table = `<table border="1"><tbody>${Array.from({ length: rowCount })
        .map(
          () => `<tr>${Array.from({ length: colCount })
            .map(() => '<td>&nbsp;</td>')
            .join('')}</tr>`
        )
        .join('')}</tbody></table>`
      execCommand('insertHTML', table)
    }
  }

  const updateContent = (content: string) => {
    onChange(content)

    setHistory((prevHistory) => {
      const truncated = prevHistory.slice(0, historyIndex + 1)
      const updated = [...truncated, content]
      setHistoryIndex(updated.length - 1)
      return updated
    })
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex]
      }
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      if (editorRef.current) {
        editorRef.current.innerHTML = history[newIndex]
      }
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML
      updateContent(content)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  const toolbarButtons: Record<ToolbarAction, { icon: LucideIcon; action: () => void }> = {
    'bold': { icon: Bold, action: () => execCommand('bold') },
    'italic': { icon: Italic, action: () => execCommand('italic') },
    'underline': { icon: Underline, action: () => execCommand('underline') },
    'strikethrough': { icon: Strikethrough, action: () => execCommand('strikethrough') },
    'align-left': { icon: AlignLeft, action: () => execCommand('justifyLeft') },
    'align-center': { icon: AlignCenter, action: () => execCommand('justifyCenter') },
    'align-right': { icon: AlignRight, action: () => execCommand('justifyRight') },
    'list': { icon: List, action: () => execCommand('insertUnorderedList') },
    'list-ordered': { icon: ListOrdered, action: () => execCommand('insertOrderedList') },
    'quote': { icon: Quote, action: () => execCommand('formatBlock', 'blockquote') },
    'code': { icon: Code, action: () => execCommand('formatBlock', 'pre') },
    'link': { icon: Link, action: insertLink },
    'image': { icon: Image, action: insertImage },
    'table': { icon: Table, action: insertTable },
    'undo': { icon: Undo, action: undo },
    'redo': { icon: Redo, action: redo }
  }

  const renderPreview = () => {
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert p-4 min-h-32"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  const renderEditor = () => {
    return (
      <div
        ref={editorRef}
        contentEditable={editable}
        className="min-h-32 p-4 focus:outline-none focus:ring-2 focus:ring-brand/50 rounded-md"
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  return (
    <div className={cn("border border-border rounded-lg overflow-hidden", className)} {...props}>
      {showToolbar && (
        <div className="border-b border-border bg-surface-elevated p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {toolbar.map((tool) => {
              const button = toolbarButtons[tool]
              if (!button) return null
              
              const Icon = button.icon
              return (
                <Button
                  key={tool}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={button.action}
                  disabled={!editable}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
            
            {showPreview && (
              <div className="ml-auto flex gap-1">
                <Button
                  variant={isPreviewMode ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setIsPreviewMode(false)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={isPreviewMode ? "ghost" : "default"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setIsPreviewMode(true)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-background">
        {isPreviewMode ? renderPreview() : renderEditor()}
      </div>
      
      {maxLength && (
        <div className="border-t border-border bg-surface-elevated px-4 py-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Characters: {value.length}</span>
            <span className={value.length > maxLength ? "text-destructive" : ""}>
              {maxLength - value.length} remaining
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export { RichTextEditor }
