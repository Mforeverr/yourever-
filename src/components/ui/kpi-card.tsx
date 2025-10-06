import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: string | number
  change?: {
    value: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
}

function KpiCard({ title, value, change, icon, className, ...props }: KpiCardProps) {
  return (
    <Card className={cn("elevation-1", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "font-medium",
                change.trend === 'up' && "text-green-400",
                change.trend === 'down' && "text-red-400"
              )}
            >
              {change.trend === 'up' && '↑'}
              {change.trend === 'down' && '↓'}
              {change.value}
            </span>
            <span>from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { KpiCard }