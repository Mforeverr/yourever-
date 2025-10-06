import { WorkspaceShell } from "@/components/shell/workspace-shell";

export default function ExplorerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}