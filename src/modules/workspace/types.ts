export type WorkspacePriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type WorkspaceBadgeVariant = 'secondary' | 'destructive'
export type ChannelVisibility = 'public' | 'private'
export type ActivityType = 'post' | 'comment' | 'like' | 'share' | 'file' | 'link' | 'status'

export interface WorkspaceProject {
  id: string
  orgId: string
  divisionId: string | null
  name: string
  description?: string | null
  badgeCount: number
  dotColor: string
  status: string
  defaultView: string
  isTemplate: boolean
  updatedAt: string
}

export interface WorkspaceTask {
  id: string
  orgId: string
  divisionId: string | null
  projectId: string | null
  name: string
  priority: WorkspacePriority
  badgeVariant: WorkspaceBadgeVariant
  dotColor: string
  isTemplate: boolean
  updatedAt: string
}

export interface WorkspaceDoc {
  id: string
  orgId: string
  divisionId: string | null
  name: string
  url?: string | null
  summary?: string | null
  isTemplate: boolean
  updatedAt: string
}

export interface WorkspaceChannel {
  id: string
  orgId: string
  divisionId: string | null
  slug: string
  name: string
  channelType: ChannelVisibility
  topic?: string | null
  description?: string | null
  memberCount: number
  isFavorite: boolean
  isMuted: boolean
  unreadCount: number
  isTemplate: boolean
  updatedAt: string
}

export interface WorkspaceActivityAuthor {
  id?: string | null
  name: string
  role?: string | null
  avatar?: string | null
}

export interface WorkspaceActivity {
  id: string
  orgId: string
  divisionId: string | null
  activityType: ActivityType
  content: string
  metadata?: Record<string, unknown> | null
  occurredAt: string
  isTemplate: boolean
  author: WorkspaceActivityAuthor
}

export interface WorkspaceOverview {
  orgId: string
  divisionId: string | null
  projects: WorkspaceProject[]
  tasks: WorkspaceTask[]
  docs: WorkspaceDoc[]
  channels: WorkspaceChannel[]
  hasTemplates: boolean
}

export interface ChannelListResponse {
  items: WorkspaceChannel[]
  total: number
  page: number
  pageSize: number
}

export interface ActivityFeedResponse {
  items: WorkspaceActivity[]
  nextCursor?: string | null
}

export interface CreateProjectPayload {
  name: string
  description?: string | null
  badgeCount?: number
  dotColor?: string
  divisionId?: string | null
}

export interface UpdateProjectPayload extends CreateProjectPayload {
  archivedAt?: string | null
}

export interface CreateChannelPayload {
  name: string
  slug: string
  channelType: ChannelVisibility
  topic?: string | null
  description?: string | null
  divisionId?: string | null
}

export interface UpdateChannelPayload extends CreateChannelPayload {
  isFavorite?: boolean
  isMuted?: boolean
  archivedAt?: string | null
}
