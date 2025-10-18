import { ResolvingSplash } from '@/components/global/resolving-splash'

interface ProjectShortlinkPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectShortlinkPage({ params }: ProjectShortlinkPageProps) {
  const { projectId } = await params
  return <ResolvingSplash type="project" entityId={projectId} />
}
