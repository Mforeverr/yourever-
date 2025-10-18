import type { MockDMUser, ChannelMessage, MockChannel } from "@/mocks/data/conversations"
import type { HuddleParticipantState, HuddleSessionState, HuddleMetadata } from "@/state/ui.store"

interface BuildSessionOptions {
  id: string
  title: string
  participants: HuddleParticipantState[]
  startTime?: string
  isRecording?: boolean
  isScreenSharing?: boolean
  metadata?: HuddleMetadata
}

export const buildSession = ({
  id,
  title,
  participants,
  startTime,
  isRecording = false,
  isScreenSharing = false,
  metadata,
}: BuildSessionOptions): HuddleSessionState => ({
  id,
  title,
  participants,
  startTime: startTime ?? new Date().toISOString(),
  isRecording,
  isScreenSharing,
  metadata,
})

export const buildParticipant = (user: MockDMUser): HuddleParticipantState => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
  isSpeaking: false,
  isMuted: false,
  isVideoOn: true,
  status: user.status,
})

export const buildCurrentUserParticipant = (): HuddleParticipantState => ({
  id: "current-user",
  name: "You",
  isSpeaking: false,
  isMuted: false,
  isVideoOn: true,
  status: "online",
})

export const deriveChannelParticipants = (messages: ChannelMessage[], limit = 10): HuddleParticipantState[] => {
  const participantsMap = new Map<string, HuddleParticipantState>()

  for (const message of messages.slice(0, limit)) {
    if (!participantsMap.has(message.author.id)) {
      participantsMap.set(message.author.id, {
        id: message.author.id,
        name: message.author.name,
        avatar: message.author.avatar,
        isSpeaking: false,
        isMuted: false,
        isVideoOn: true,
        status: message.author.status,
      })
    }
  }

  if (!participantsMap.has("current-user")) {
    participantsMap.set("current-user", buildCurrentUserParticipant())
  }

  return Array.from(participantsMap.values())
}

export const buildChannelSession = (
  channel: Pick<MockChannel, "id" | "name">,
  messages: ChannelMessage[],
  limit = 10,
  metadata?: HuddleMetadata
): HuddleSessionState =>
  buildSession({
    id: `channel-huddle-${channel.id}`,
    title: `${channel.name} Huddle`,
    participants: deriveChannelParticipants(messages, limit),
    metadata,
  })

export type HuddleLauncher = (session: HuddleSessionState) => void

export const startHuddle = (
  launch: HuddleLauncher,
  options: BuildSessionOptions
) => {
  const session = buildSession(options)
  launch(session)
}

export interface StartChannelHuddleOptions {
  limit?: number
  metadata?: HuddleMetadata
}

export const startChannelHuddle = (
  launch: HuddleLauncher,
  resolveMessages: () => ChannelMessage[],
  channel: Pick<MockChannel, "id" | "name">,
  options?: StartChannelHuddleOptions
) => {
  const messages = resolveMessages()
  const session = buildChannelSession(
    channel,
    messages,
    options?.limit ?? 10,
    options?.metadata
  )
  launch(session)
}
