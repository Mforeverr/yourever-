import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { OrganizationDivision } from '@/mocks/data/users'

const DIVISION_KEYS = ['marketing', 'engineering', 'design', 'product', 'research'] as const

export type DivisionKey = typeof DIVISION_KEYS[number]
export type DivisionScope = DivisionKey | 'all'
export type PresenceStatus = 'online' | 'away' | 'offline'

export interface MockChannel {
  id: string
  name: string
  type: 'public' | 'private'
  topic: string
  memberCount: number
  orgIds: Array<string> | 'all'
  divisions: DivisionScope[]
  isMuted: boolean
  isFavorite: boolean
  unreadCount: number
}

export interface ChannelAttachment {
  id: string
  name: string
  type: 'image' | 'file'
  size: string
  url: string
}

export interface ChannelMessage {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    status: PresenceStatus
  }
  timestamp: string
  reactions: Array<{
    emoji: string
    count: number
    users: string[]
  }>
  attachments?: ChannelAttachment[]
  threadCount?: number
  isPinned?: boolean
}

export interface MockDMUser {
  id: string
  name: string
  avatar?: string
  status: PresenceStatus
  email?: string
  role?: string
  timezone?: string
  lastSeen?: string
  orgIds: Array<string> | 'all'
  divisions: DivisionScope[]
  unreadCount: number
}

export interface DirectMessage {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    status: PresenceStatus
  }
  timestamp: string
  reactions: Array<{
    emoji: string
    count: number
    users: string[]
  }>
  attachments?: ChannelAttachment[]
  threadCount?: number
}

interface MockConversationState {
  channels: Record<string, MockChannel>
  channelMessages: Record<string, ChannelMessage[]>
  dmUsers: Record<string, MockDMUser>
  dmMessages: Record<string, DirectMessage[]>
  version: number
}

interface MockConversationActions {
  reset: () => void
  toggleChannelFavorite: (channelId: string) => void
  toggleChannelMute: (channelId: string) => void
  markChannelRead: (channelId: string) => void
  markDirectMessageRead: (userId: string) => void
  appendChannelMessage: (channelId: string, message: ChannelMessage) => void
  reactToChannelMessage: (channelId: string, messageId: string, emoji: string, reactingUser: string) => void
  appendDirectMessage: (userId: string, message: DirectMessage) => void
  reactToDirectMessage: (userId: string, messageId: string, emoji: string, reactingUser: string) => void
}

export type MockConversationStore = MockConversationState & MockConversationActions

const matchesDivision = (divisions: DivisionScope[], divisionId?: string | null) => {
  if (divisions.includes('all')) return true
  if (!divisionId) return false
  return divisions.includes(divisionId as DivisionScope)
}

const matchesOrg = (orgIds: Array<string> | 'all', orgId?: string | null) => {
  if (orgIds === 'all') return true
  if (!orgId) return false
  return orgIds.includes(orgId)
}

const cloneMessageArray = (messages: ChannelMessage[]): ChannelMessage[] =>
  messages.map((message) => ({
    ...message,
    author: { ...message.author },
    reactions: message.reactions.map((reaction) => ({ ...reaction, users: [...reaction.users] })),
    attachments: message.attachments ? message.attachments.map((attachment) => ({ ...attachment })) : undefined
  }))

const cloneDirectMessageArray = (messages: DirectMessage[]): DirectMessage[] =>
  messages.map((message) => ({
    ...message,
    author: { ...message.author },
    reactions: message.reactions.map((reaction) => ({ ...reaction, users: [...reaction.users] })),
    attachments: message.attachments ? message.attachments.map((attachment) => ({ ...attachment })) : undefined
  }))

