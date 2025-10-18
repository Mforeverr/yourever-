import { ResolvingSplash } from '@/components/global/resolving-splash'

interface ChannelShortlinkPageProps {
  params: Promise<{ channelId: string }>
}

export default async function ChannelShortlinkPage({ params }: ChannelShortlinkPageProps) {
  const { channelId } = await params
  return <ResolvingSplash type="channel" entityId={channelId} />
}
