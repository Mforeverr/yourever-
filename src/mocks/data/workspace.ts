import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { WorkspaceProject } from '@/modules/workspace/types'

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

const storage = createJSONStorage<MockWorkspaceState>(() =>
  typeof window === 'undefined' ? noopStorage() : window.localStorage
)

export type DivisionKey = 'marketing' | 'engineering' | 'design' | 'product' | 'research'
export type DivisionScope = DivisionKey | 'all'
export type OrgScope = Array<string> | 'all'

export interface MockWorkspaceProject extends WorkspaceProject {
  // Additional mock-specific fields for filtering
  orgIds: OrgScope
  divisions: DivisionScope[]
  taskCount?: number
  memberCount?: number
}

export interface MockWorkspaceTask {
  id: string
  orgId: string
  divisionId: string | null
  projectId: string | null
  name: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  badgeVariant: 'secondary' | 'destructive'
  dotColor: string
  isTemplate: boolean
  updatedAt: string
  // Additional mock-specific fields for filtering
  orgIds: OrgScope
  divisions: DivisionScope[]
  taskCount?: number
  memberCount?: number
}

export interface MockWorkspaceDoc {
  id: string
  orgId: string
  divisionId: string | null
  name: string
  url?: string | null
  summary?: string | null
  isTemplate: boolean
  updatedAt: string
  // Additional mock-specific fields for filtering
  orgIds: OrgScope
  divisions: DivisionScope[]
  taskCount?: number
  memberCount?: number
}

interface MockWorkspaceState {
  projects: Record<string, MockWorkspaceProject>
  tasks: Record<string, MockWorkspaceTask>
  docs: Record<string, MockWorkspaceDoc>
  version: number
}

interface MockWorkspaceActions {
  reset: () => void
  upsertProject: (project: MockWorkspaceProject) => void
  removeProject: (projectId: string) => void
  upsertTask: (task: MockWorkspaceTask) => void
  removeTask: (taskId: string) => void
  upsertDoc: (doc: MockWorkspaceDoc) => void
  removeDoc: (docId: string) => void
}

export type MockWorkspaceStore = MockWorkspaceState & MockWorkspaceActions

const matchesDivision = (divisions: DivisionScope[], divisionId?: string | null) => {
  if (divisions.includes('all')) return true
  if (!divisionId) return false
  return divisions.includes(divisionId as DivisionScope)
}

const matchesOrg = (orgIds: OrgScope, orgId?: string | null) => {
  if (orgIds === 'all') return true
  if (!orgId) return false
  return orgIds.includes(orgId)
}

const toArray = <T>(record: Record<string, T>) => Object.values(record)

