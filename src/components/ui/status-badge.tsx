import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border",
  {
    variants: {
      status: {
        "on-track": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        "stuck": "bg-red-500/10 text-red-400 border-red-500/20",
        "untouched": "bg-muted text-muted-foreground border-border",
        "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "completed": "bg-green-500/10 text-green-400 border-green-500/20",
      },
    },
    defaultVariants: {
      status: "untouched",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, status, ...props }: StatusBadgeProps) {
  const displayText = status?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  
  return (
    <div className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {displayText}
    </div>
  )
}

export { StatusBadge, statusBadgeVariants }