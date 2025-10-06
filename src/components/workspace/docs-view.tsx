"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { cn } from "@/lib/utils"
import { 
  Plus,
  Search,
  FileText,
  Folder,
  Star,
  Clock,
  Edit3,
  Trash2,
  Share2,
  Download,
  MoreHorizontal,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Image,
  Link,
  Table,
  CheckSquare
} from "lucide-react"

interface Document {
  id: string
  title: string
  content: string
  folder?: string
  tags: string[]
  starred: boolean
  createdAt: Date
  updatedAt: Date
  author: string
  collaborators?: string[]
  isPublic: boolean
}

interface SlashCommand {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  keywords: string[]
  action: (editor: any) => void
}

const mockDocuments: Document[] = [
  {
    id: "1",
    title: "Project Roadmap Q4 2024",
    content: "# Project Roadmap Q4 2024\n\n## Overview\nThis document outlines our strategic initiatives for Q4 2024.\n\n## Key Objectives\n- Launch new authentication system\n- Improve mobile performance\n- Expand design system\n\n## Timeline\nAll initiatives to be completed by December 31, 2024.",
    folder: "Planning",
    tags: ["roadmap", "q4", "planning"],
    starred: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    author: "Mike Johnson",
    collaborators: ["Alex Chen", "Sarah Miller"],
    isPublic: true
  },
  {
    id: "2",
    title: "API Documentation",
    content: "# API Documentation\n\n## Authentication\nAll API requests require authentication using Bearer tokens.\n\n## Endpoints\n\n### GET /api/users\nRetrieve user list.\n\n### POST /api/users\nCreate new user.\n\n```javascript\nconst response = await fetch('/api/users', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer token'\n  },\n  body: JSON.stringify(userData)\n});\n```",
    folder: "Technical",
    tags: ["api", "documentation", "backend"],
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    author: "Alex Chen",
    collaborators: ["Emma Davis"],
    isPublic: false
  },
  {
    id: "3",
    title: "Meeting Notes - Sprint Review",
    content: "# Sprint Review Meeting\n\n**Date:** October 15, 2024\n**Attendees:** Alex, Sarah, Mike, Emma\n\n## Completed Items\n- [x] Authentication system\n- [x] Database optimization\n- [x] UI component updates\n\n## In Progress\n- [ ] Mobile responsive design\n- [ ] Performance testing\n\n## Blockers\n- Design mockups delayed by 2 days\n\n## Action Items\n- Alex: Complete mobile navigation by Friday\n- Sarah: Finalize design system by Monday",
    folder: "Meetings",
    tags: ["meeting", "sprint", "review"],
    starred: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    author: "Mike Johnson",
    isPublic: true
  },
  {
    id: "4",
    title: "Design System Guidelines",
    content: "# Design System Guidelines\n\n## Color Palette\n\n### Primary Colors\n- **Brand Blue:** #3B82F6\n- **Brand Purple:** #8B5CF6\n\n### Secondary Colors\n- **Success Green:** #10B981\n- **Warning Yellow:** #F59E0B\n- **Error Red:** #EF4444\n\n## Typography\n\n### Headings\n- **H1:** 32px, Bold\n- **H2:** 24px, Semibold\n- **H3:** 20px, Semibold\n\n### Body Text\n- **Body:** 16px, Regular\n- **Small:** 14px, Regular\n- **Caption:** 12px, Regular\n\n## Components\n\n### Buttons\n- Primary: Brand background, white text\n- Secondary: Border only\n- Ghost: No background, hover effect\n\n### Cards\n- Elevation: 0-4 levels\n- Border radius: 8px\n- Padding: 16px",
    folder: "Design",
    tags: ["design", "guidelines", "ui"],
    starred: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    author: "Sarah Miller",
    collaborators: ["Emma Davis"],
    isPublic: true
  }
]

