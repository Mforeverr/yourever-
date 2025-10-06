export interface ExplorerItem {
  id: string
  name: string
  type: 'folder' | 'file' | 'project' | 'task' | 'user' | 'document'
  parentId?: string
  path: string
  metadata: Record<string, any>
  children?: ExplorerItem[]
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  name: string
  avatar?: string
  status?: 'online' | 'away' | 'offline'
}

export interface ExplorerViewMode {
  id: string
  name: string
  icon: string
  description: string
}

export interface ExplorerState {
  selectedItem: ExplorerItem | null
  expandedItems: Set<string>
  viewMode: string
  searchTerm: string
  filterType: string
}

// Mock users
export const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', avatar: '', status: 'online' },
  { id: '2', name: 'Bob Wilson', avatar: '', status: 'online' },
  { id: '3', name: 'Charlie Brown', avatar: '', status: 'away' },
  { id: '4', name: 'Diana Prince', avatar: '', status: 'offline' },
  { id: '5', name: 'Eve Davis', avatar: '', status: 'online' },
  { id: '6', name: 'Frank Miller', avatar: '', status: 'online' },
  { id: '7', name: 'Grace Lee', avatar: '', status: 'away' },
  { id: '8', name: 'Henry Ford', avatar: '', status: 'offline' },
  { id: '9', name: 'Ivan Petrov', avatar: '', status: 'online' },
  { id: '10', name: 'Julia Roberts', avatar: '', status: 'online' },
  { id: '11', name: 'Kevin Chen', avatar: '', status: 'away' },
  { id: '12', name: 'Laura Smith', avatar: '', status: 'online' },
  { id: '13', name: 'Mike Johnson', avatar: '', status: 'online' },
  { id: '14', name: 'Nancy White', avatar: '', status: 'offline' },
  { id: '15', name: 'Oliver Taylor', avatar: '', status: 'online' }
]