const createSeedData = (): MockConversationState => {
  const channelSeed: MockChannel[] = [
    {
      id: 'general',
      name: 'general',
      type: 'public',
      topic: 'Company-wide announcements and discussions',
      memberCount: 48,
      orgIds: 'all',
      divisions: ['all'],
      unreadCount: 5,
      isFavorite: true,
      isMuted: false
    },
    {
      id: 'development',
      name: 'development',
      type: 'public',
      topic: 'Development team discussions and code reviews',
      memberCount: 22,
      orgIds: 'all',
      divisions: ['engineering', 'product'],
      unreadCount: 3,
      isFavorite: true,
      isMuted: false
    },
    {
      id: 'design-crits',
      name: 'design-crits',
      type: 'public',
      topic: 'Design collaboration and weekly crits',
      memberCount: 18,
      orgIds: 'all',
      divisions: ['design'],
      unreadCount: 0,
      isFavorite: false,
      isMuted: true
    },
    {
      id: 'launch-lab',
      name: 'launch-lab',
      type: 'private',
      topic: 'Campaign planning and GTM experiments',
      memberCount: 14,
      orgIds: 'all',
      divisions: ['marketing'],
      unreadCount: 2,
      isFavorite: true,
      isMuted: false
    },
    {
      id: 'research-desk',
      name: 'research-desk',
      type: 'private',
      topic: 'User interview insights and lab updates',
      memberCount: 8,
      orgIds: 'all',
      divisions: ['research'],
      unreadCount: 1,
      isFavorite: false,
      isMuted: false
    },
    {
      id: 'product-strategy',
      name: 'product-strategy',
      type: 'public',
      topic: 'Product roadmap alignment and priorities',
      memberCount: 26,
      orgIds: 'all',
      divisions: ['product'],
      unreadCount: 4,
      isFavorite: true,
      isMuted: false
    }
  ]

  const channelMessageSeed: Record<string, ChannelMessage[]> = {
    'general': [
      {
        id: '1',
        content: "Hey team! I've just finished the initial design mockups for the new feature. Would love to get your feedback on them.",
        author: {
          id: 'sarah',
          name: 'Sarah Chen',
          avatar: '/avatars/sarah.jpg',
          status: 'online'
        },
        timestamp: '2:34 PM',
        reactions: [
          { emoji: '👍', count: 3, users: ['Mike', 'Emily', 'Alex'] },
          { emoji: '❤️', count: 2, users: ['Tom', 'Lisa'] }
        ],
        attachments: [
          {
            id: 'mockup',
            name: 'dashboard-mockup.fig',
            type: 'file',
            size: '2.4 MB',
            url: '#'
          },
          {
            id: 'user-flow',
            name: 'user-flow.png',
            type: 'image',
            size: '856 KB',
            url: '#'
          }
        ],
        threadCount: 3,
        isPinned: true
      },
      {
        id: '2',
        content: 'Great work Sarah! The designs look fantastic. I especially like the color scheme you chose.',
        author: {
          id: 'mike',
          name: 'Mike Johnson',
          avatar: '/avatars/mike.jpg',
          status: 'online'
        },
        timestamp: '2:36 PM',
        reactions: [{ emoji: '🎉', count: 1, users: ['Sarah'] }],
        attachments: [],
        threadCount: 0
      },
      {
        id: '3',
        content: 'I agree with Mike! The user flow is very intuitive. One suggestion - maybe we could add a dark mode variant?',
        author: {
          id: 'emily',
          name: 'Emily Davis',
          avatar: '/avatars/emily.jpg',
          status: 'away'
        },
        timestamp: '2:38 PM',
        reactions: [{ emoji: '💡', count: 2, users: ['Sarah', 'Mike'] }],
        threadCount: 1
      }
    ],
    'development': [
      {
        id: '1',
        content: 'Heads up: the API rate limit change is rolling out this afternoon. Keep an eye on the logs.',
        author: {
          id: 'james',
          name: 'James Lee',
          avatar: '/avatars/james.jpg',
          status: 'away'
        },
        timestamp: '11:15 AM',
        reactions: [{ emoji: '👀', count: 4, users: ['Mike', 'Tom', 'Alex', 'Zoe'] }],
        threadCount: 0
      },
      {
        id: '2',
        content: 'Thanks for the reminder! I’ll update the onboarding service to handle the new limit.',
        author: {
          id: 'tom',
          name: 'Tom Wilson',
          avatar: '/avatars/tom.jpg',
          status: 'offline'
        },
        timestamp: '11:18 AM',
        reactions: [{ emoji: '✅', count: 2, users: ['James', 'Mike'] }],
        threadCount: 0
      }
    ],
    'product-strategy': [
      {
        id: '1',
        content: 'Drafted the Q1 outcomes matrix. Please review and drop comments before Friday.',
        author: {
          id: 'zoe',
          name: 'Zoe Patel',
          avatar: '/avatars/zoe.jpg',
          status: 'online'
        },
        timestamp: '9:45 AM',
        reactions: [{ emoji: '📝', count: 1, users: ['Sarah'] }],
        attachments: [
          {
            id: 'outcomes-matrix',
            name: 'q1-outcomes.xlsx',
            type: 'file',
            size: '184 KB',
            url: '#'
          }
        ],
        threadCount: 0
      }
    ]
  }

  const dmSeed: MockDMUser[] = [
    {
      id: 'sarah',
      name: 'Sarah Chen',
      avatar: '/avatars/sarah.jpg',
      status: 'online',
      email: 'sarah.chen@yourever.com',
      role: 'Product Designer',
      timezone: 'PST (UTC-8)',
      orgIds: 'all',
      divisions: ['design', 'marketing'],
      unreadCount: 2
    },
    {
      id: 'mike',
      name: 'Mike Johnson',
      avatar: '/avatars/mike.jpg',
      status: 'online',
      email: 'mike.johnson@yourever.com',
      role: 'Frontend Engineer',
      timezone: 'PST (UTC-8)',
      orgIds: 'all',
      divisions: ['engineering', 'product'],
      unreadCount: 0
    },
    {
      id: 'emily',
      name: 'Emily Davis',
      avatar: '/avatars/emily.jpg',
      status: 'away',
      email: 'emily.davis@yourever.com',
      role: 'UX Researcher',
      timezone: 'PST (UTC-8)',
      lastSeen: '5 minutes ago',
      orgIds: 'all',
      divisions: ['design', 'research'],
      unreadCount: 0
    },
    {
      id: 'tom',
      name: 'Tom Wilson',
      avatar: '/avatars/tom.jpg',
      status: 'offline',
      email: 'tom.wilson@yourever.com',
      role: 'Backend Engineer',
      timezone: 'EST (UTC-5)',
      lastSeen: '2 hours ago',
      orgIds: 'all',
      divisions: ['engineering'],
      unreadCount: 1
    },
    {
      id: 'luis',
      name: 'Luis Martinez',
      avatar: '/avatars/luis.jpg',
      status: 'online',
      email: 'luis.martinez@yourever.com',
      role: 'Marketing Manager',
      timezone: 'CST (UTC-6)',
      orgIds: 'all',
      divisions: ['marketing'],
      unreadCount: 3
    }
  ]

  const dmMessageSeed: Record<string, DirectMessage[]> = {
    sarah: [
      {
        id: '1',
        content: "Hey! I wanted to show you the new designs I've been working on.",
        author: {
          id: 'sarah',
          name: 'Sarah Chen',
          avatar: '/avatars/sarah.jpg',
          status: 'online'
        },
        timestamp: '2:34 PM',
        reactions: []
      },
      {
        id: '2',
        content: "That sounds great! I'd love to see them. Are you free to walk through them now?",
        author: {
          id: 'current-user',
          name: 'You',
          status: 'online'
        },
        timestamp: '2:35 PM',
        reactions: []
      },
      {
        id: '3',
        content: "Absolutely! Let me share my screen. I've made some really interesting changes to the user flow.",
        author: {
          id: 'sarah',
          name: 'Sarah Chen',
          avatar: '/avatars/sarah.jpg',
          status: 'online'
        },
        timestamp: '2:36 PM',
        reactions: [{ emoji: '🎉', count: 1, users: ['You'] }]
      }
    ],
    mike: [
      {
        id: '1',
        content: 'Did you get a chance to review my PR?',
        author: {
          id: 'mike',
          name: 'Mike Johnson',
          avatar: '/avatars/mike.jpg',
          status: 'online'
        },
        timestamp: '1:15 PM',
        reactions: []
      },
      {
        id: '2',
        content: 'Yes! Just left some comments. Overall looks good, just a few minor suggestions.',
        author: {
          id: 'current-user',
          name: 'You',
          status: 'online'
        },
        timestamp: '1:20 PM',
        reactions: []
      }
    ],
    emily: [
      {
        id: '1',
        content: 'Sharing the latest research findings from yesterday’s sessions!',
        author: {
          id: 'emily',
          name: 'Emily Davis',
          avatar: '/avatars/emily.jpg',
          status: 'away'
        },
        timestamp: '4:52 PM',
        reactions: [{ emoji: '👀', count: 2, users: ['You', 'Sarah'] }],
        attachments: [
          {
            id: 'insights',
            name: 'user-insights.pdf',
            type: 'file',
            size: '1.2 MB',
            url: '#'
          }
        ]
      }
    ]
  }

  return {
    channels: Object.fromEntries(channelSeed.map((channel) => [channel.id, { ...channel }])),
    channelMessages: Object.fromEntries(
      Object.entries(channelMessageSeed).map(([id, messages]) => [id, cloneMessageArray(messages)])
    ),
    dmUsers: Object.fromEntries(dmSeed.map((user) => [user.id, { ...user }])),
    dmMessages: Object.fromEntries(
      Object.entries(dmMessageSeed).map(([id, messages]) => [id, cloneDirectMessageArray(messages)])
    ),
    version: 0
  }
}

