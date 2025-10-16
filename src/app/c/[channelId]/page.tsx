import { ResolvingSplash } from '@/components/global/resolving-splash'

interface ChannelShortlinkPageProps {
  params: { channelId: string }
}

export default function ChannelShortlinkPage({ params }: ChannelShortlinkPageProps) {
  return <ResolvingSplash type="channel" entityId={params.channelId} />
}
