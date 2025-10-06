'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code,
  Download,
  Eye,
  X,
  File
} from 'lucide-react'

interface FileChipProps {
  file: {
    id: string
    name: string
    type: 'image' | 'file' | 'video' | 'audio' | 'archive' | 'code'
    size: string
    url?: string
    preview?: string
  }
  onDownload?: () => void
  onPreview?: () => void
  onRemove?: () => void
  showRemove?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export default function FileChip({ 
  file, 
  onDownload, 
  onPreview, 
  onRemove, 
  showRemove = false,
  variant = 'default',
  className = ""
}: FileChipProps) {
  // Get file icon based on type
  const getFileIcon = () => {
    switch (file.type) {
      case 'image':
        return ImageIcon
      case 'video':
        return Film
      case 'audio':
        return Music
      case 'archive':
        return Archive
      case 'code':
        return Code
      case 'file':
      default:
        return FileText
    }
  }

  // Get file color based on type
  const getFileColor = () => {
    switch (file.type) {
      case 'image':
        return 'text-green-600'
      case 'video':
        return 'text-purple-600'
      case 'audio':
        return 'text-pink-600'
      case 'archive':
        return 'text-yellow-600'
      case 'code':
        return 'text-blue-600'
      case 'file':
      default:
        return 'text-gray-600'
    }
  }

  const Icon = getFileIcon()
  const iconColor = getFileColor()

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 bg-surface rounded px-2 py-1 text-sm ${className}`}>
        <Icon className={`h-3 w-3 ${iconColor}`} />
        <span className="truncate max-w-24">{file.name}</span>
        <span className="text-xs text-muted-foreground">{file.size}</span>
        {showRemove && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 ml-1"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-surface rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-3">
          {/* Preview/Icon */}
          <div className="flex-shrink-0">
            {file.type === 'image' && file.preview ? (
              <img
                src={file.preview}
                alt={file.name}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className={`h-12 w-12 rounded bg-surface-elevated flex items-center justify-center ${iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate mb-1">{file.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {file.type}
              </Badge>
              <span>{file.size}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onPreview}
                title="Preview"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            {showRemove && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRemove}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={`inline-flex items-center gap-2 bg-surface rounded-lg px-3 py-2 ${className}`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">{file.size}</div>
      </div>
      
      <div className="flex items-center gap-1">
        {onPreview && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPreview}
            title="Preview"
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
        {onDownload && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDownload}
            title="Download"
          >
            <Download className="h-3 w-3" />
          </Button>
        )}
        {showRemove && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
            title="Remove"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}