const noopStorage = (): Storage => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => {
      data.clear()
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size
    }
  }
}


// Type for what gets persisted (only the state data, not methods)
type PersistedConversationState = {
  channels: Record<string, MockChannel>
  channelMessages: Record<string, ChannelMessage[]>
  dmUsers: Record<string, MockDMUser>
  dmMessages: Record<string, DirectMessage[]>
  version: number
}

const storage = createJSONStorage<PersistedConversationState>(() =>
  typeof window === 'undefined' ? noopStorage() : window.localStorage
)

export const useMockConversationStore = create<MockConversationStore>()(
  persist(
    (set) => ({
      ...createSeedData(),
      reset: () => set(() => createSeedData()),
      toggleChannelFavorite: (channelId) =>
        set((state) => {
          const channel = state.channels[channelId]
          if (!channel) return {}
          return {
            channels: {
              ...state.channels,
              [channelId]: { ...channel, isFavorite: !channel.isFavorite }
            },
            version: state.version + 1
          }
        }),
      toggleChannelMute: (channelId) =>
        set((state) => {
          const channel = state.channels[channelId]
          if (!channel) return {}
          return {
            channels: {
              ...state.channels,
              [channelId]: { ...channel, isMuted: !channel.isMuted }
            },
            version: state.version + 1
          }
        }),
      markChannelRead: (channelId) =>
        set((state) => {
          const channel = state.channels[channelId]
          if (!channel || channel.unreadCount === 0) return {}
          return {
            channels: {
              ...state.channels,
              [channelId]: { ...channel, unreadCount: 0 }
            },
            version: state.version + 1
          }
        }),
      markDirectMessageRead: (userId) =>
        set((state) => {
          const user = state.dmUsers[userId]
          if (!user || user.unreadCount === 0) return {}
          return {
            dmUsers: {
              ...state.dmUsers,
              [userId]: { ...user, unreadCount: 0 }
            },
            version: state.version + 1
          }
        }),
      appendChannelMessage: (channelId, message) =>
        set((state) => {
          const existing = state.channelMessages[channelId] ?? []
          return {
            channelMessages: {
              ...state.channelMessages,
              [channelId]: [...existing, { ...message }]
            },
            version: state.version + 1
          }
        }),
      reactToChannelMessage: (channelId, messageId, emoji, reactingUser) =>
        set((state) => {
          const existing = state.channelMessages[channelId]
          if (!existing) return {}
          return {
            channelMessages: {
              ...state.channelMessages,
              [channelId]: existing.map((message) => {
                if (message.id !== messageId) return message
                const reaction = message.reactions.find((r) => r.emoji === emoji)
                if (reaction) {
                  return {
                    ...message,
                    reactions: message.reactions.map((r) =>
                      r.emoji === emoji
                        ? { ...r, count: r.count + 1, users: [...r.users, reactingUser] }
                        : r
                    )
                  }
                }
                return {
                  ...message,
                  reactions: [...message.reactions, { emoji, count: 1, users: [reactingUser] }]
                }
              })
            },
            version: state.version + 1
          }
        }),
      appendDirectMessage: (userId, message) =>
        set((state) => {
          const existing = state.dmMessages[userId] ?? []
          return {
            dmMessages: {
              ...state.dmMessages,
              [userId]: [...existing, { ...message }]
            },
            version: state.version + 1
          }
        }),
      reactToDirectMessage: (userId, messageId, emoji, reactingUser) =>
        set((state) => {
          const existing = state.dmMessages[userId]
          if (!existing) return {}
          return {
            dmMessages: {
              ...state.dmMessages,
              [userId]: existing.map((message) => {
                if (message.id !== messageId) return message
                const reaction = message.reactions.find((r) => r.emoji === emoji)
                if (reaction) {
                  return {
                    ...message,
                    reactions: message.reactions.map((r) =>
                      r.emoji === emoji
                        ? { ...r, count: r.count + 1, users: [...r.users, reactingUser] }
                        : r
                    )
                  }
                }
                return {
                  ...message,
                  reactions: [...message.reactions, { emoji, count: 1, users: [reactingUser] }]
                }
              })
            },
            version: state.version + 1
          }
        })
    }),
    {
      name: 'mock-conversations',
      storage,
      partialize: (state: MockConversationStore): PersistedConversationState => ({
        channels: state.channels,
        channelMessages: state.channelMessages,
        dmUsers: state.dmUsers,
        dmMessages: state.dmMessages,
        version: state.version
      })
    }
  )
)

