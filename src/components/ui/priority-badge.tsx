import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const priorityBadgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border",
  {
    variants: {
      priority: {
        low: "bg-green-500/10 text-green-400 border-green-500/20",
        medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        urgent: "bg-red-500/10 text-red-400 border-red-500/20",
      },
    },
    defaultVariants: {
      priority: "medium",
    },
  }
)

export interface PriorityBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof priorityBadgeVariants> {}

function PriorityBadge({ className, priority, ...props }: PriorityBadgeProps) {
  return (
    <div className={cn(priorityBadgeVariants({ priority }), className)} {...props}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </div>
  )
}

export { PriorityBadge, priorityBadgeVariants }