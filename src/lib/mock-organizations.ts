export interface OrganizationOverview {
  id: string
  name: string
  tagline: string
  industry: string
  location: string
  timezone: string
  memberCount: number
  activeProjects: number
  divisionCount: number
  lastActive: string
  tags: string[]
  accentColor: string
  logoUrl?: string
}

export const mockOrganizationOverviews: Record<string, OrganizationOverview> = {
  acme: {
    id: 'acme',
    name: 'Acme Corp',
    tagline: 'Building imaginative products for imaginative people',
    industry: 'Product Design',
    location: 'San Francisco, USA',
    timezone: 'PST (UTC-8)',
    memberCount: 58,
    activeProjects: 14,
    divisionCount: 3,
    lastActive: 'Active 12 minutes ago',
    tags: ['Product Ops', 'Engineering', 'North America'],
    accentColor: '#2563eb',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Acme'
  },
  yourever: {
    id: 'yourever',
    name: 'Yourever Labs',
    tagline: 'Co-pilot tooling for distributed teams',
    industry: 'AI Research',
    location: 'Remote First',
    timezone: 'Multiple timezones',
    memberCount: 32,
    activeProjects: 9,
    divisionCount: 2,
    lastActive: 'Active 2 minutes ago',
    tags: ['AI', 'Product', 'Research Guild'],
    accentColor: '#7c3aed',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Yourever'
  },
  apex: {
    id: 'apex',
    name: 'Apex Services',
    tagline: 'Premium consulting for growth-stage companies',
    industry: 'Consulting',
    location: 'Austin, USA',
    timezone: 'CST (UTC-6)',
    memberCount: 85,
    activeProjects: 21,
    divisionCount: 4,
    lastActive: 'Active 1 hour ago',
    tags: ['Client Services', 'Operations'],
    accentColor: '#f97316',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Apex'
  },
  lumen: {
    id: 'lumen',
    name: 'Lumen Studios',
    tagline: 'Creative studio for immersive brand experiences',
    industry: 'Creative Agency',
    location: 'Berlin, Germany',
    timezone: 'CET (UTC+1)',
    memberCount: 26,
    activeProjects: 7,
    divisionCount: 3,
    lastActive: 'Active yesterday',
    tags: ['Brand', 'Experience', 'EU'],
    accentColor: '#22c55e',
    logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Lumen'
  }
}

export const getOrganizationOverview = (organizationId: string): OrganizationOverview | undefined =>
  mockOrganizationOverviews[organizationId]

export const fetchOrganizationOverviews = async (
  organizationIds: string[],
  latencyMs = 350
): Promise<OrganizationOverview[]> => {
  const uniqueIds = Array.from(new Set(organizationIds))
  await new Promise((resolve) => setTimeout(resolve, latencyMs))
  return uniqueIds
    .map((id) => getOrganizationOverview(id))
    .filter((overview): overview is OrganizationOverview => Boolean(overview))
}