const stateSnapshot = () => useMockConversationStore.getState()

const channelList = (state: MockConversationState) => Object.values(state.channels)
const dmList = (state: MockConversationState) => Object.values(state.dmUsers)

// Cache for filtered results to prevent unnecessary re-renders
const channelsCache = new Map<string, MockChannel[]>()
const dmUsersCache = new Map<string, MockDMUser[]>()
const dmMessagesCache = new Map<string, DirectMessage[]>()
const dmUserCache = new Map<string, MockDMUser | undefined>()
const emptyArray: DirectMessage[] = [] // Use a stable reference for empty arrays

const getConversationCacheKey = (version: number, orgId?: string | null, divisionId?: string | null) =>
  `${version}-${orgId || 'null'}-${divisionId || 'null'}`

export const selectChannelsForScope = (
  state: MockConversationState,
  orgId?: string | null,
  divisionId?: string | null
): MockChannel[] => {
  const cacheKey = getConversationCacheKey(state.version, orgId, divisionId)

  if (!channelsCache.has(cacheKey)) {
    const filtered = channelList(state)
      .filter((channel) => matchesOrg(channel.orgIds, orgId) && matchesDivision(channel.divisions, divisionId))
      .sort((a, b) => a.name.localeCompare(b.name))
    channelsCache.set(cacheKey, filtered)
  }

  return channelsCache.get(cacheKey)!
}

