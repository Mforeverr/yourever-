'use client'

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Code,
  FileText,
  Globe,
  Image,
  GitBranch,
  Component,
  Download,
  Copy,
  ExternalLink,
  Fullscreen,
  Minimize2,
  Edit3,
  Eye,
  Sparkles
} from "lucide-react"

export type ArtifactType =
  | "document"
  | "code"
  | "website"
  | "svg"
  | "diagram"
  | "react-component"

export interface Artifact {
  id: string
  title: string
  type: ArtifactType
  content: string
  language?: string
  description?: string
  createdAt: Date
  messageId: string
}

interface AIArtifactProps {
  artifact: Artifact
  className?: string
}

export const typeConfig = {
  document: {
    icon: FileText,
    label: "Document",
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  code: {
    icon: Code,
    label: "Code",
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  website: {
    icon: Globe,
    label: "Website",
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  svg: {
    icon: Image,
    label: "SVG",
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  },
  diagram: {
    icon: GitBranch,
    label: "Diagram",
    color: "text-pink-600",
    bgColor: "bg-pink-50"
  },
  "react-component": {
    icon: Component,
    label: "React Component",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50"
  }
}

function ArtifactRenderer({ artifact, isFullscreen, onToggleFullscreen }: {
  artifact: Artifact
  isFullscreen: boolean
  onToggleFullscreen: () => void
}) {
  const config = typeConfig[artifact.type]
  const Icon = config.icon

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content)
  }

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title}.${getFileExtension()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getFileExtension = () => {
    switch (artifact.type) {
      case "document": return "md"
      case "code": return artifact.language || "txt"
      case "website": return "html"
      case "svg": return "svg"
      case "diagram": return "txt"
      case "react-component": return "tsx"
      default: return "txt"
    }
  }

  const renderContent = () => {
    switch (artifact.type) {
      case "website":
        return (
          <div className="w-full h-full">
            <iframe
              srcDoc={artifact.content}
              className="w-full h-full border-0 rounded-md"
              sandbox="allow-scripts"
              title={artifact.title}
            />
          </div>
        )

      case "svg":
        return (
          <div className="w-full h-full flex items-center justify-center p-8">
            <div
              dangerouslySetInnerHTML={{ __html: artifact.content }}
              className="max-w-full max-h-full"
            />
          </div>
        )

      case "react-component":
        return (
          <div className="w-full h-full">
            <div className="mb-4 p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                React Component Preview (UI Only)
              </p>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )

      case "diagram":
        return (
          <div className="w-full h-full flex flex-col">
            <div className="mb-4 p-4 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Diagram Preview (Would render with diagram library)
              </p>
            </div>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto flex-1">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )

      case "document":
        return (
          <div className="prose max-w-none p-6">
            <div dangerouslySetInnerHTML={{
              __html: marked ? marked(artifact.content) : artifact.content.split('\n').map(line => `<p>${line}</p>`).join('')
            }} />
          </div>
        )

      case "code":
      default:
        return (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto">
            <code>{artifact.content}</code>
          </pre>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-md ${config.bgColor}`}>
            <Icon className={`size-4 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold">{artifact.title}</h3>
            <p className="text-sm text-muted-foreground">{config.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
          >
            <Download className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Fullscreen className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  )
}

// Simple markdown parser fallback
const marked = (text: string) => {
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`
      if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`
      if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`
      if (line.startsWith('- ')) return `<li>${line.substring(2)}</li>`
      if (line.trim() === '') return '<br>'
      return `<p>${line}</p>`
    })
    .join('')
}

export function AIArtifact({ artifact, className }: AIArtifactProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const config = typeConfig[artifact.type]
  const Icon = config.icon

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <ArtifactRenderer
          artifact={artifact}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(false)}
        />
      </div>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${config.bgColor}`}>
              <Icon className={`size-4 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-sm">{artifact.title}</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3" />
                AI Generated {config.label}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
        </div>
        {artifact.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {artifact.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-96 border-t">
          <ArtifactRenderer
            artifact={artifact}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(true)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface ArtifactListProps {
  artifacts: Artifact[]
  className?: string
}

export function ArtifactList({ artifacts, className }: ArtifactListProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null)

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-8">
        <Sparkles className="size-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No artifacts generated yet</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {artifacts.map((artifact) => {
            const config = typeConfig[artifact.type]
            const Icon = config.icon

            return (
              <div
                key={artifact.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedArtifact(artifact)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${config.bgColor}`}>
                    <Icon className={`size-4 ${config.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{artifact.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {config.label} • {artifact.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="size-4" />
                </Button>
              </div>
            )
          })}
        </TabsContent>

        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {artifacts.map((artifact) => (
              <AIArtifact
                key={artifact.id}
                artifact={artifact}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedArtifact && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="h-full w-full flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh]">
              <AIArtifact artifact={selectedArtifact} />
              <div className="mt-4 flex justify-center">
                <Button onClick={() => setSelectedArtifact(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}