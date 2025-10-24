import { ReactNode } from "react"
import { ScopeProvider } from "@/contexts/scope-context"
import { RightPanelProvider } from "@/contexts/right-panel-context"

export default function OrganizationLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <RightPanelProvider>
      <ScopeProvider>
        {children}
      </ScopeProvider>
    </RightPanelProvider>
  )
}