// Mock hierarchical data
export const mockExplorerData: ExplorerItem[] = [
  {
    id: '1',
    name: 'Engineering',
    type: 'folder',
    path: '/engineering',
    metadata: { department: 'Engineering', head: 'John Doe', memberCount: 25 },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    children: [
      {
        id: '1-1',
        name: 'Frontend Team',
        type: 'folder',
        parentId: '1',
        path: '/engineering/frontend',
        metadata: { team: 'Frontend', lead: 'Jane Smith', memberCount: 8 },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-03-08'),
        children: [
          {
            id: '1-1-1',
            name: 'Website Redesign',
            type: 'project',
            parentId: '1-1',
            path: '/engineering/frontend/website-redesign',
            metadata: { 
              status: 'in-progress', 
              priority: 'high', 
              progress: 65,
              dueDate: '2024-04-15',
              assigneeIds: ['1', '2']
            },
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-03-12')
          },
          {
            id: '1-1-2',
            name: 'Mobile App',
            type: 'project',
            parentId: '1-1',
            path: '/engineering/frontend/mobile-app',
            metadata: { 
              status: 'planning', 
              priority: 'medium', 
              progress: 20,
              dueDate: '2024-06-01',
              assigneeIds: ['3', '4']
            },
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-10')
          },
          {
            id: '1-1-3',
            name: 'Component Library',
            type: 'project',
            parentId: '1-1',
            path: '/engineering/frontend/component-library',
            metadata: { 
              status: 'completed', 
              priority: 'low', 
              progress: 100,
              dueDate: '2024-02-28',
              assigneeIds: ['5', '6']
            },
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-02-28')
          }
        ]
      },
      {
        id: '1-2',
        name: 'Backend Team',
        type: 'folder',
        parentId: '1',
        path: '/engineering/backend',
        metadata: { team: 'Backend', lead: 'Mike Johnson', memberCount: 10 },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-03-09'),
        children: [
          {
            id: '1-2-1',
            name: 'API Development',
            type: 'project',
            parentId: '1-2',
            path: '/engineering/backend/api-development',
            metadata: { 
              status: 'in-progress', 
              priority: 'high', 
              progress: 80,
              dueDate: '2024-03-30',
              assigneeIds: ['7', '8']
            },
            createdAt: new Date('2024-01-25'),
            updatedAt: new Date('2024-03-11')
          },
          {
            id: '1-2-2',
            name: 'Database Migration',
            type: 'project',
            parentId: '1-2',
            path: '/engineering/backend/database-migration',
            metadata: { 
              status: 'in-review', 
              priority: 'high', 
              progress: 90,
              dueDate: '2024-03-25',
              assigneeIds: ['9', '10']
            },
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-03-15')
          }
        ]
      },
      {
        id: '1-3',
        name: 'DevOps Team',
        type: 'folder',
        parentId: '1',
        path: '/engineering/devops',
        metadata: { team: 'DevOps', lead: 'Sarah Wilson', memberCount: 7 },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-03-09'),
        children: [
          {
            id: '1-3-1',
            name: 'CI/CD Pipeline',
            type: 'project',
            parentId: '1-3',
            path: '/engineering/devops/cicd-pipeline',
            metadata: { 
              status: 'in-progress', 
              priority: 'medium', 
              progress: 75,
              dueDate: '2024-04-01',
              assigneeIds: ['11', '12']
            },
            createdAt: new Date('2024-02-10'),
            updatedAt: new Date('2024-03-12')
          }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Product',
    type: 'folder',
    path: '/product',
    metadata: { department: 'Product', head: 'Sarah Wilson', memberCount: 12 },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    children: [
      {
        id: '2-1',
        name: 'Q2 Features',
        type: 'folder',
        parentId: '2',
        path: '/product/q2-features',
        metadata: { quarter: 'Q2 2024', status: 'active' },
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-03-10'),
        children: [
          {
            id: '2-1-1',
            name: 'User Dashboard',
            type: 'task',
            parentId: '2-1',
            path: '/product/q2-features/user-dashboard',
            metadata: { 
              status: 'in-review', 
              priority: 'high', 
              storyPoints: 8,
              assigneeId: '13'
            },
            createdAt: new Date('2024-02-10'),
            updatedAt: new Date('2024-03-12')
          },
          {
            id: '2-1-2',
            name: 'Analytics Integration',
            type: 'task',
            parentId: '2-1',
            path: '/product/q2-features/analytics-integration',
            metadata: { 
              status: 'todo', 
              priority: 'medium', 
              storyPoints: 5,
              assigneeId: '14'
            },
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-08')
          },
          {
            id: '2-1-3',
            name: 'Reporting Module',
            type: 'task',
            parentId: '2-1',
            path: '/product/q2-features/reporting-module',
            metadata: { 
              status: 'in-progress', 
              priority: 'low', 
              storyPoints: 3,
              assigneeId: '15'
            },
            createdAt: new Date('2024-02-20'),
            updatedAt: new Date('2024-03-11')
          }
        ]
      },
      {
        id: '2-2',
        name: 'Q3 Planning',
        type: 'folder',
        parentId: '2',
        path: '/product/q3-planning',
        metadata: { quarter: 'Q3 2024', status: 'planning' },
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-03-10'),
        children: [
          {
            id: '2-2-1',
            name: 'Feature Research',
            type: 'task',
            parentId: '2-2',
            path: '/product/q3-planning/feature-research',
            metadata: { 
              status: 'todo', 
              priority: 'medium', 
              storyPoints: 5,
              assigneeId: '1'
            },
            createdAt: new Date('2024-03-05'),
            updatedAt: new Date('2024-03-10')
          }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Design',
    type: 'folder',
    path: '/design',
    metadata: { department: 'Design', head: 'Emily Chen', memberCount: 8 },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    children: [
      {
        id: '3-1',
        name: 'UI Components',
        type: 'folder',
        parentId: '3',
        path: '/design/ui-components',
        metadata: { type: 'design-system', status: 'active' },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-03-08'),
        children: [
          {
            id: '3-1-1',
            name: 'Button Variants',
            type: 'document',
            parentId: '3-1',
            path: '/design/ui-components/button-variants',
            metadata: { 
              fileType: 'figma', 
              size: '15.2 MB', 
              version: '3.2',
              authorId: '2'
            },
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-03-05')
          },
          {
            id: '3-1-2',
            name: 'Color System',
            type: 'document',
            parentId: '3-1',
            path: '/design/ui-components/color-system',
            metadata: { 
              fileType: 'pdf', 
              size: '8.4 MB', 
              version: '2.1',
              authorId: '3'
            },
            createdAt: new Date('2024-02-10'),
            updatedAt: new Date('2024-03-01')
          }
        ]
      },
      {
        id: '3-2',
        name: 'Brand Assets',
        type: 'folder',
        parentId: '3',
        path: '/design/brand-assets',
        metadata: { type: 'brand', status: 'active' },
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-03-10'),
        children: [
          {
            id: '3-2-1',
            name: 'Logo Variations',
            type: 'document',
            parentId: '3-2',
            path: '/design/brand-assets/logo-variations',
            metadata: { 
              fileType: 'svg', 
              size: '2.1 MB', 
              version: '1.5',
              authorId: '4'
            },
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-10')
          }
        ]
      }
    ]
  },
  {
    id: '4',
    name: 'Documents',
    type: 'folder',
    path: '/documents',
    metadata: { type: 'repository', count: 156 },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-03-12'),
    children: [
      {
        id: '4-1',
        name: 'Specifications',
        type: 'folder',
        parentId: '4',
        path: '/documents/specifications',
        metadata: { type: 'folder', count: 23 },
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-03-05'),
        children: [
          {
            id: '4-1-1',
            name: 'API Spec v2.0',
            type: 'document',
            parentId: '4-1',
            path: '/documents/specifications/api-spec-v2',
            metadata: { 
              fileType: 'pdf', 
              size: '2.4 MB', 
              version: '2.0',
              authorId: '5'
            },
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date('2024-03-01')
          },
          {
            id: '4-1-2',
            name: 'Database Schema',
            type: 'document',
            parentId: '4-1',
            path: '/documents/specifications/database-schema',
            metadata: { 
              fileType: 'sql', 
              size: '156 KB', 
              version: '1.3',
              authorId: '6'
            },
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-10')
          }
        ]
      },
      {
        id: '4-2',
        name: 'Meeting Notes',
        type: 'folder',
        parentId: '4',
        path: '/documents/meeting-notes',
        metadata: { type: 'folder', count: 45 },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-03-12'),
        children: [
          {
            id: '4-2-1',
            name: 'Sprint Planning - March',
            type: 'document',
            parentId: '4-2',
            path: '/documents/meeting-notes/sprint-planning-march',
            metadata: { 
              fileType: 'docx', 
              size: '1.2 MB', 
              version: '1.0',
              authorId: '7'
            },
            createdAt: new Date('2024-03-01'),
            updatedAt: new Date('2024-03-12')
          }
        ]
      }
    ]
  },
  {
    id: '5',
    name: 'Marketing',
    type: 'folder',
    path: '/marketing',
    metadata: { department: 'Marketing', head: 'David Kim', memberCount: 15 },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-10'),
    children: [
      {
        id: '5-1',
        name: 'Campaigns',
        type: 'folder',
        parentId: '5',
        path: '/marketing/campaigns',
        metadata: { type: 'campaigns', count: 8 },
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-03-10'),
        children: [
          {
            id: '5-1-1',
            name: 'Spring Launch',
            type: 'project',
            parentId: '5-1',
            path: '/marketing/campaigns/spring-launch',
            metadata: { 
              status: 'in-progress', 
              priority: 'high', 
              progress: 45,
              dueDate: '2024-04-01',
              assigneeIds: ['8', '9', '10']
            },
            createdAt: new Date('2024-02-15'),
            updatedAt: new Date('2024-03-10')
          }
        ]
      }
    ]
  }
]

export const viewModes: ExplorerViewMode[] = [
  { id: 'tree', name: 'Tree View', icon: 'TreePine', description: 'Hierarchical tree structure' },
  { id: 'grid', name: 'Grid View', icon: 'Grid3X3', description: 'Card-based grid layout' },
  { id: 'list', name: 'List View', icon: 'List', description: 'Compact list with details' }
]

export const filterOptions = [
  { id: 'all', name: 'All Items', icon: 'Layers' },
  { id: 'folder', name: 'Folders', icon: 'Folder' },
  { id: 'project', name: 'Projects', icon: 'FolderKanban' },
  { id: 'task', name: 'Tasks', icon: 'CheckSquare' },
  { id: 'document', name: 'Documents', icon: 'FileText' }
]

// Helper functions
export function getUserById(id: string): User | undefined {
  return mockUsers.find(user => user.id === id)
}

export function getUsersByIds(ids: string[]): User[] {
  return ids.map(id => getUserById(id)).filter(Boolean) as User[]
}