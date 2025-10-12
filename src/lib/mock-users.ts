import type { WorkspaceDivision, WorkspaceOrganization, WorkspaceUser } from '@/modules/auth/types'

export type OrganizationDivision = WorkspaceDivision
export type Organization = WorkspaceOrganization
export type MockUser = WorkspaceUser

export const mockUsers: MockUser[] = [
  {
    id: 'user_1',
    email: 'dev@yourever.com',
    firstName: 'Dev',
    lastName: 'User',
    fullName: 'Dev User',
    displayName: 'Dev User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
    role: 'owner',
    organizations: [
      {
        id: 'acme',
        name: 'Acme Corp',
        slug: 'acme',
        description: 'Mock organization for development',
        divisions: [
          { id: 'marketing', name: 'Marketing', orgId: 'acme' },
          { id: 'engineering', name: 'Engineering', orgId: 'acme' },
          { id: 'design', name: 'Design', orgId: 'acme' }
        ],
        userRole: 'owner'
      },
      {
        id: 'yourever',
        name: 'Yourever Labs',
        slug: 'yourever',
        description: 'Mock organization for internal testing',
        divisions: [
          { id: 'product', name: 'Product', orgId: 'yourever' },
          { id: 'research', name: 'Research', orgId: 'yourever' }
        ],
        userRole: 'admin'
      }
    ],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'user_2',
    email: 'member@yourever.com',
    firstName: 'Team',
    lastName: 'Member',
    fullName: 'Team Member',
    displayName: 'Team Member',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
    role: 'member',
    organizations: [
      {
        id: 'yourever',
        name: 'Yourever Labs',
        slug: 'yourever',
        description: 'Mock organization for internal testing',
        divisions: [
          { id: 'product', name: 'Product', orgId: 'yourever' },
          { id: 'research', name: 'Research', orgId: 'yourever' }
        ],
        userRole: 'member'
      }
    ],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  }
]

export const getDevUser = (): MockUser => {
  if (typeof window !== 'undefined') {
    const storedUserId = localStorage.getItem('mock_auth_user_id')
    if (storedUserId) {
      const user = mockUsers.find((candidate) => candidate.id === storedUserId)
      if (user) {
        return user
      }
    }
  }

  return mockUsers[0]
}
