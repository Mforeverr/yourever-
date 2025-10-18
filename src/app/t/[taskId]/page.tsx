import { ResolvingSplash } from '@/components/global/resolving-splash'

interface TaskShortlinkPageProps {
  params: Promise<{ taskId: string }>
}

export default async function TaskShortlinkPage({ params }: TaskShortlinkPageProps) {
  const { taskId } = await params
  return <ResolvingSplash type="task" entityId={taskId} />
}