const seedProjects = (): Record<string, MockWorkspaceProject> => {
  const data: MockWorkspaceProject[] = [
    {
      id: 'website-revamp',
      name: 'Website Revamp',
      badgeCount: 12,
      dotColor: 'bg-blue-500',
      orgIds: 'all',
      divisions: ['marketing', 'design'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'marketing',
      description: 'Revamp the company website with modern design',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 12,
      memberCount: 4
    },
    {
      id: 'platform-infra',
      name: 'Platform Infrastructure',
      badgeCount: 9,
      dotColor: 'bg-orange-500',
      orgIds: 'all',
      divisions: ['engineering'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'engineering',
      description: 'Upgrade platform infrastructure for better performance',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    },
    {
      id: 'growth-experiments',
      name: 'Growth Experiments',
      badgeCount: 7,
      dotColor: 'bg-pink-500',
      orgIds: 'all',
      divisions: ['marketing', 'product'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'marketing',
      description: 'Run growth experiments to improve user acquisition',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    },
    {
      id: 'design-system',
      name: 'Design System Refresh',
      badgeCount: 11,
      dotColor: 'bg-teal-500',
      orgIds: 'all',
      divisions: ['design', 'engineering'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'design',
      description: 'Refresh the design system with new components',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    },
    {
      id: 'research-labs',
      name: 'Research Lab Setup',
      badgeCount: 4,
      dotColor: 'bg-emerald-500',
      orgIds: 'all',
      divisions: ['research'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'research',
      description: 'Set up research lab for user testing',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    },
    {
      id: 'product-roadmap',
      name: '2025 Product Roadmap',
      badgeCount: 6,
      dotColor: 'bg-indigo-500',
      orgIds: 'all',
      divisions: ['product'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: 'product',
      description: 'Define and execute 2025 product roadmap',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    },
    {
      id: 'company-allhands',
      name: 'Company All-Hands',
      badgeCount: 3,
      dotColor: 'bg-gray-500',
      orgIds: 'all',
      divisions: ['all'],
      // WorkspaceProject required fields
      orgId: 'mock-org-id',
      divisionId: null,
      description: 'Company all-hands meeting planning',
      status: 'active',
      defaultView: 'board',
      isTemplate: false,
      updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4
    }
  ]
  return Object.fromEntries(data.map((project) => [project.id, project]))
}

const seedTasks = (): Record<string, MockWorkspaceTask> => {
  const data: MockWorkspaceTask[] = [
    { id: 'task-auth', orgId: 'mock-org-id', divisionId: 'engineering', projectId: null, name: 'Ship mock authentication', priority: 'High', badgeVariant: 'secondary', dotColor: 'bg-red-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['engineering', 'product'] },
    { id: 'task-campaign', orgId: 'mock-org-id', divisionId: 'marketing', projectId: null, name: 'Launch Q4 campaign', priority: 'Urgent', badgeVariant: 'destructive', dotColor: 'bg-rose-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['marketing'] },
    { id: 'task-ux', orgId: 'mock-org-id', divisionId: 'design', projectId: null, name: 'Polish onboarding flow', priority: 'Medium', badgeVariant: 'secondary', dotColor: 'bg-yellow-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['design', 'product'] },
    { id: 'task-research', orgId: 'mock-org-id', divisionId: 'research', projectId: null, name: 'Publish insights memo', priority: 'Medium', badgeVariant: 'secondary', dotColor: 'bg-emerald-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['research'] },
    { id: 'task-maintenance', orgId: 'mock-org-id', divisionId: 'engineering', projectId: null, name: 'Infrastructure upkeep', priority: 'Low', badgeVariant: 'secondary', dotColor: 'bg-blue-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['engineering'] },
    { id: 'task-allhands', orgId: 'mock-org-id', divisionId: null, projectId: null, name: 'Prep all-hands slides', priority: 'High', badgeVariant: 'secondary', dotColor: 'bg-purple-500', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['all'] }
  ]
  return Object.fromEntries(data.map((task) => [task.id, task]))
}

const seedDocs = (): Record<string, MockWorkspaceDoc> => {
  const data: MockWorkspaceDoc[] = [
    { id: 'brand-guidelines', orgId: 'mock-org-id', divisionId: 'marketing', name: 'Brand Guidelines', url: null, summary: 'Comprehensive brand guidelines and visual identity standards', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['marketing', 'design'] },
    { id: 'api-overview', orgId: 'mock-org-id', divisionId: 'engineering', name: 'API Overview', url: '/docs/api', summary: 'Complete API documentation and integration guides', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['engineering'] },
    { id: 'playbook', orgId: 'mock-org-id', divisionId: 'marketing', name: 'Go-To-Market Playbook', url: null, summary: 'Strategic playbook for product launches and market entry', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['marketing', 'product'] },
    { id: 'design-language', orgId: 'mock-org-id', divisionId: 'design', name: 'Design Language', url: '/docs/design', summary: 'Design system documentation and component library', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['design'] },
    { id: 'lab-notes', orgId: 'mock-org-id', divisionId: 'research', name: 'Research Lab Notes', url: null, summary: 'User research findings and usability test results', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['research'] },
    { id: 'ops-manual', orgId: 'mock-org-id', divisionId: null, name: 'Operations Manual', url: null, summary: 'Company operations and procedures manual', isTemplate: false, updatedAt: new Date().toISOString(),
      taskCount: 13,
      memberCount: 4, orgIds: 'all', divisions: ['all'] }
  ]
  return Object.fromEntries(data.map((doc) => [doc.id, doc]))
}

const createInitialState = (): MockWorkspaceState => ({
  projects: seedProjects(),
  tasks: seedTasks(),
  docs: seedDocs(),
  version: 0
})

export const useMockWorkspaceStore = create<MockWorkspaceStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      reset: () => set(() => createInitialState()),
      upsertProject: (project) =>
        set((state) => ({
          projects: { ...state.projects, [project.id]: project },
          version: state.version + 1
        })),
      removeProject: (projectId) =>
        set((state) => {
          if (!state.projects[projectId]) return {}
          const { [projectId]: _, ...rest } = state.projects
          return { projects: rest, version: state.version + 1 }
        }),
      upsertTask: (task) =>
        set((state) => ({
          tasks: { ...state.tasks, [task.id]: task },
          version: state.version + 1
        })),
      removeTask: (taskId) =>
        set((state) => {
          if (!state.tasks[taskId]) return {}
          const { [taskId]: _, ...rest } = state.tasks
          return { tasks: rest, version: state.version + 1 }
        }),
      upsertDoc: (doc) =>
        set((state) => ({
          docs: { ...state.docs, [doc.id]: doc },
          version: state.version + 1
        })),
      removeDoc: (docId) =>
        set((state) => {
          if (!state.docs[docId]) return {}
          const { [docId]: _, ...rest } = state.docs
          return { docs: rest, version: state.version + 1 }
        })
    }),
    {
      name: 'mock-workspace',
      storage,
      partialize: (state) => ({
        projects: state.projects,
        tasks: state.tasks,
        docs: state.docs,
        version: state.version
      })
    }
  )
)

const scopeSort = (a: string, b: string) => a.localeCompare(b)

const priorityRank: Record<MockWorkspaceTask['priority'], number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3
}

export const filterProjectsByScope = (
  projects: Record<string, MockWorkspaceProject>,
  orgId?: string | null,
  divisionId?: string | null
): MockWorkspaceProject[] =>
  toArray(projects)
    .filter((project) => matchesOrg(project.orgIds, orgId) && matchesDivision(project.divisions, divisionId))
    .sort((a, b) => scopeSort(a.name, b.name))

export const filterTasksByScope = (
  tasks: Record<string, MockWorkspaceTask>,
  orgId?: string | null,
  divisionId?: string | null
): MockWorkspaceTask[] =>
  toArray(tasks)
    .filter((task) => matchesOrg(task.orgIds, orgId) && matchesDivision(task.divisions, divisionId))
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || scopeSort(a.name, b.name))

export const filterDocsByScope = (
  docs: Record<string, MockWorkspaceDoc>,
  orgId?: string | null,
  divisionId?: string | null
): MockWorkspaceDoc[] =>
  toArray(docs)
    .filter((doc) => matchesOrg(doc.orgIds, orgId) && matchesDivision(doc.divisions, divisionId))
    .sort((a, b) => scopeSort(a.name, b.name))

export const countProjectsForDivision = (
  projects: Record<string, MockWorkspaceProject>,
  orgId?: string | null,
  divisionId?: string | null
) => filterProjectsByScope(projects, orgId, divisionId).length