const slashCommands: SlashCommand[] = [
  {
    id: "heading1",
    title: "Heading 1",
    description: "Large heading",
    icon: <Heading1 className="h-4 w-4" />,
    keywords: ["h1", "heading", "title"],
    action: (editor) => {
      // Insert H1 heading
      console.log("Insert H1")
    }
  },
  {
    id: "heading2",
    title: "Heading 2", 
    description: "Medium heading",
    icon: <Heading2 className="h-4 w-4" />,
    keywords: ["h2", "heading", "subtitle"],
    action: (editor) => {
      console.log("Insert H2")
    }
  },
  {
    id: "heading3",
    title: "Heading 3",
    description: "Small heading",
    icon: <Heading3 className="h-4 w-4" />,
    keywords: ["h3", "heading"],
    action: (editor) => {
      console.log("Insert H3")
    }
  },
  {
    id: "bullet-list",
    title: "Bullet List",
    description: "Create a bullet list",
    icon: <List className="h-4 w-4" />,
    keywords: ["list", "bullets", "ul"],
    action: (editor) => {
      console.log("Insert bullet list")
    }
  },
  {
    id: "numbered-list",
    title: "Numbered List",
    description: "Create a numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    keywords: ["list", "numbers", "ol"],
    action: (editor) => {
      console.log("Insert numbered list")
    }
  },
  {
    id: "quote",
    title: "Quote",
    description: "Add a quote",
    icon: <Quote className="h-4 w-4" />,
    keywords: ["quote", "blockquote"],
    action: (editor) => {
      console.log("Insert quote")
    }
  },
  {
    id: "code",
    title: "Code Block",
    description: "Add a code block",
    icon: <Code className="h-4 w-4" />,
    keywords: ["code", "pre", "snippet"],
    action: (editor) => {
      console.log("Insert code block")
    }
  },
  {
    id: "divider",
    title: "Divider",
    description: "Add a horizontal divider",
    icon: <div className="w-4 h-0.5 bg-border" />,
    keywords: ["divider", "hr", "separator"],
    action: (editor) => {
      console.log("Insert divider")
    }
  },
  {
    id: "table",
    title: "Table",
    description: "Add a table",
    icon: <Table className="h-4 w-4" />,
    keywords: ["table", "grid"],
    action: (editor) => {
      console.log("Insert table")
    }
  },
  {
    id: "checkbox",
    title: "Checkbox List",
    description: "Create a todo list",
    icon: <CheckSquare className="h-4 w-4" />,
    keywords: ["todo", "checkbox", "task"],
    action: (editor) => {
      console.log("Insert checkbox list")
    }
  }
]