export const selectChannelById = (
  state: MockConversationState,
  orgId: string | undefined,
  divisionId: string | undefined,
  channelId: string
): MockChannel | undefined => {
  const channel = state.channels[channelId]
  if (!channel) return undefined
  if (!matchesOrg(channel.orgIds, orgId) || !matchesDivision(channel.divisions, divisionId)) return undefined
  return channel
}

export const selectChannelMessages = (state: MockConversationState, channelId: string): ChannelMessage[] =>
  state.channelMessages[channelId] ?? []

export const selectDirectMessageUsersForScope = (
  state: MockConversationState,
  orgId?: string | null,
  divisionId?: string | null
): MockDMUser[] => {
  const cacheKey = getConversationCacheKey(state.version, orgId, divisionId)

  if (!dmUsersCache.has(cacheKey)) {
    const filtered = dmList(state)
      .filter((user) => matchesOrg(user.orgIds, orgId) && matchesDivision(user.divisions, divisionId))
      .sort((a, b) => a.name.localeCompare(b.name))
    dmUsersCache.set(cacheKey, filtered)
  }

  return dmUsersCache.get(cacheKey)!
}

export const selectDirectMessageUser = (
  state: MockConversationState,
  orgId: string | undefined,
  divisionId: string | undefined,
  userId: string
): MockDMUser | undefined => {
  const cacheKey = `${state.version}-${orgId || 'null'}-${divisionId || 'null'}-${userId}`

  if (!dmUserCache.has(cacheKey)) {
    const user = state.dmUsers[userId]
    if (!user) {
      dmUserCache.set(cacheKey, undefined)
      return undefined
    }
    if (!matchesOrg(user.orgIds, orgId) || !matchesDivision(user.divisions, divisionId)) {
      dmUserCache.set(cacheKey, undefined)
      return undefined
    }
    dmUserCache.set(cacheKey, user)
    return user
  }

  return dmUserCache.get(cacheKey)
}

export const selectDirectMessages = (state: MockConversationState, userId: string): DirectMessage[] => {
  const cacheKey = `${state.version}-${userId}`

  if (!dmMessagesCache.has(cacheKey)) {
    const messages = state.dmMessages[userId] ?? emptyArray
    dmMessagesCache.set(cacheKey, messages)
  }

  return dmMessagesCache.get(cacheKey)!
}

export const getChannelsForScope = (orgId?: string | null, divisionId?: string | null) =>
  selectChannelsForScope(stateSnapshot(), orgId, divisionId)

export const getChannelById = (channelId: string, orgId?: string | null, divisionId?: string | null) =>
  selectChannelById(stateSnapshot(), orgId ?? undefined, divisionId ?? undefined, channelId)

export const getChannelMessages = (channelId: string) =>
  selectChannelMessages(stateSnapshot(), channelId)

export const getDirectMessageUsersForScope = (orgId?: string | null, divisionId?: string | null) =>
  selectDirectMessageUsersForScope(stateSnapshot(), orgId, divisionId)

export const getDirectMessageUser = (userId: string, orgId?: string | null, divisionId?: string | null) =>
  selectDirectMessageUser(stateSnapshot(), orgId ?? undefined, divisionId ?? undefined, userId)

export const getDirectMessageHistory = (userId: string) =>
  selectDirectMessages(stateSnapshot(), userId)

export const divisionIdFromOrganization = (division: OrganizationDivision | undefined): DivisionKey | undefined => {
  if (!division) return undefined
  return DIVISION_KEYS.find((key) => key === division.id)
}
