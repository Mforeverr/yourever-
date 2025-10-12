export interface DivisionOverview {
  id: string
  orgId: string
  name: string
  summary: string
  leader: {
    name: string
    title: string
    avatar?: string
  }
  memberCount: number
  projectCount: number
  activeInitiatives: number
  focusAreas: string[]
  timezone: string
  lastSync: string
  accentColor: string
  allowedRoles?: Array<'owner' | 'admin' | 'member'>
}

const divisionOverviews: DivisionOverview[] = [
  {
    id: 'marketing',
    orgId: 'acme',
    name: 'Marketing',
    summary: 'Growth programs, demand generation, and campaign strategy.',
    leader: {
      name: 'Maya Patel',
      title: 'VP Growth',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya'
    },
    memberCount: 18,
    projectCount: 6,
    activeInitiatives: 3,
    focusAreas: ['Lifecycle', 'Brand', 'Acquisition'],
    timezone: 'PT · CT overlap',
    lastSync: 'Synced 10 minutes ago',
    accentColor: '#f97316',
    allowedRoles: ['owner', 'admin']
  },
  {
    id: 'engineering',
    orgId: 'acme',
    name: 'Engineering',
    summary: 'Core product development across web, mobile, and platform.',
    leader: {
      name: 'Alex Chen',
      title: 'VP Engineering',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    memberCount: 26,
    projectCount: 9,
    activeInitiatives: 5,
    focusAreas: ['Frontend', 'Platform', 'DevOps'],
    timezone: 'Global coverage',
    lastSync: 'Synced 2 minutes ago',
    accentColor: '#2563eb',
    allowedRoles: ['owner', 'admin']
  },
  {
    id: 'design',
    orgId: 'acme',
    name: 'Design',
    summary: 'Product design, research, and brand systems.',
    leader: {
      name: 'Olivia Smith',
      title: 'Head of Design',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia'
    },
    memberCount: 12,
    projectCount: 4,
    activeInitiatives: 2,
    focusAreas: ['Product', 'Brand', 'UX Research'],
    timezone: 'ET · CET overlap',
    lastSync: 'Synced yesterday',
    accentColor: '#8b5cf6',
    allowedRoles: ['owner', 'admin', 'member']
  },
  {
    id: 'product',
    orgId: 'yourever',
    name: 'Product',
    summary: 'Product strategy, roadmap planning, and cross-team alignment.',
    leader: {
      name: 'Rafael Ortega',
      title: 'Director of Product',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael'
    },
    memberCount: 14,
    projectCount: 7,
    activeInitiatives: 4,
    focusAreas: ['Roadmap', 'Experiments', 'Insights'],
    timezone: 'Remote-first',
    lastSync: 'Synced 5 minutes ago',
    accentColor: '#7c3aed',
    allowedRoles: ['owner', 'admin']
  },
  {
    id: 'research',
    orgId: 'yourever',
    name: 'Research',
    summary: 'AI research, prototyping, and knowledge sharing.',
    leader: {
      name: 'Priya Natarajan',
      title: 'Head of Research',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya'
    },
    memberCount: 11,
    projectCount: 5,
    activeInitiatives: 3,
    focusAreas: ['AI Systems', 'User Studies', 'Labs'],
    timezone: 'Global coverage',
    lastSync: 'Synced 30 minutes ago',
    accentColor: '#22c55e',
    allowedRoles: ['owner', 'admin', 'member']
  }
]

export const getDivisionOverview = (orgId: string, divisionId: string): DivisionOverview | undefined =>
  divisionOverviews.find((division) => division.orgId === orgId && division.id === divisionId)

export const fetchDivisionOverviews = async (
  orgId: string,
  divisionIds: string[],
  latencyMs = 320
): Promise<DivisionOverview[]> => {
  const uniqueIds = Array.from(new Set(divisionIds))
  await new Promise((resolve) => setTimeout(resolve, latencyMs))
  return uniqueIds
    .map((divisionId) => getDivisionOverview(orgId, divisionId))
    .filter((division): division is DivisionOverview => Boolean(division))
}