function DocumentCard({ doc, onSelect, onEdit, onDelete, onToggleStar }: {
  doc: Document
  onSelect: (doc: Document) => void
  onEdit: (doc: Document) => void
  onDelete: (docId: string) => void
  onToggleStar: (docId: string) => void
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm truncate">{doc.title}</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{doc.author}</span>
              <span>•</span>
              <span>{doc.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onToggleStar(doc.id)
              }}
            >
              <Star 
                className={cn(
                  "h-3 w-3",
                  doc.starred && "fill-yellow-400 text-yellow-400"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(doc)
              }}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(doc.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
          {doc.content.replace(/[#*`]/g, '').substring(0, 150)}...
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {doc.tags.slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {doc.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{doc.tags.length - 2}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {doc.collaborators && doc.collaborators.length > 0 && (
              <div className="flex items-center gap-1">
                <span>{doc.collaborators.length}</span>
                <span>collaborators</span>
              </div>
            )}
            {doc.isPublic && (
              <Badge variant="secondary" className="text-xs">
                Public
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SlashCommandMenu({ 
  isOpen, 
  onClose, 
  onSelect, 
  searchQuery 
}: { 
  isOpen: boolean
  onClose: () => void
  onSelect: (command: SlashCommand) => void
  searchQuery: string
}) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const filteredCommands = React.useMemo(() => {
    if (!searchQuery) return slashCommands
    
    const query = searchQuery.toLowerCase()
    return slashCommands.filter(command =>
      command.title.toLowerCase().includes(query) ||
      command.keywords.some(keyword => keyword.includes(query))
    )
  }, [searchQuery])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onSelect, onClose])

  if (!isOpen) return null

  return (
    <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
      {filteredCommands.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">
          No commands found
        </div>
      ) : (
        filteredCommands.map((command, index) => (
          <button
            key={command.id}
            className={cn(
              "w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors",
              index === selectedIndex && "bg-accent/50"
            )}
            onClick={() => onSelect(command)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded bg-surface-elevated">
              {command.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{command.title}</div>
              <div className="text-xs text-muted-foreground">{command.description}</div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

export function DocsView() {
  const [documents, setDocuments] = React.useState<Document[]>(mockDocuments)
  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFolder, setSelectedFolder] = React.useState<string>("all")
  const [showSlashMenu, setShowSlashMenu] = React.useState(false)
  const [slashQuery, setSlashQuery] = React.useState("")
  const [editorContent, setEditorContent] = React.useState("")
  const editorRef = React.useRef<any>(null)

  const folders = React.useMemo(() => {
    const folderSet = new Set(documents.map(doc => doc.folder).filter(Boolean))
    return Array.from(folderSet) as string[]
  }, [documents])

  const filteredDocuments = React.useMemo(() => {
    let filtered = documents

    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedFolder !== "all") {
      filtered = filtered.filter(doc => doc.folder === selectedFolder)
    }

    return filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }, [documents, searchQuery, selectedFolder])

  const handleDocSelect = (doc: Document) => {
    setSelectedDoc(doc)
    setIsEditing(true)
    setEditorContent(doc.content)
  }

  const handleDocEdit = (doc: Document) => {
    setSelectedDoc(doc)
    setIsEditing(true)
    setEditorContent(doc.content)
  }

  const handleDocDelete = (docId: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId))
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null)
      setIsEditing(false)
    }
  }

  const handleToggleStar = (docId: string) => {
    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === docId ? { ...doc, starred: !doc.starred } : doc
      )
    )
  }

  const handleCreateDoc = () => {
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: "New Document",
      content: "# New Document\n\nStart writing your content here...",
      tags: [],
      starred: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: "Current User",
      isPublic: false
    }
    setDocuments(prevDocs => [newDoc, ...prevDocs])
    handleDocEdit(newDoc)
  }

  const handleSaveDoc = () => {
    if (!selectedDoc) return

    setDocuments(prevDocs =>
      prevDocs.map(doc =>
        doc.id === selectedDoc.id
          ? { ...doc, content: editorContent, updatedAt: new Date() }
          : doc
      )
    )

    setSelectedDoc(prev => prev ? { ...prev, content: editorContent, updatedAt: new Date() } : null)
    setIsEditing(false)
  }

  const handleSlashCommand = (command: SlashCommand) => {
    command.action(editorRef.current)
    setShowSlashMenu(false)
    setSlashQuery("")
  }

  const handleEditorChange = (content: string) => {
    setEditorContent(content)
    
    // Check for slash command
    if (content.endsWith('/')) {
      setShowSlashMenu(true)
      setSlashQuery("")
    } else if (showSlashMenu) {
      const lastSlash = content.lastIndexOf('/')
      if (lastSlash !== -1) {
        const query = content.slice(lastSlash + 1)
        setSlashQuery(query)
      } else {
        setShowSlashMenu(false)
      }
    }
  }

  return (
    <div className="h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Docs View</h2>
          <p className="text-muted-foreground">
            Rich text editor with slash menu for quick formatting
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Doc
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Folder Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedFolder === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFolder("all")}
            >
              All
            </Button>
            {folders.map(folder => (
              <Button
                key={folder}
                variant={selectedFolder === folder ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFolder(folder)}
              >
                <Folder className="h-3 w-3 mr-1" />
                {folder}
              </Button>
            ))}
          </div>

          {/* Document Cards */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredDocuments.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onSelect={handleDocSelect}
                onEdit={handleDocEdit}
                onDelete={handleDocDelete}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {isEditing && selectedDoc ? (
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Input
                    value={selectedDoc.title}
                    onChange={(e) => setSelectedDoc(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>Last edited {selectedDoc.updatedAt.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>By {selectedDoc.author}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveDoc}>
                    Save
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="relative">
                <RichTextEditor
                  ref={editorRef}
                  value={editorContent}
                  onChange={handleEditorChange}
                  placeholder="Start typing... (Type '/' for commands)"
                  showToolbar={true}
                  editable={true}
                  className="min-h-96"
                />
                
                <SlashCommandMenu
                  isOpen={showSlashMenu}
                  onClose={() => setShowSlashMenu(false)}
                  onSelect={handleSlashCommand}
                  searchQuery={slashQuery}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a document to edit</h3>
                <p className="text-muted-foreground mb-4">
                  Choose from the list or create a new document to get started
                </p>
                <Button onClick={handleCreateDoc}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}