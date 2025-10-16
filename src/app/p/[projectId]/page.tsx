import { ResolvingSplash } from '@/components/global/resolving-splash'

interface ProjectShortlinkPageProps {
  params: { projectId: string }
}

export default function ProjectShortlinkPage({ params }: ProjectShortlinkPageProps) {
  return <ResolvingSplash type="project" entityId={params.projectId} />
}
