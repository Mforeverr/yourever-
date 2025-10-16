import { ResolvingSplash } from '@/components/global/resolving-splash'

interface TaskShortlinkPageProps {
  params: { taskId: string }
}

export default function TaskShortlinkPage({ params }: TaskShortlinkPageProps) {
  return <ResolvingSplash type="task" entityId={params.taskId} />
}
