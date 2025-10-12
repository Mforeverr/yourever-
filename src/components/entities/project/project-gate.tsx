'use client'

// Author: Codex (Senior Frontend Developer)
// Date: 2025-10-11
// Role: Frontend

import { ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldAlert } from "lucide-react"
import { useProjectFeatureGate } from "@/modules/projects"

interface ProjectFeatureGateProps {
  children: ReactNode
}

export function ProjectFeatureGate({ children }: ProjectFeatureGateProps) {
  const { detailFeatureEnabled, isScopeReady } = useProjectFeatureGate()

  if (!isScopeReady) {
    return null
  }

  if (!detailFeatureEnabled) {
    return (
      <Alert variant="default" className="border-dashed border-border/60 bg-muted/30">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Coming soon</AlertTitle>
        <AlertDescription>
          Project detail pages are still behind a feature flag. Enable `projects.detail` to preview the experience.
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}
