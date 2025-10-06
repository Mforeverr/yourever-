import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  options: Array<{
    value: string
    label: string
    icon?: React.ReactNode
  }>
  value: string
  onValueChange: (value: string) => void
}

function SegmentedControl({ options, value, onValueChange, className, ...props }: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-surface-elevated p-1",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onValueChange(option.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
            value === option.value
              ? "bg-brand text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export { SegmentedControl }