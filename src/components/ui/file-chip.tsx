import * as React from "react"
import { X, FileText, Image, FileArchive, File } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface FileChipProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  size?: string
  type?: string
  onRemove?: () => void
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image
  if (type.includes('zip') || type.includes('rar')) return FileArchive
  if (type.includes('text') || type.includes('document')) return FileText
  return File
}

function FileChip({ name, size, type, onRemove, className, ...props }: FileChipProps) {
  const Icon = getFileIcon(type || '')
  
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm",
        className
      )}
      {...props}
    >
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-foreground font-medium truncate max-w-32">{name}</span>
        {size && <span className="text-xs text-muted-foreground">{size}</span>}
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onRemove}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  )
}

export { FileChip }