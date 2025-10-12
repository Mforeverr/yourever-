import { ReactNode } from "react"
import { WorkspaceShell } from "@/components/shell/workspace-shell"

export default function ScopedWorkspaceLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return <WorkspaceShell>{children}</WorkspaceShell>
}
